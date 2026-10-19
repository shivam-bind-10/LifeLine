import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Role } from '../generated/prisma/client.js';
import { createAccessToken } from '../modules/auth/token.js';

const database = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
}));

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: database.userFindUnique,
    },
  },
}));

describe('access-token authentication and role guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_ACCESS_SECRET =
      'test-only-access-secret-with-at-least-32-bytes';
  });

  it('rejects missing and invalid bearer tokens', async () => {
    const { authenticate } = await import('./authenticate.js');
    const app = express();
    app.get('/protected', authenticate, (_request, response) =>
      response.sendStatus(200),
    );

    const missing = await request(app).get('/protected');
    const invalid = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer not-a-valid-token');

    expect(missing.status).toBe(401);
    expect(invalid.status).toBe(401);
    expect(database.userFindUnique).not.toHaveBeenCalled();
  });

  it('rejects a signed token when its user is blocked', async () => {
    const { authenticate } = await import('./authenticate.js');
    const app = express();
    app.get('/protected', authenticate, (_request, response) =>
      response.sendStatus(200),
    );
    database.userFindUnique.mockResolvedValue({
      id: 'blocked-user',
      role: Role.HELPER,
      isBlocked: true,
    });

    const response = await request(app)
      .get('/protected')
      .set(
        'Authorization',
        `Bearer ${createAccessToken({ id: 'blocked-user', role: Role.HELPER })}`,
      );

    expect(response.status).toBe(401);
    expect(response.body.error.message).toContain('account is not available');
  });

  it('uses the current database role for authorization', async () => {
    const { authenticate, requireRoles } = await import('./authenticate.js');
    const app = express();
    app.get(
      '/admin',
      authenticate,
      requireRoles(Role.ADMIN),
      (_request, response) => response.sendStatus(200),
    );
    database.userFindUnique.mockResolvedValue({
      id: 'role-changed-user',
      role: Role.HELPER,
      isBlocked: false,
    });

    const response = await request(app)
      .get('/admin')
      .set(
        'Authorization',
        `Bearer ${createAccessToken({ id: 'role-changed-user', role: Role.ADMIN })}`,
      );

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('allows a currently authorized role', async () => {
    const { authenticate, requireRoles } = await import('./authenticate.js');
    const app = express();
    app.get(
      '/admin',
      authenticate,
      requireRoles(Role.ADMIN),
      (_request, response) => response.sendStatus(200),
    );
    database.userFindUnique.mockResolvedValue({
      id: 'admin-user',
      role: Role.ADMIN,
      isBlocked: false,
    });

    const response = await request(app)
      .get('/admin')
      .set(
        'Authorization',
        `Bearer ${createAccessToken({ id: 'admin-user', role: Role.ADMIN })}`,
      );

    expect(response.status).toBe(200);
  });
});
