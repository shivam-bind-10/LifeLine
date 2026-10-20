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
  requestFindUnique: vi.fn(),
  requestUpdateMany: vi.fn(),
  helperProfileFindUnique: vi.fn(),
  helperProfileUpsert: vi.fn(),
  helperProfileUpdateMany: vi.fn(),
  notificationCreate: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    user: { findUnique: database.userFindUnique },
    helperProfile: {
      findUnique: database.helperProfileFindUnique,
      upsert: database.helperProfileUpsert,
      updateMany: database.helperProfileUpdateMany,
    },
    request: {
      findMany: database.requestFindMany,
      create: database.requestCreate,
      findUnique: database.requestFindUnique,
      updateMany: database.requestUpdateMany,
    },
    notification: { create: database.notificationCreate },
    $transaction: database.transaction,
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
    database.transaction.mockImplementation(async (operation) =>
      operation({
        helperProfile: { updateMany: database.helperProfileUpdateMany },
        request: { updateMany: database.requestUpdateMany },
        notification: { create: database.notificationCreate },
      }),
    );
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

  it('saves a volunteer matching profile', async () => {
    database.userFindUnique.mockResolvedValue({
      id: 'user-1',
      role: Role.HELPER,
      isBlocked: false,
    });
    database.helperProfileUpsert.mockResolvedValue({
      offerings: ['BLOOD', 'OXYGEN'],
      bloodGroup: 'O_POSITIVE',
      lat: 12.97,
      lng: 77.59,
      radiusKm: 20,
      isAvailable: true,
      availableFrom: null,
      availableTo: null,
    });

    const response = await request(createApp())
      .put('/api/v1/requests/helper-profile')
      .set('Authorization', `Bearer ${accessToken(Role.HELPER)}`)
      .send({
        offerings: ['BLOOD', 'OXYGEN'],
        bloodGroup: 'O_POSITIVE',
        lat: 12.97,
        lng: 77.59,
        radiusKm: 20,
        isAvailable: true,
      });

    expect(response.status).toBe(200);
    expect(response.body.profile.radiusKm).toBe(20);
    expect(database.helperProfileUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1' },
        create: expect.objectContaining({
          userId: 'user-1',
          offerings: ['BLOOD', 'OXYGEN'],
        }),
      }),
    );
  });

  it('rejects invalid helper profile coordinates', async () => {
    database.userFindUnique.mockResolvedValue({
      id: 'user-1',
      role: Role.HELPER,
      isBlocked: false,
    });
    const response = await request(createApp())
      .put('/api/v1/requests/helper-profile')
      .set('Authorization', `Bearer ${accessToken(Role.HELPER)}`)
      .send({
        offerings: ['BLOOD'],
        lat: 200,
        lng: 77.59,
        radiusKm: 10,
        isAvailable: true,
      });

    expect(response.status).toBe(400);
    expect(database.helperProfileUpsert).not.toHaveBeenCalled();
  });

  it('returns open requests within a volunteer profile radius', async () => {
    database.userFindUnique.mockResolvedValue({
      id: 'user-1',
      role: Role.HELPER,
      isBlocked: false,
    });
    database.helperProfileFindUnique.mockResolvedValue({
      offerings: ['OXYGEN'],
      bloodGroup: null,
      lat: 12.97,
      lng: 77.59,
      radiusKm: 10,
      isAvailable: true,
    });
    database.requestFindMany.mockResolvedValue([
      {
        id: 'nearby',
        category: 'OXYGEN',
        urgency: 'HIGH',
        title: 'Oxygen support',
        bloodGroup: null,
        lat: 12.98,
        lng: 77.6,
        neededBy,
        createdAt,
      },
      {
        id: 'far-away',
        category: 'OXYGEN',
        urgency: 'NORMAL',
        title: 'Oxygen cylinder',
        bloodGroup: null,
        lat: 13.5,
        lng: 78.1,
        neededBy,
        createdAt,
      },
    ]);

    const response = await request(createApp())
      .get('/api/v1/requests/matches')
      .set('Authorization', `Bearer ${accessToken(Role.HELPER)}`);

    expect(response.status).toBe(200);
    expect(response.body.requests).toHaveLength(1);
    expect(response.body.requests[0].id).toBe('nearby');
    expect(response.body.requests[0].distanceKm).toBeGreaterThan(0);
    expect(database.requestFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          category: { in: ['OXYGEN'] },
          requesterId: { not: 'user-1' },
        }),
      }),
    );
  });

  it('accepts a matching request once and notifies the requester', async () => {
    database.userFindUnique.mockResolvedValue({
      id: 'helper-1',
      role: Role.HELPER,
      isBlocked: false,
    });
    database.helperProfileFindUnique.mockResolvedValue({
      offerings: ['OXYGEN'],
      bloodGroup: null,
      lat: 12.97,
      lng: 77.59,
      radiusKm: 10,
      isAvailable: true,
    });
    database.requestFindUnique.mockResolvedValue({
      id: 'request-4',
      requesterId: 'requester-1',
      category: 'OXYGEN',
      bloodGroup: null,
      lat: 12.98,
      lng: 77.6,
    });
    database.helperProfileUpdateMany.mockResolvedValue({ count: 1 });
    database.requestUpdateMany.mockResolvedValue({ count: 1 });

    const response = await request(createApp())
      .post('/api/v1/requests/request-4/accept')
      .set('Authorization', `Bearer ${accessToken(Role.HELPER)}`);

    expect(response.status).toBe(200);
    expect(database.helperProfileUpdateMany).toHaveBeenCalledWith({
      where: { userId: 'helper-1', isAvailable: true },
      data: { isAvailable: false },
    });
    expect(database.requestUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'request-4',
          status: 'OPEN',
        }),
        data: { status: 'ACCEPTED', acceptedById: 'helper-1' },
      }),
    );
    expect(database.notificationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'requester-1',
          type: 'REQUEST_ACCEPTED',
        }),
      }),
    );
  });

  it('restores helper availability when a request was claimed by another volunteer', async () => {
    database.userFindUnique.mockResolvedValue({
      id: 'helper-1',
      role: Role.HELPER,
      isBlocked: false,
    });
    database.helperProfileFindUnique.mockResolvedValue({
      offerings: ['OXYGEN'],
      bloodGroup: null,
      lat: 12.97,
      lng: 77.59,
      radiusKm: 10,
      isAvailable: true,
    });
    database.requestFindUnique.mockResolvedValue({
      id: 'request-4',
      requesterId: 'requester-1',
      category: 'OXYGEN',
      bloodGroup: null,
      lat: 12.98,
      lng: 77.6,
    });
    database.helperProfileUpdateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 1 });
    database.requestUpdateMany.mockResolvedValue({ count: 0 });

    const response = await request(createApp())
      .post('/api/v1/requests/request-4/accept')
      .set('Authorization', `Bearer ${accessToken(Role.HELPER)}`);

    expect(response.status).toBe(409);
    expect(database.helperProfileUpdateMany).toHaveBeenCalledTimes(2);
    expect(database.notificationCreate).not.toHaveBeenCalled();
  });

  it('does not claim another request when a helper has already accepted one', async () => {
    database.userFindUnique.mockResolvedValue({
      id: 'helper-1',
      role: Role.HELPER,
      isBlocked: false,
    });
    database.helperProfileFindUnique.mockResolvedValue({
      offerings: ['OXYGEN'],
      bloodGroup: null,
      lat: 12.97,
      lng: 77.59,
      radiusKm: 10,
      isAvailable: true,
    });
    database.requestFindUnique.mockResolvedValue({
      id: 'request-6',
      requesterId: 'requester-1',
      category: 'OXYGEN',
      bloodGroup: null,
      lat: 12.98,
      lng: 77.6,
    });
    database.helperProfileUpdateMany.mockResolvedValue({ count: 0 });

    const response = await request(createApp())
      .post('/api/v1/requests/request-6/accept')
      .set('Authorization', `Bearer ${accessToken(Role.HELPER)}`);

    expect(response.status).toBe(409);
    expect(database.requestUpdateMany).not.toHaveBeenCalled();
    expect(database.notificationCreate).not.toHaveBeenCalled();
  });

  it('shows private details only to the requester or accepted volunteer', async () => {
    database.userFindUnique.mockResolvedValue({
      id: 'helper-1',
      role: Role.HELPER,
      isBlocked: false,
    });
    database.requestFindUnique.mockResolvedValue({
      id: 'request-5',
      requesterId: 'requester-1',
      acceptedById: 'helper-1',
      category: 'OXYGEN',
      urgency: 'HIGH',
      title: 'Oxygen support',
      details: { description: 'Please call on arrival.' },
      bloodGroup: null,
      units: null,
      lat: 12.97,
      lng: 77.59,
      addressText: 'Private address',
      neededBy,
      status: 'ACCEPTED',
      createdAt,
      requester: { name: 'Requester', phone: '123456789' },
    });

    const response = await request(createApp())
      .get('/api/v1/requests/request-5')
      .set('Authorization', `Bearer ${accessToken(Role.HELPER)}`);

    expect(response.status).toBe(200);
    expect(response.body.request.addressText).toBe('Private address');
    expect(response.body.request.requester.phone).toBe('123456789');
    expect(response.body.request).not.toHaveProperty('requesterId');
    expect(response.body.request).not.toHaveProperty('acceptedById');
  });

  it('hides private request details from unrelated authenticated users', async () => {
    database.requestFindUnique.mockResolvedValue({
      id: 'request-7',
      requesterId: 'another-user',
      acceptedById: null,
      category: 'OXYGEN',
      urgency: 'HIGH',
      title: 'Oxygen support',
      details: { description: 'Private' },
      bloodGroup: null,
      units: null,
      lat: 12.97,
      lng: 77.59,
      addressText: 'Private address',
      neededBy,
      status: 'OPEN',
      createdAt,
      requester: { name: 'Requester', phone: '123456789' },
    });

    const response = await request(createApp())
      .get('/api/v1/requests/request-7')
      .set('Authorization', `Bearer ${accessToken()}`);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('REQUEST_NOT_FOUND');
  });
});
