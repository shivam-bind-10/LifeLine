import { Router, type RequestHandler } from 'express';
import { Category, Role, Urgency } from '../../generated/prisma/client.js';
import { authenticate, requireRoles } from '../../middleware/authenticate.js';
import { prisma } from '../../lib/prisma.js';
import { z } from 'zod';

const bloodGroups = [
  'O_POSITIVE',
  'A_POSITIVE',
  'B_POSITIVE',
  'AB_POSITIVE',
  'O_NEGATIVE',
  'A_NEGATIVE',
  'B_NEGATIVE',
  'AB_NEGATIVE',
] as const;

const categoryValues = Object.values(Category);
const urgencyValues = Object.values(Urgency);

const createRequestSchema = z
  .object({
    category: z.enum(categoryValues),
    urgency: z.enum(urgencyValues),
    title: z.string().trim().min(5).max(120),
    details: z.string().trim().max(2000).optional(),
    bloodGroup: z.enum(bloodGroups).optional(),
    units: z.number().int().min(1).max(100).optional(),
    lat: z.number().finite().min(-90).max(90),
    lng: z.number().finite().min(-180).max(180),
    addressText: z.string().trim().max(200).optional(),
    neededBy: z.iso
      .datetime({ offset: true })
      .transform((value) => new Date(value))
      .refine(
        (value) => value > new Date(),
        'Needed by must be in the future.',
      ),
  })
  .strict()
  .refine(
    (body) =>
      body.category !== Category.BLOOD ||
      (body.bloodGroup !== undefined && body.units !== undefined),
    {
      message: 'Blood requests must include a blood group and number of units.',
      path: ['bloodGroup'],
    },
  );

const listQuerySchema = z
  .object({
    category: z.enum(categoryValues).optional(),
    urgency: z.enum(urgencyValues).optional(),
    cursor: z.string().min(1).max(32).optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict();

function validationError(
  response: Parameters<RequestHandler>[1],
  message: string,
) {
  response.status(400).json({
    error: { code: 'VALIDATION_ERROR', message },
  });
}

const listOpenRequests: RequestHandler = async (request, response) => {
  const parsed = listQuerySchema.safeParse(request.query);
  if (!parsed.success) {
    validationError(
      response,
      parsed.error.issues[0]?.message ?? 'The query parameters are invalid.',
    );
    return;
  }

  const { category, urgency, cursor, limit } = parsed.data;
  const requests = await prisma.request.findMany({
    where: {
      status: 'OPEN',
      ...(category ? { category } : {}),
      ...(urgency ? { urgency } : {}),
    },
    orderBy: [{ urgency: 'asc' }, { neededBy: 'asc' }, { id: 'asc' }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      category: true,
      urgency: true,
      title: true,
      lat: true,
      lng: true,
      neededBy: true,
      createdAt: true,
    },
  });
  const hasMore = requests.length > limit;
  const page = hasMore ? requests.slice(0, limit) : requests;

  response.status(200).json({
    requests: page.map((item) => ({
      ...item,
      lat: Math.round(item.lat * 100) / 100,
      lng: Math.round(item.lng * 100) / 100,
    })),
    nextCursor: hasMore ? page[page.length - 1]?.id : null,
  });
};

const createRequest: RequestHandler = async (request, response) => {
  const parsed = createRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    validationError(
      response,
      parsed.error.issues[0]?.message ?? 'The request body is invalid.',
    );
    return;
  }

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

  const { details, ...fields } = parsed.data;
  const created = await prisma.request.create({
    data: {
      ...fields,
      requesterId: userId,
      ...(details ? { details: { description: details } } : {}),
    },
    select: {
      id: true,
      category: true,
      urgency: true,
      title: true,
      details: true,
      bloodGroup: true,
      units: true,
      lat: true,
      lng: true,
      addressText: true,
      neededBy: true,
      status: true,
      createdAt: true,
    },
  });

  response.status(201).json({ request: created });
};

const listMyRequests: RequestHandler = async (request, response) => {
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

  const requests = await prisma.request.findMany({
    where: { requesterId: userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      category: true,
      urgency: true,
      title: true,
      details: true,
      bloodGroup: true,
      units: true,
      lat: true,
      lng: true,
      addressText: true,
      neededBy: true,
      status: true,
      createdAt: true,
    },
  });
  response.status(200).json({ requests });
};

export const requestRouter = Router();

requestRouter.get('/', listOpenRequests);
requestRouter.post(
  '/',
  authenticate,
  requireRoles(Role.REQUESTER),
  createRequest,
);
requestRouter.get('/mine', authenticate, listMyRequests);
