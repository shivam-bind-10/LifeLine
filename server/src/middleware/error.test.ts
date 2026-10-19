import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '../generated/prisma/client.js';
import { errorHandler } from './error.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('API error handler', () => {
  it('returns a generic response without leaking internal error details', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const app = express();
    app.get('/failure', (_request, _response, next) => {
      next(new Error('private database connection details'));
    });
    app.use(errorHandler);

    const response = await request(app).get('/failure');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred.',
      },
    });
    expect(JSON.stringify(response.body)).not.toContain(
      'private database connection details',
    );
    expect(log).toHaveBeenCalledWith('Unhandled API error', {
      errorName: 'Error',
    });
  });

  it('maps duplicate database records to a conflict response', async () => {
    const app = express();
    app.get('/duplicate', (_request, _response, next) => {
      next(
        new Prisma.PrismaClientKnownRequestError('duplicate email', {
          code: 'P2002',
          clientVersion: '7.10.1',
          meta: { target: ['email'] },
        }),
      );
    });
    app.use(errorHandler);

    const response = await request(app).get('/duplicate');

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: {
        code: 'CONFLICT',
        message: 'A record with these details already exists.',
      },
    });
  });
});
