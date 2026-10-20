import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Role } from '../../generated/prisma/client.js';
import { createApp } from '../../app.js';
import { createAccessToken } from '../auth/token.js';

const database = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  requestFindUnique: vi.fn(),
  messageFindMany: vi.fn(),
  messageCreate: vi.fn(),
  notificationCreate: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    user: { findUnique: database.userFindUnique },
    request: { findUnique: database.requestFindUnique },
    message: {
      findMany: database.messageFindMany,
      create: database.messageCreate,
    },
    notification: { create: database.notificationCreate },
    $transaction: database.transaction,
  },
}));

const createdAt = new Date('2026-10-20T00:00:00.000Z');

function accessToken(userId = 'requester-1', role: Role = Role.REQUESTER) {
  return createAccessToken({ id: userId, role });
}

describe('conversation routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_ACCESS_SECRET =
      'test-only-access-secret-with-at-least-32-bytes';
    database.userFindUnique.mockImplementation(async ({ where }) => ({
      id: where.id,
      role: Role.REQUESTER,
      isBlocked: false,
    }));
    database.transaction.mockImplementation(async (operation) =>
      operation({
        request: { findUnique: database.requestFindUnique },
        message: { create: database.messageCreate },
        notification: { create: database.notificationCreate },
      }),
    );
  });

  it('lists messages for either participant and returns them oldest first', async () => {
    database.requestFindUnique.mockResolvedValue({
      requesterId: 'requester-1',
      acceptedById: 'helper-1',
      status: 'ACCEPTED',
    });
    database.messageFindMany.mockResolvedValue([
      {
        id: 'message-2',
        senderId: 'helper-1',
        text: 'On my way.',
        createdAt: new Date('2026-10-20T00:02:00.000Z'),
        sender: { name: 'Helper' },
      },
      {
        id: 'message-1',
        senderId: 'requester-1',
        text: 'Please call on arrival.',
        createdAt,
        sender: { name: 'Requester' },
      },
    ]);

    const response = await request(createApp())
      .get('/api/v1/requests/request-1/messages')
      .set('Authorization', `Bearer ${accessToken()}`);

    expect(response.status).toBe(200);
    expect(
      response.body.messages.map((message: { id: string }) => message.id),
    ).toEqual(['message-1', 'message-2']);
    expect(database.messageFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { requestId: 'request-1' },
        take: 100,
      }),
    );
  });

  it('does not disclose a conversation to a non-participant', async () => {
    database.requestFindUnique.mockResolvedValue({
      requesterId: 'requester-1',
      acceptedById: 'helper-1',
      status: 'ACCEPTED',
    });

    const response = await request(createApp())
      .get('/api/v1/requests/request-1/messages')
      .set('Authorization', `Bearer ${accessToken('other-user')}`);

    expect(response.status).toBe(404);
    expect(database.messageFindMany).not.toHaveBeenCalled();
  });

  it('rejects messages for requests that are not accepted or fulfilled', async () => {
    database.requestFindUnique.mockResolvedValue({
      requesterId: 'requester-1',
      acceptedById: null,
      status: 'OPEN',
    });

    const response = await request(createApp())
      .get('/api/v1/requests/request-1/messages')
      .set('Authorization', `Bearer ${accessToken()}`);

    expect(response.status).toBe(404);
    expect(database.messageFindMany).not.toHaveBeenCalled();
  });

  it('sends a message and notifies the other participant', async () => {
    database.requestFindUnique.mockResolvedValue({
      requesterId: 'requester-1',
      acceptedById: 'helper-1',
      status: 'ACCEPTED',
    });
    database.messageCreate.mockResolvedValue({
      id: 'message-1',
      senderId: 'requester-1',
      text: '  Please call me.  ',
      createdAt,
      sender: { name: 'Requester' },
    });

    const response = await request(createApp())
      .post('/api/v1/requests/request-1/messages')
      .set('Authorization', `Bearer ${accessToken()}`)
      .send({ text: '  Please call me.  ' });

    expect(response.status).toBe(201);
    expect(database.messageCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          requestId: 'request-1',
          senderId: 'requester-1',
          text: 'Please call me.',
        },
      }),
    );
    expect(database.notificationCreate).toHaveBeenCalledWith({
      data: {
        userId: 'helper-1',
        type: 'REQUEST_MESSAGE',
        payload: { requestId: 'request-1', messageId: 'message-1' },
      },
    });
  });

  it('does not send messages to a closed request', async () => {
    database.requestFindUnique.mockResolvedValue({
      requesterId: 'requester-1',
      acceptedById: 'helper-1',
      status: 'FULFILLED',
    });

    const response = await request(createApp())
      .post('/api/v1/requests/request-1/messages')
      .set('Authorization', `Bearer ${accessToken()}`)
      .send({ text: 'Thanks.' });

    expect(response.status).toBe(409);
    expect(database.messageCreate).not.toHaveBeenCalled();
  });

  it('rejects empty and oversized message bodies', async () => {
    const response = await request(createApp())
      .post('/api/v1/requests/request-1/messages')
      .set('Authorization', `Bearer ${accessToken()}`)
      .send({ text: '   ' });

    expect(response.status).toBe(400);
    expect(database.requestFindUnique).not.toHaveBeenCalled();
    expect(database.messageCreate).not.toHaveBeenCalled();
  });

  it('does not create a message if the request closes before the transaction', async () => {
    database.requestFindUnique
      .mockResolvedValueOnce({
        requesterId: 'requester-1',
        acceptedById: 'helper-1',
        status: 'ACCEPTED',
      })
      .mockResolvedValueOnce({
        requesterId: 'requester-1',
        acceptedById: 'helper-1',
        status: 'FULFILLED',
      });

    const response = await request(createApp())
      .post('/api/v1/requests/request-1/messages')
      .set('Authorization', `Bearer ${accessToken()}`)
      .send({ text: 'Thanks.' });

    expect(response.status).toBe(409);
    expect(database.messageCreate).not.toHaveBeenCalled();
    expect(database.notificationCreate).not.toHaveBeenCalled();
  });
});
