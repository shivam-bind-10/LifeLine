import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  Role,
  type Category,
  type Urgency,
} from '../../generated/prisma/client.js';
import { createApp } from '../../app.js';
import { createAccessToken } from '../auth/token.js';

const database = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  requestFindMany: vi.fn(),
  requestCreate: vi.fn(),
}));

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    user: { findUnique: database.userFindUnique },
    request: {
      findMany: database.requestFindMany,
      create: database.requestCreate,
    },
  },
}));

const createdAt = new Date('2026-10-20T00:00:00.000Z');
const neededBy = new Date(Date.now() + 24 * 60 * 60 * 1000);

function accessToken(role: Role = Role.REQUESTER) {
  return createAccessToken({ id: 'user-1', role });
}

describe('request routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_ACCESS_SECRET =
      'test-only-access-secret-with-at-least-32-bytes';
    database.userFindUnique.mockResolvedValue({
      id: 'user-1',
      role: Role.REQUESTER,
      isBlocked: false,
    });
  });

  it('lists only open requests and rounds public coordinates', async () => {
    database.requestFindMany.mockResolvedValue([
      {
        id: 'request-1',
        category: 'BLOOD' as Category,
        urgency: 'CRITICAL' as Urgency,
        title: 'O positive blood needed',
        lat: 12.971598,
        lng: 77.594566,
        neededBy,
        createdAt,
      },
    ]);

    const response = await request(createApp()).get(
      '/api/v1/requests?category=BLOOD&limit=10',
    );

    expect(response.status).toBe(200);
    expect(response.body.requests[0]).toEqual({
      id: 'request-1',
      category: 'BLOOD',
      urgency: 'CRITICAL',
      title: 'O positive blood needed',
      lat: 12.97,
      lng: 77.59,
      neededBy: neededBy.toISOString(),
      createdAt: createdAt.toISOString(),
    });
    expect(response.body.nextCursor).toBeNull();
    expect(database.requestFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'OPEN', category: 'BLOOD' },
        take: 11,
      }),
    );
  });

  it('rejects unsupported filters without querying the database', async () => {
    const response = await request(createApp()).get(
      '/api/v1/requests?status=FULFILLED',
    );

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(database.requestFindMany).not.toHaveBeenCalled();
  });

  it('requires an authenticated requester to create a request', async () => {
    const response = await request(createApp())
      .post('/api/v1/requests')
      .send({});

    expect(response.status).toBe(401);
    expect(database.requestCreate).not.toHaveBeenCalled();
  });

  it('validates and creates an emergency request for its requester', async () => {
    database.requestCreate.mockResolvedValue({
      id: 'request-2',
      category: 'BLOOD',
      urgency: 'HIGH',
      title: 'O positive donor needed',
      details: null,
      bloodGroup: 'O_POSITIVE',
      units: 2,
      lat: 12.97,
      lng: 77.59,
      addressText: null,
      neededBy,
      status: 'OPEN',
      createdAt,
    });

    const response = await request(createApp())
      .post('/api/v1/requests')
      .set('Authorization', `Bearer ${accessToken()}`)
      .send({
        category: 'BLOOD',
        urgency: 'HIGH',
        title: 'O positive donor needed',
        bloodGroup: 'O_POSITIVE',
        units: 2,
        lat: 12.97,
        lng: 77.59,
        neededBy: neededBy.toISOString(),
      });

    expect(response.status).toBe(201);
    expect(response.body.request.id).toBe('request-2');
    expect(database.requestCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          requesterId: 'user-1',
          category: 'BLOOD',
          bloodGroup: 'O_POSITIVE',
          units: 2,
          neededBy,
        }),
      }),
    );
  });

  it('rejects blood requests without blood group and units', async () => {
    const response = await request(createApp())
      .post('/api/v1/requests')
      .set('Authorization', `Bearer ${accessToken()}`)
      .send({
        category: 'BLOOD',
        urgency: 'HIGH',
        title: 'Urgent donor needed',
        lat: 12.97,
        lng: 77.59,
        neededBy: neededBy.toISOString(),
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(database.requestCreate).not.toHaveBeenCalled();
  });

  it('rejects a request whose needed-by time is in the past', async () => {
    const response = await request(createApp())
      .post('/api/v1/requests')
      .set('Authorization', `Bearer ${accessToken()}`)
      .send({
        category: 'MEDICINE',
        urgency: 'NORMAL',
        title: 'Medicine needed soon',
        lat: 12.97,
        lng: 77.59,
        neededBy: new Date(Date.now() - 60_000).toISOString(),
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(database.requestCreate).not.toHaveBeenCalled();
  });

  it('does not allow helpers to create requests', async () => {
    database.userFindUnique.mockResolvedValue({
      id: 'user-1',
      role: Role.HELPER,
      isBlocked: false,
    });

    const response = await request(createApp())
      .post('/api/v1/requests')
      .set('Authorization', `Bearer ${accessToken(Role.HELPER)}`)
      .send({});

    expect(response.status).toBe(403);
    expect(database.requestCreate).not.toHaveBeenCalled();
  });

  it('returns private request details only through the requester-owned route', async () => {
    database.requestFindMany.mockResolvedValue([
      {
        id: 'request-3',
        category: 'MEDICINE',
        urgency: 'NORMAL',
        title: 'Medicine needed',
        details: { description: 'Prescription medication' },
        bloodGroup: null,
        units: null,
        lat: 12.97,
        lng: 77.59,
        addressText: 'Private address',
        neededBy,
        status: 'OPEN',
        createdAt,
      },
    ]);

    const response = await request(createApp())
      .get('/api/v1/requests/mine')
      .set('Authorization', `Bearer ${accessToken()}`);

    expect(response.status).toBe(200);
    expect(response.body.requests[0].addressText).toBe('Private address');
    expect(database.requestFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { requesterId: 'user-1' },
      }),
    );
  });
});
