import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Role } from '../../generated/prisma/client.js';
import { createApp } from '../../app.js';
import { createAccessToken } from '../auth/token.js';

const database = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  notificationFindMany: vi.fn(),
  notificationCount: vi.fn(),
  notificationUpdateMany: vi.fn(),
}));

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    user: { findUnique: database.userFindUnique },
    notification: {
      findMany: database.notificationFindMany,
      count: database.notificationCount,
      updateMany: database.notificationUpdateMany,
    },
  },
}));

function authHeader(userId = 'user-1') {
  const token = createAccessToken({ id: userId, role: Role.REQUESTER });
  return `Bearer ${token}`;
}

describe('notification routes', () => {
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

  it('requires a signed-in user to read the inbox', async () => {
    const response = await request(createApp()).get('/api/v1/notifications');

    expect(response.status).toBe(401);
    expect(database.notificationFindMany).not.toHaveBeenCalled();
  });

  it('lists only the current user notifications and their unread count', async () => {
    database.notificationFindMany.mockResolvedValue([
      {
        id: 'notification-1',
        type: 'REQUEST_ACCEPTED',
        payload: { requestId: 'request-1' },
        readAt: null,
        createdAt: new Date('2026-10-20T10:00:00.000Z'),
      },
    ]);
    database.notificationCount.mockResolvedValue(1);

    const response = await request(createApp())
      .get('/api/v1/notifications?limit=10')
      .set('Authorization', authHeader());

    expect(response.status).toBe(200);
    expect(response.body.notifications).toHaveLength(1);
    expect(response.body.unreadCount).toBe(1);
    expect(response.body.nextCursor).toBeNull();
    expect(database.notificationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1' },
        take: 11,
      }),
    );
    expect(database.notificationCount).toHaveBeenCalledWith({
      where: { userId: 'user-1', readAt: null },
    });
  });

  it('marks only the current user unread notification as read', async () => {
    database.notificationUpdateMany.mockResolvedValue({ count: 1 });

    const response = await request(createApp())
      .post('/api/v1/notifications/notification-1/read')
      .set('Authorization', authHeader());

    expect(response.status).toBe(200);
    expect(database.notificationUpdateMany).toHaveBeenCalledWith({
      where: {
        id: 'notification-1',
        userId: 'user-1',
        readAt: null,
      },
      data: { readAt: expect.any(Date) },
    });
  });

  it('does not reveal another user notification when marking it read', async () => {
    database.notificationUpdateMany.mockResolvedValue({ count: 0 });

    const response = await request(createApp())
      .post('/api/v1/notifications/private-notification/read')
      .set('Authorization', authHeader());

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOTIFICATION_NOT_FOUND');
    expect(database.notificationUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'user-1' }),
      }),
    );
  });

  it('marks all unread notifications for the current user as read', async () => {
    database.notificationUpdateMany.mockResolvedValue({ count: 3 });

    const response = await request(createApp())
      .post('/api/v1/notifications/read-all')
      .set('Authorization', authHeader());

    expect(response.status).toBe(200);
    expect(response.body.updatedCount).toBe(3);
    expect(database.notificationUpdateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', readAt: null },
      data: { readAt: expect.any(Date) },
    });
  });
});
