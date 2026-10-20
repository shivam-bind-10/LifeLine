import { compare, hash } from 'bcryptjs';
import type { CookieOptions, RequestHandler } from 'express';
import { Router } from 'express';
import { z } from 'zod';
import { Role } from '../../generated/prisma/client.js';
import { authenticate } from '../../middleware/authenticate.js';
import { prisma } from '../../lib/prisma.js';
import {
  isPasswordResetEmailConfigured,
  sendPasswordResetEmail,
} from './password-reset-email.js';
import {
  createAccessToken,
  createOpaqueToken,
  hashToken,
  PASSWORD_RESET_TTL_MS,
  REFRESH_TOKEN_TTL_MS,
} from './token.js';

const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000;
const PASSWORD_COST = 12;
const REFRESH_COOKIE_NAME = 'lifeline_refresh';

const emailSchema = z
  .string()
  .trim()
  .email()
  .max(254)
  .transform((email) => email.toLowerCase());
const passwordSchema = z.string().min(12).max(128);
const registerSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    email: emailSchema,
    password: passwordSchema,
    role: z.enum([Role.REQUESTER, Role.HELPER]).default(Role.REQUESTER),
  })
  .strict();
const loginSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(1).max(128),
  })
  .strict();
const forgotPasswordSchema = z.object({ email: emailSchema }).strict();
const resetPasswordSchema = z
  .object({
    token: z.string().min(32).max(128),
    password: passwordSchema,
  })
  .strict();
const updateProfileSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    phone: z.string().trim().min(3).max(30).nullable().optional(),
    language: z.enum(['en', 'hi']).optional(),
  })
  .strict()
  .refine((profile) => Object.keys(profile).length > 0, {
    message: 'Provide at least one profile field to update.',
  });

const refreshCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  path: '/api/v1/auth',
};

function setRefreshCookie(
  response: Parameters<RequestHandler>[1],
  token: string,
) {
  response.cookie(REFRESH_COOKIE_NAME, token, {
    ...refreshCookieOptions,
    maxAge: REFRESH_TOKEN_TTL_MS,
  });
}

function clearRefreshCookie(response: Parameters<RequestHandler>[1]) {
  response.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions);
}

function sendInvalidBody(
  response: Parameters<RequestHandler>[1],
  message: string,
) {
  response.status(400).json({ error: { code: 'VALIDATION_ERROR', message } });
}

async function issueSession(user: { id: string; role: Role }) {
  const accessToken = createAccessToken(user);
  const refreshToken = createOpaqueToken();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await prisma.refreshToken.create({
    data: { tokenHash: hashToken(refreshToken), userId: user.id, expiresAt },
  });

  return { accessToken, refreshToken };
}

function publicUser(user: {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  isHelper: boolean;
  language: string;
  createdAt: Date;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isHelper: user.isHelper,
    language: user.language,
    createdAt: user.createdAt,
  };
}

function readBody<T>(schema: z.ZodType<T>): RequestHandler {
  return (request, response, next) => {
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      sendInvalidBody(
        response,
        parsed.error.issues[0]?.message ?? 'The request body is invalid.',
      );
      return;
    }

    response.locals.validatedBody = parsed.data;
    next();
  };
}

type ValidatedRequestHandler<T> = RequestHandler & {
  (
    request: Parameters<RequestHandler>[0] & { body: T },
    response: Parameters<RequestHandler>[1],
    next: Parameters<RequestHandler>[2],
  ): void | Promise<void>;
};

const register: ValidatedRequestHandler<
  z.infer<typeof registerSchema>
> = async (request, response) => {
  const body = response.locals.validatedBody as z.infer<typeof registerSchema>;
  const user = await prisma.user.create({
    data: {
      name: body.name,
      email: body.email,
      passwordHash: await hash(body.password, PASSWORD_COST),
      role: body.role,
      isHelper: body.role === Role.HELPER,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isHelper: true,
      language: true,
      createdAt: true,
    },
  });
  const session = await issueSession(user);

  setRefreshCookie(response, session.refreshToken);
  response.status(201).json({
    user: publicUser(user),
    accessToken: session.accessToken,
    expiresIn: ACCESS_TOKEN_TTL_MS / 1000,
  });
};

const login: ValidatedRequestHandler<z.infer<typeof loginSchema>> = async (
  _request,
  response,
) => {
  const body = response.locals.validatedBody as z.infer<typeof loginSchema>;
  const user = await prisma.user.findUnique({ where: { email: body.email } });
  if (
    !user ||
    user.isBlocked ||
    !(await compare(body.password, user.passwordHash))
  ) {
    response.status(401).json({
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Email or password is incorrect.',
      },
    });
    return;
  }

  const session = await issueSession(user);
  setRefreshCookie(response, session.refreshToken);
  response.status(200).json({
    user: publicUser(user),
    accessToken: session.accessToken,
    expiresIn: ACCESS_TOKEN_TTL_MS / 1000,
  });
};

const refresh: RequestHandler = async (request, response) => {
  const token = request.cookies?.[REFRESH_COOKIE_NAME];
  if (typeof token !== 'string') {
    response.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'A valid refresh cookie is required.',
      },
    });
    return;
  }

  const storedToken = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      user: {
        select: { id: true, role: true, isBlocked: true },
      },
    },
  });
  const now = new Date();
  if (
    !storedToken ||
    storedToken.revokedAt ||
    storedToken.expiresAt <= now ||
    storedToken.user.isBlocked
  ) {
    clearRefreshCookie(response);
    response.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'The refresh session is invalid or expired.',
      },
    });
    return;
  }

  const accessToken = createAccessToken(storedToken.user);
  const nextToken = createOpaqueToken();
  const expiresAt = new Date(now.getTime() + REFRESH_TOKEN_TTL_MS);
  const rotated = await prisma.$transaction(async (transaction) => {
    const revoked = await transaction.refreshToken.updateMany({
      where: { id: storedToken.id, revokedAt: null, expiresAt: { gt: now } },
      data: { revokedAt: now },
    });
    if (revoked.count !== 1) {
      return false;
    }

    await transaction.refreshToken.create({
      data: {
        tokenHash: hashToken(nextToken),
        userId: storedToken.userId,
        expiresAt,
      },
    });
    return true;
  });

  if (!rotated) {
    clearRefreshCookie(response);
    response.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'The refresh session has already been used.',
      },
    });
    return;
  }

  setRefreshCookie(response, nextToken);
  response.status(200).json({
    accessToken,
    expiresIn: ACCESS_TOKEN_TTL_MS / 1000,
  });
};

const logout: RequestHandler = async (request, response) => {
  const token = request.cookies?.[REFRESH_COOKIE_NAME];
  if (typeof token === 'string') {
    await prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  clearRefreshCookie(response);
  response.status(204).end();
};

const forgotPassword: ValidatedRequestHandler<
  z.infer<typeof forgotPasswordSchema>
> = async (_request, response) => {
  const emailConfigured = isPasswordResetEmailConfigured();
  if (process.env.NODE_ENV === 'production' && !emailConfigured) {
    response.status(503).json({
      error: {
        code: 'PASSWORD_RESET_UNAVAILABLE',
        message: 'Password reset email delivery is not configured.',
      },
    });
    return;
  }

  const { email } = response.locals.validatedBody as z.infer<
    typeof forgotPasswordSchema
  >;
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (user) {
    const token = createOpaqueToken();
    const now = new Date();
    await prisma.$transaction([
      prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: now },
      }),
      prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(token),
          expiresAt: new Date(now.getTime() + PASSWORD_RESET_TTL_MS),
        },
      }),
    ]);
    if (emailConfigured) {
      try {
        await sendPasswordResetEmail(email, token);
      } catch (error) {
        await prisma.passwordResetToken.updateMany({
          where: { userId: user.id, tokenHash: hashToken(token), usedAt: null },
          data: { usedAt: new Date() },
        });
        throw error;
      }
    } else {
      console.info('LifeLine development password reset token', {
        email,
        token,
      });
    }
  }

  response.status(200).json({
    message:
      'If an account exists for this email, password reset instructions are available.',
  });
};

const resetPassword: ValidatedRequestHandler<
  z.infer<typeof resetPasswordSchema>
> = async (_request, response) => {
  const body = response.locals.validatedBody as z.infer<
    typeof resetPasswordSchema
  >;
  const now = new Date();
  const tokenHash = hashToken(body.token);
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: { userId: true, expiresAt: true, usedAt: true },
  });
  if (!resetToken || resetToken.usedAt || resetToken.expiresAt <= now) {
    response.status(400).json({
      error: {
        code: 'INVALID_RESET_TOKEN',
        message: 'The password reset token is invalid or expired.',
      },
    });
    return;
  }

  const passwordHash = await hash(body.password, PASSWORD_COST);
  const reset = await prisma.$transaction(async (transaction) => {
    const consumed = await transaction.passwordResetToken.updateMany({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: now },
      },
      data: { usedAt: now },
    });
    if (consumed.count !== 1) {
      return false;
    }

    await transaction.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    });
    await transaction.refreshToken.updateMany({
      where: { userId: resetToken.userId, revokedAt: null },
      data: { revokedAt: now },
    });
    return true;
  });

  if (!reset) {
    response.status(400).json({
      error: {
        code: 'INVALID_RESET_TOKEN',
        message: 'The password reset token is invalid or expired.',
      },
    });
    return;
  }

  response
    .status(200)
    .json({ message: 'Password updated. Please sign in again.' });
};

const getMe: RequestHandler = async (request, response) => {
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

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isHelper: true,
      language: true,
      createdAt: true,
      isBlocked: true,
    },
  });
  if (!user || user.isBlocked) {
    response.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'This account is not available.',
      },
    });
    return;
  }

  response.status(200).json({ user: publicUser(user) });
};

const updateMe: ValidatedRequestHandler<
  z.infer<typeof updateProfileSchema>
> = async (request, response) => {
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

  const body = response.locals.validatedBody as z.infer<
    typeof updateProfileSchema
  >;
  const user = await prisma.user.update({
    where: { id: userId },
    data: body,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isHelper: true,
      language: true,
      createdAt: true,
    },
  });
  response.status(200).json({ user: publicUser(user) });
};

export const authRouter = Router();

authRouter.post('/auth/register', readBody(registerSchema), register);
authRouter.post('/auth/login', readBody(loginSchema), login);
authRouter.post('/auth/refresh', refresh);
authRouter.post('/auth/logout', logout);
authRouter.post(
  '/auth/forgot-password',
  readBody(forgotPasswordSchema),
  forgotPassword,
);
authRouter.post(
  '/auth/reset-password',
  readBody(resetPasswordSchema),
  resetPassword,
);
authRouter.get('/me', authenticate, getMe);
authRouter.patch('/me', authenticate, readBody(updateProfileSchema), updateMe);
