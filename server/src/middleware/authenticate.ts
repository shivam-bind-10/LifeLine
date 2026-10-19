import type { RequestHandler } from 'express';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { Role } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';
import { getAccessTokenSecret } from '../modules/auth/token.js';

const validRoles = new Set<string>(Object.values(Role));

export const authenticate: RequestHandler = async (request, response, next) => {
  const authorization = request.get('authorization');
  const [scheme, token, extra] = authorization?.split(' ') ?? [];

  if (scheme !== 'Bearer' || !token || extra) {
    response.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'A valid access token is required.',
      },
    });
    return;
  }

  let secret: string;
  try {
    secret = getAccessTokenSecret();
  } catch (error) {
    next(error);
    return;
  }

  let payload: JwtPayload;
  try {
    payload = jwt.verify(token, secret, {
      algorithms: ['HS256'],
      audience: 'lifeline-client',
      issuer: 'lifeline-api',
    }) as JwtPayload;
  } catch {
    response.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'The access token is invalid or has expired.',
      },
    });
    return;
  }

  if (typeof payload.sub !== 'string') {
    response.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'The access token is invalid.',
      },
    });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, role: true, isBlocked: true },
  });
  if (!user || user.isBlocked || !validRoles.has(user.role)) {
    response.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'This account is not available.',
      },
    });
    return;
  }

  request.authUser = { id: user.id, role: user.role };
  next();
};

export function requireRoles(...roles: Role[]): RequestHandler {
  return (request, response, next) => {
    if (!request.authUser) {
      response.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'A valid access token is required.',
        },
      });
      return;
    }

    if (!roles.includes(request.authUser.role)) {
      response.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to access this resource.',
        },
      });
      return;
    }

    next();
  };
}
