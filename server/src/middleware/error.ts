import type { ErrorRequestHandler } from 'express';
import { Prisma } from '../generated/prisma/client.js';

export const errorHandler: ErrorRequestHandler = (
  error,
  _request,
  response,
  next,
) => {
  if (response.headersSent) {
    next(error);
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      response.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'A record with these details already exists.',
        },
      });
      return;
    }

    if (error.code === 'P2025') {
      response.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'The requested record was not found.',
        },
      });
      return;
    }

    console.error('Database request failed', { code: error.code });
    response.status(500).json({
      error: {
        code: 'DATABASE_ERROR',
        message: 'The database request could not be completed.',
      },
    });
    return;
  }

  console.error('Unhandled API error', {
    errorName: error instanceof Error ? error.name : 'UnknownError',
  });
  response.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred.',
    },
  });
};
