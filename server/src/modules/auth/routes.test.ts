import { hash, compare } from 'bcryptjs';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Role } from '../../generated/prisma/client.js';
import { createApp } from '../../app.js';
import { prisma } from '../../lib/prisma.js';
import { createAccessToken } from './token.js';

const database = vi.hoisted(() => ({
  userCreate: vi.fn(),
  userFindUnique: vi.fn(),
  userUpdate: vi.fn(),
  refreshCreate: vi.fn(),
  refreshFindUnique: vi.fn(),
  refreshUpdateMany: vi.fn(),
  resetCreate: vi.fn(),
  resetFindUnique: vi.fn(),
  resetUpdateMany: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    user: {
      create: database.userCreate,
      findUnique: database.userFindUnique,
      update: database.userUpdate,
    },
    refreshToken: {
      create: database.refreshCreate,
      findUnique: database.refreshFindUnique,
      updateMany: database.refreshUpdateMany,
    },
    passwordResetToken: {
      create: database.resetCreate,
      findUnique: database.resetFindUnique,
      updateMany: database.resetUpdateMany,
    },
    $transaction: database.transaction,
  },
}));

const createdAt = new Date('2026-01-01T00:00:00.000Z');

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    name: 'Asha Helper',
    email: 'asha@example.com',
    phone: null,
    role: 'HELPER' as Role,
    isHelper: true,
    language: 'en',
    isBlocked: false,
    passwordHash: '$2b$12$mocked-password-hash',
    createdAt,
    ...overrides,
  };
}

function makePublicUser(user = makeUser()) {
  const {
    id,
    name,
    email,
    phone,
    role,
    isHelper,
    language,
    createdAt: created,
  } = user;
  return {
    id,
    name,
    email,
    phone,
    role,
    isHelper,
    language,
    createdAt: (created as Date).toISOString(),
  };
}

describe('authentication routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_ACCESS_SECRET =
      'test-only-access-secret-with-at-least-32-bytes';
    process.env.NODE_ENV = 'test';
    database.transaction.mockImplementation(async (operation) => {
      if (typeof operation === 'function') {
        return operation(prisma);
      }
      return Promise.all(operation);
    });
  });

  it('rejects invalid registration input before accessing the database', async () => {
    const response = await request(createApp())
      .post('/api/v1/auth/register')
      .send({
        name: '',
        email: 'not-an-email',
        password: 'short',
        role: 'ADMIN',
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(database.userCreate).not.toHaveBeenCalled();
  });

  it('registers a user with a bcrypt password and an httpOnly refresh cookie', async () => {
    const user = makeUser({
      email: 'asha@example.com',
      passwordHash: undefined,
    });
    database.userCreate.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...makePublicUser(user),
        passwordHash: data.passwordHash,
      }),
    );
    const response = await request(createApp())
      .post('/api/v1/auth/register')
      .send({
        name: ' Asha Helper ',
        email: 'ASHA@EXAMPLE.COM',
        password: 'a-unique-long-password',
        role: 'HELPER',
      });

    expect(response.status).toBe(201);
    expect(response.body.user).toEqual(makePublicUser(user));
    expect(response.body).not.toHaveProperty('user.passwordHash');
    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.body.expiresIn).toBe(900);
    expect(response.headers['set-cookie'][0]).toContain('HttpOnly');
    expect(response.headers['set-cookie'][0]).toContain('Path=/api/v1/auth');
    const savedPasswordHash = database.userCreate.mock.calls[0]?.[0].data
      .passwordHash as string;
    expect(savedPasswordHash).not.toBe('a-unique-long-password');
    expect(await compare('a-unique-long-password', savedPasswordHash)).toBe(
      true,
    );
    expect(database.refreshCreate).toHaveBeenCalledOnce();
  });

  it('rejects invalid credentials without revealing whether the email exists', async () => {
    database.userFindUnique.mockResolvedValue(null);
    const response = await request(createApp())
      .post('/api/v1/auth/login')
      .send({
        email: 'missing@example.com',
        password: 'a-unique-long-password',
      });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    expect(response.headers['set-cookie']).toBeUndefined();
  });

  it('authenticates a user and returns a short-lived access token', async () => {
    const user = makeUser({
      passwordHash: await hash('a-unique-long-password', 4),
    });
    database.userFindUnique.mockResolvedValue(user);

    const response = await request(createApp())
      .post('/api/v1/auth/login')
      .send({
        email: 'ASHA@example.com',
        password: 'a-unique-long-password',
      });

    expect(response.status).toBe(200);
    expect(response.body.user).toEqual(makePublicUser(user));
    expect(response.body.user).not.toHaveProperty('passwordHash');
    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.headers['set-cookie'][0]).toContain('HttpOnly');
    expect(database.refreshCreate).toHaveBeenCalledOnce();
  });

  it('requires a bearer token for the profile and returns no password hash', async () => {
    const app = createApp();
    const unauthorized = await request(app).get('/api/v1/me');
    expect(unauthorized.status).toBe(401);

    database.userFindUnique.mockResolvedValue(makeUser());
    const token = createAccessToken({ id: 'user-1', role: 'HELPER' as Role });
    const response = await request(app)
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.user).toEqual(makePublicUser());
    expect(response.body.user).not.toHaveProperty('passwordHash');
    expect(database.userFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'user-1' } }),
    );
  });

  it('rotates refresh cookies and rejects reuse of a revoked token', async () => {
    const user = makeUser();
    database.refreshFindUnique.mockResolvedValue({
      id: 'refresh-1',
      userId: user.id,
      user,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    database.refreshUpdateMany.mockResolvedValue({ count: 1 });
    const first = await request(createApp())
      .post('/api/v1/auth/refresh')
      .set('Cookie', 'lifeline_refresh=old-refresh-token');

    expect(first.status).toBe(200);
    expect(first.body.accessToken).toEqual(expect.any(String));
    expect(first.headers['set-cookie'][0]).toContain('HttpOnly');
    expect(database.refreshCreate).toHaveBeenCalledOnce();

    database.refreshUpdateMany.mockResolvedValue({ count: 0 });
    const reused = await request(createApp())
      .post('/api/v1/auth/refresh')
      .set('Cookie', 'lifeline_refresh=old-refresh-token');
    expect(reused.status).toBe(401);
    expect(reused.body.error.code).toBe('UNAUTHORIZED');
  });

  it('logs a one-time development reset token rather than emailing in production', async () => {
    process.env.NODE_ENV = 'development';
    database.userFindUnique.mockResolvedValue({ id: 'user-1' });
    database.resetUpdateMany.mockResolvedValue({ count: 0 });
    database.resetCreate.mockResolvedValue({});
    const log = vi.spyOn(console, 'info').mockImplementation(() => {});

    const response = await request(createApp())
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'ASHA@example.com' });

    expect(response.status).toBe(200);
    expect(response.body.message).toContain('If an account exists');
    expect(log).toHaveBeenCalledWith(
      'LifeLine development password reset token',
      expect.objectContaining({
        email: 'asha@example.com',
        token: expect.any(String),
      }),
    );
    expect(database.resetCreate).toHaveBeenCalledOnce();
  });

  it('returns an explicit service error when production email delivery is not configured', async () => {
    process.env.NODE_ENV = 'production';
    const response = await request(createApp())
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'asha@example.com' });

    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe('PASSWORD_RESET_UNAVAILABLE');
    expect(database.userFindUnique).not.toHaveBeenCalled();
  });

  it('logs out and clears a refresh cookie', async () => {
    database.refreshUpdateMany.mockResolvedValue({ count: 1 });
    const response = await request(createApp())
      .post('/api/v1/auth/logout')
      .set('Cookie', 'lifeline_refresh=old-refresh-token');

    expect(response.status).toBe(204);
    expect(response.headers['set-cookie'][0]).toContain(
      'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    );
    expect(database.refreshUpdateMany).toHaveBeenCalledOnce();
  });

  it('consumes a password-reset token, updates the password, and revokes sessions', async () => {
    database.resetFindUnique.mockResolvedValue({
      userId: 'user-1',
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    database.resetUpdateMany.mockResolvedValue({ count: 1 });
    database.userUpdate.mockResolvedValue({});
    database.refreshUpdateMany.mockResolvedValue({ count: 2 });

    const response = await request(createApp())
      .post('/api/v1/auth/reset-password')
      .send({
        token: 'one-time-reset-token-with-enough-length',
        password: 'a-new-long-password',
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toContain('Password updated');
    expect(database.resetUpdateMany).toHaveBeenCalledOnce();
    expect(database.userUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: { passwordHash: expect.any(String) },
      }),
    );
    expect(database.refreshUpdateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it('rejects an expired or previously used password-reset token', async () => {
    database.resetFindUnique.mockResolvedValue(null);
    const response = await request(createApp())
      .post('/api/v1/auth/reset-password')
      .send({
        token: 'one-time-reset-token-with-enough-length',
        password: 'a-new-long-password',
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_RESET_TOKEN');
    expect(database.resetUpdateMany).not.toHaveBeenCalled();
    expect(database.userUpdate).not.toHaveBeenCalled();
  });

  it('rejects fields that are not editable in the profile', async () => {
    const token = createAccessToken({ id: 'user-1', role: 'HELPER' as Role });
    database.userFindUnique.mockResolvedValue(makeUser());

    const response = await request(createApp())
      .patch('/api/v1/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Asha K.', language: 'hi', role: 'ADMIN' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(database.userUpdate).not.toHaveBeenCalled();
  });

  it('updates allowed profile fields for an authenticated user', async () => {
    const token = createAccessToken({ id: 'user-1', role: 'HELPER' as Role });
    const updatedUser = makeUser({ name: 'Asha K.', language: 'hi' });
    database.userFindUnique.mockResolvedValue(makeUser());
    database.userUpdate.mockResolvedValue(makePublicUser(updatedUser));

    const response = await request(createApp())
      .patch('/api/v1/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Asha K.', language: 'hi' });

    expect(response.status).toBe(200);
    expect(response.body.user.name).toBe('Asha K.');
    expect(response.body.user.language).toBe('hi');
    expect(database.userUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: { name: 'Asha K.', language: 'hi' },
      }),
    );
  });
});
