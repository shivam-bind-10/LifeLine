import { Router, type RequestHandler } from 'express';
import { Role } from '../../generated/prisma/client.js';
import { authenticate, requireRoles } from '../../middleware/authenticate.js';
import { prisma } from '../../lib/prisma.js';
import { z } from 'zod';

const messageSchema = z
  .object({ text: z.string().trim().min(1).max(2000) })
  .strict();

const requestIdSchema = z.string().min(1).max(32);

function validationError(
  response: Parameters<RequestHandler>[1],
  message: string,
) {
  response.status(400).json({
    error: { code: 'VALIDATION_ERROR', message },
  });
}

const listMessages: RequestHandler = async (request, response) => {
  const userId = request.authUser?.id;
  const parsedId = requestIdSchema.safeParse(request.params.id);
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
    validationError(response, 'The request id is invalid.');
    return;
  }

  const item = await prisma.request.findUnique({
    where: { id: parsedId.data },
    select: {
      requesterId: true,
      acceptedById: true,
      status: true,
    },
  });
  if (
    !item ||
    (item.requesterId !== userId && item.acceptedById !== userId) ||
    (item.status !== 'ACCEPTED' && item.status !== 'FULFILLED')
  ) {
    response.status(404).json({
      error: {
        code: 'REQUEST_NOT_FOUND',
        message: 'The active conversation was not found.',
      },
    });
    return;
  }

  const messages = await prisma.message.findMany({
    where: { requestId: parsedId.data },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 100,
    select: {
      id: true,
      senderId: true,
      text: true,
      createdAt: true,
      sender: { select: { name: true } },
    },
  });
  response.status(200).json({ messages: messages.reverse() });
};

const sendMessage: RequestHandler = async (request, response) => {
  const userId = request.authUser?.id;
  const parsedId = requestIdSchema.safeParse(request.params.id);
  const parsedBody = messageSchema.safeParse(request.body);
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
    validationError(response, 'The request id is invalid.');
    return;
  }
  if (!parsedBody.success) {
    validationError(
      response,
      parsedBody.error.issues[0]?.message ?? 'The message is invalid.',
    );
    return;
  }

  const item = await prisma.request.findUnique({
    where: { id: parsedId.data },
    select: {
      requesterId: true,
      acceptedById: true,
      status: true,
    },
  });
  if (!item || (item.requesterId !== userId && item.acceptedById !== userId)) {
    response.status(404).json({
      error: {
        code: 'REQUEST_NOT_FOUND',
        message: 'The request was not found.',
      },
    });
    return;
  }
  if (item.status !== 'ACCEPTED' || !item.acceptedById) {
    response.status(409).json({
      error: {
        code: 'CONVERSATION_CLOSED',
        message: 'Messages can only be sent while a request is accepted.',
      },
    });
    return;
  }

  const result = await prisma.$transaction(async (transaction) => {
    const current = await transaction.request.findUnique({
      where: { id: parsedId.data },
      select: {
        requesterId: true,
        acceptedById: true,
        status: true,
      },
    });
    if (
      !current ||
      current.status !== 'ACCEPTED' ||
      (current.requesterId !== userId && current.acceptedById !== userId) ||
      !current.acceptedById
    ) {
      return null;
    }

    const recipientId =
      current.requesterId === userId
        ? current.acceptedById
        : current.requesterId;
    const message = await transaction.message.create({
      data: {
        requestId: parsedId.data,
        senderId: userId,
        text: parsedBody.data.text,
      },
      select: {
        id: true,
        senderId: true,
        text: true,
        createdAt: true,
        sender: { select: { name: true } },
      },
    });
    await transaction.notification.create({
      data: {
        userId: recipientId,
        type: 'REQUEST_MESSAGE',
        payload: { requestId: parsedId.data, messageId: message.id },
      },
    });
    return message;
  });

  if (!result) {
    response.status(409).json({
      error: {
        code: 'CONVERSATION_CLOSED',
        message: 'Messages can only be sent while a request is accepted.',
      },
    });
    return;
  }
  response.status(201).json({ message: result });
};

export const conversationRouter = Router();

conversationRouter.get('/:id/messages', authenticate, listMessages);
conversationRouter.post(
  '/:id/messages',
  authenticate,
  requireRoles(Role.REQUESTER, Role.HELPER),
  sendMessage,
);
