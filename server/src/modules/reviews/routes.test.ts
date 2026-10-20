import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Role } from '../../generated/prisma/client.js';
import { createApp } from '../../app.js';
import { createAccessToken } from '../auth/token.js';

const database = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  requestFindUnique: vi.fn(),
  reviewFindMany: vi.fn(),
  reviewFindUnique: vi.fn(),
  reviewCreate: vi.fn(),
}));

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    user: { findUnique: database.userFindUnique },
    request: { findUnique: database.requestFindUnique },
    review: {
      findMany: database.reviewFindMany,
      findUnique: database.reviewFindUnique,
      create: database.reviewCreate,
    },
  },
}));

const createdAt = new Date('2026-10-20T00:00:00.000Z');

function accessToken(userId = 'requester-1', role: Role = Role.REQUESTER) {
  return createAccessToken({ id: userId, role });
}

describe('review routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_ACCESS_SECRET =
      'test-only-access-secret-with-at-least-32-bytes';
    database.userFindUnique.mockImplementation(async ({ where }) => ({
      id: where.id,
      role: Role.REQUESTER,
      isBlocked: false,
    }));
  });

  it('returns fulfilled-request reviews to either participant', async () => {
    database.requestFindUnique.mockResolvedValue({
      requesterId: 'requester-1',
      acceptedById: 'helper-1',
      status: 'FULFILLED',
    });
    database.reviewFindMany.mockResolvedValue([
      {
        id: 'review-1',
        reviewerId: 'requester-1',
        revieweeId: 'helper-1',
        rating: 5,
        comment: 'Very helpful.',
        createdAt,
        reviewer: { name: 'Requester' },
        reviewee: { name: 'Helper' },
      },
    ]);

    const response = await request(createApp())
      .get('/api/v1/requests/request-1/reviews')
      .set('Authorization', `Bearer ${accessToken()}`);

    expect(response.status).toBe(200);
    expect(response.body.reviews[0]).toMatchObject({
      reviewerName: 'Requester',
      revieweeName: 'Helper',
      rating: 5,
      comment: 'Very helpful.',
    });
  });

  it('rejects review access for users outside the fulfilled request', async () => {
    database.requestFindUnique.mockResolvedValue({
      requesterId: 'requester-1',
      acceptedById: 'helper-1',
      status: 'FULFILLED',
    });

    const response = await request(createApp())
      .get('/api/v1/requests/request-1/reviews')
      .set('Authorization', `Bearer ${accessToken('other-user')}`);

    expect(response.status).toBe(404);
    expect(database.reviewFindMany).not.toHaveBeenCalled();
  });

  it('lets a requester review the accepted helper after fulfillment', async () => {
    database.requestFindUnique.mockResolvedValue({
      requesterId: 'requester-1',
      acceptedById: 'helper-1',
      status: 'FULFILLED',
    });
    database.reviewFindUnique.mockResolvedValue(null);
    database.reviewCreate.mockResolvedValue({
      id: 'review-1',
      reviewerId: 'requester-1',
      revieweeId: 'helper-1',
      rating: 5,
      comment: '  Very helpful. ',
      createdAt,
      reviewer: { name: 'Requester' },
      reviewee: { name: 'Helper' },
    });

    const response = await request(createApp())
      .post('/api/v1/requests/request-1/reviews')
      .set('Authorization', `Bearer ${accessToken()}`)
      .send({ rating: 5, comment: '  Very helpful. ' });

    expect(response.status).toBe(201);
    expect(database.reviewCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          requestId: 'request-1',
          reviewerId: 'requester-1',
          revieweeId: 'helper-1',
          rating: 5,
          comment: 'Very helpful.',
        },
      }),
    );
  });

  it('lets an accepted helper review the requester after fulfillment', async () => {
    database.userFindUnique.mockResolvedValue({
      id: 'helper-1',
      role: Role.HELPER,
      isBlocked: false,
    });
    database.requestFindUnique.mockResolvedValue({
      requesterId: 'requester-1',
      acceptedById: 'helper-1',
      status: 'FULFILLED',
    });
    database.reviewFindUnique.mockResolvedValue(null);
    database.reviewCreate.mockResolvedValue({
      id: 'review-2',
      reviewerId: 'helper-1',
      revieweeId: 'requester-1',
      rating: 4,
      comment: null,
      createdAt,
      reviewer: { name: 'Helper' },
      reviewee: { name: 'Requester' },
    });

    const response = await request(createApp())
      .post('/api/v1/requests/request-1/reviews')
      .set('Authorization', `Bearer ${accessToken('helper-1', Role.HELPER)}`)
      .send({ rating: 4 });

    expect(response.status).toBe(201);
    expect(database.reviewCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reviewerId: 'helper-1',
          revieweeId: 'requester-1',
        }),
      }),
    );
  });

  it('does not allow reviews before a request is fulfilled', async () => {
    database.requestFindUnique.mockResolvedValue({
      requesterId: 'requester-1',
      acceptedById: 'helper-1',
      status: 'ACCEPTED',
    });

    const response = await request(createApp())
      .post('/api/v1/requests/request-1/reviews')
      .set('Authorization', `Bearer ${accessToken()}`)
      .send({ rating: 5 });

    expect(response.status).toBe(409);
    expect(database.reviewCreate).not.toHaveBeenCalled();
  });

  it('allows only one review per participant and request', async () => {
    database.requestFindUnique.mockResolvedValue({
      requesterId: 'requester-1',
      acceptedById: 'helper-1',
      status: 'FULFILLED',
    });
    database.reviewFindUnique.mockResolvedValue({ id: 'review-1' });

    const response = await request(createApp())
      .post('/api/v1/requests/request-1/reviews')
      .set('Authorization', `Bearer ${accessToken()}`)
      .send({ rating: 3 });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('REVIEW_ALREADY_SUBMITTED');
    expect(database.reviewCreate).not.toHaveBeenCalled();
  });

  it('rejects invalid ratings and oversized comments', async () => {
    const response = await request(createApp())
      .post('/api/v1/requests/request-1/reviews')
      .set('Authorization', `Bearer ${accessToken()}`)
      .send({ rating: 6, comment: 'x'.repeat(1001) });

    expect(response.status).toBe(400);
    expect(database.requestFindUnique).not.toHaveBeenCalled();
    expect(database.reviewCreate).not.toHaveBeenCalled();
  });
});
