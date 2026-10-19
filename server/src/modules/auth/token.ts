import { createHash, randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { Role } from '../../generated/prisma/client.js';

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

export function getAccessTokenSecret() {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_ACCESS_SECRET must contain at least 32 characters.');
  }

  return secret;
}

export function createAccessToken(user: { id: string; role: Role }) {
  return jwt.sign({ role: user.role }, getAccessTokenSecret(), {
    algorithm: 'HS256',
    audience: 'lifeline-client',
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    issuer: 'lifeline-api',
    subject: user.id,
  });
}

export function createOpaqueToken() {
  return randomBytes(32).toString('base64url');
}

export function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}
