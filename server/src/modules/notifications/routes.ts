import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate.js';
import { prisma } from '../../lib/prisma.js';

const listQuerySchema = z
  .object({
    cursor: z.string().min(1).max(32).optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict();

const listNotifications: RequestHandler = async (request, response) => {
  const userId = request.authUser?.id;
  if (!userId) {
    response.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'A valid access token is required.',
      },
    });
    return;
  }

  const parsed = listQuerySchema.safeParse(request.query);
  if (!parsed.success) {
    response.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message:
          parsed.error.issues[0]?.message ??
          'The query parameters are invalid.',
      },
    });
    return;
  }

  const { cursor, limit } = parsed.data;
  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        type: true,
        payload: true,
        readAt: true,
        createdAt: true,
      },
    }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);
  const hasMore = items.length > limit;
  const notifications = hasMore ? items.slice(0, limit) : items;

  response.status(200).json({
    notifications,
    unreadCount,
    nextCursor: hasMore ? notifications[notifications.length - 1]?.id : null,
  });
};

const markNotificationRead: RequestHandler = async (request, response) => {
  const userId = request.authUser?.id;
  const parsedId = z.string().min(1).max(32).safeParse(request.params.id);
  if (!userId) {
    response.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'A valid access token is required.',
      },
    });
    return;
  }
  if (!parsedId.success) {
    response.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'The notification id is invalid.',
      },
    });
    return;
  }

  const updated = await prisma.notification.updateMany({
    where: { id: parsedId.data, userId, readAt: null },
    data: { readAt: new Date() },
  });
  if (updated.count !== 1) {
    response.status(404).json({
      error: {
        code: 'NOTIFICATION_NOT_FOUND',
        message: 'The unread notification was not found.',
      },
    });
    return;
  }
  response.status(200).json({ message: 'Notification marked as read.' });
};

const markAllNotificationsRead: RequestHandler = async (request, response) => {
  const userId = request.authUser?.id;
  if (!userId) {
    response.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'A valid access token is required.',
      },
    });
    return;
  }

  const updated = await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  response.status(200).json({ updatedCount: updated.count });
};

export const notificationRouter = Router();

notificationRouter.use(authenticate);
notificationRouter.get('/', listNotifications);
notificationRouter.post('/read-all', markAllNotificationsRead);
notificationRouter.post('/:id/read', markNotificationRead);
