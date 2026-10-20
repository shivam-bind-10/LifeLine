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

const helperProfileSchema = z
  .object({
    offerings: z
      .array(z.enum(categoryValues))
      .min(1)
      .max(categoryValues.length),
    bloodGroup: z.enum(bloodGroups).optional(),
    lat: z.number().finite().min(-90).max(90),
    lng: z.number().finite().min(-180).max(180),
    radiusKm: z.number().finite().min(1).max(100),
    isAvailable: z.boolean(),
    availableFrom: z
      .string()
      .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/)
      .optional(),
    availableTo: z
      .string()
      .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/)
      .optional(),
  })
  .strict();

function radians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

function distanceKm(
  first: { lat: number; lng: number },
  second: { lat: number; lng: number },
) {
  const latitudeDelta = radians(second.lat - first.lat);
  const longitudeDelta = radians(second.lng - first.lng);
  const value =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(first.lat)) *
      Math.cos(radians(second.lat)) *
      Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

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

const updateHelperProfile: RequestHandler = async (request, response) => {
  const parsed = helperProfileSchema.safeParse(request.body);
  if (!parsed.success) {
    validationError(
      response,
      parsed.error.issues[0]?.message ?? 'The helper profile is invalid.',
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

  const profile = await prisma.helperProfile.upsert({
    where: { userId },
    create: { ...parsed.data, userId },
    update: parsed.data,
    select: {
      offerings: true,
      bloodGroup: true,
      lat: true,
      lng: true,
      radiusKm: true,
      isAvailable: true,
      availableFrom: true,
      availableTo: true,
    },
  });
  response.status(200).json({ profile });
};

const getHelperProfile: RequestHandler = async (request, response) => {
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

  const profile = await prisma.helperProfile.findUnique({
    where: { userId },
    select: {
      offerings: true,
      bloodGroup: true,
      lat: true,
      lng: true,
      radiusKm: true,
      isAvailable: true,
      availableFrom: true,
      availableTo: true,
    },
  });
  response.status(200).json({ profile });
};

const getHelperMatches: RequestHandler = async (request, response) => {
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

  const profile = await prisma.helperProfile.findUnique({
    where: { userId },
    select: {
      offerings: true,
      bloodGroup: true,
      lat: true,
      lng: true,
      radiusKm: true,
      isAvailable: true,
    },
  });
  if (!profile) {
    response.status(404).json({
      error: {
        code: 'HELPER_PROFILE_REQUIRED',
        message: 'Set up your helper profile to find matching requests.',
      },
    });
    return;
  }
  if (!profile.isAvailable) {
    response.status(200).json({ requests: [] });
    return;
  }

  const latitudeDelta = profile.radiusKm / 110.574;
  const longitudeDelta =
    profile.radiusKm /
    (111.32 * Math.max(Math.abs(Math.cos(radians(profile.lat))), 0.01));
  const minLongitude = profile.lng - longitudeDelta;
  const maxLongitude = profile.lng + longitudeDelta;
  const longitudeFilter =
    longitudeDelta >= 180
      ? {}
      : minLongitude < -180
        ? {
            OR: [
              { lng: { gte: minLongitude + 360 } },
              { lng: { lte: maxLongitude } },
            ],
          }
        : maxLongitude > 180
          ? {
              OR: [
                { lng: { gte: minLongitude } },
                { lng: { lte: maxLongitude - 360 } },
              ],
            }
          : { lng: { gte: minLongitude, lte: maxLongitude } };
  const requests = await prisma.request.findMany({
    where: {
      status: 'OPEN',
      neededBy: { gt: new Date() },
      category: { in: profile.offerings },
      requesterId: { not: userId },
      lat: {
        gte: Math.max(-90, profile.lat - latitudeDelta),
        lte: Math.min(90, profile.lat + latitudeDelta),
      },
      ...longitudeFilter,
    },
    orderBy: [{ urgency: 'asc' }, { neededBy: 'asc' }],
    take: 200,
    select: {
      id: true,
      category: true,
      urgency: true,
      title: true,
      bloodGroup: true,
      lat: true,
      lng: true,
      neededBy: true,
      createdAt: true,
    },
  });
  const matches = requests
    .map((item) => ({
      ...item,
      distanceKm: distanceKm(profile, item),
    }))
    .filter(
      (item) =>
        item.distanceKm <= profile.radiusKm &&
        (item.category !== Category.BLOOD ||
          (profile.bloodGroup !== null &&
            item.bloodGroup === profile.bloodGroup)),
    )
    .map((item) => ({
      id: item.id,
      category: item.category,
      urgency: item.urgency,
      title: item.title,
      lat: Math.round(item.lat * 100) / 100,
      lng: Math.round(item.lng * 100) / 100,
      neededBy: item.neededBy,
      createdAt: item.createdAt,
      distanceKm: Math.round(item.distanceKm * 10) / 10,
    }));

  response.status(200).json({ requests: matches });
};

const acceptRequest: RequestHandler = async (request, response) => {
  const userId = request.authUser?.id;
  const requestId = z.string().min(1).max(32).safeParse(request.params.id);
  if (!userId) {
    response.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'A valid access token is required.',
      },
    });
    return;
  }
  if (!requestId.success) {
    validationError(response, 'The request id is invalid.');
    return;
  }

  const profile = await prisma.helperProfile.findUnique({
    where: { userId },
    select: {
      offerings: true,
      bloodGroup: true,
      lat: true,
      lng: true,
      radiusKm: true,
      isAvailable: true,
    },
  });
  if (!profile) {
    response.status(404).json({
      error: {
        code: 'HELPER_PROFILE_REQUIRED',
        message: 'Set up your helper profile before accepting requests.',
      },
    });
    return;
  }
  if (!profile.isAvailable) {
    response.status(409).json({
      error: {
        code: 'HELPER_UNAVAILABLE',
        message:
          'Set your helper profile to available before accepting a request.',
      },
    });
    return;
  }

  const match = await prisma.request.findUnique({
    where: { id: requestId.data },
    select: {
      id: true,
      requesterId: true,
      category: true,
      bloodGroup: true,
      lat: true,
      lng: true,
    },
  });
  if (
    !match ||
    match.requesterId === userId ||
    !profile.offerings.includes(match.category) ||
    distanceKm(profile, match) > profile.radiusKm ||
    (match.category === Category.BLOOD &&
      (profile.bloodGroup === null || match.bloodGroup !== profile.bloodGroup))
  ) {
    response.status(404).json({
      error: {
        code: 'REQUEST_NOT_MATCHED',
        message: 'This request is not available as a match for your profile.',
      },
    });
    return;
  }

  const now = new Date();
  const accepted = await prisma.$transaction(async (transaction) => {
    const reserved = await transaction.helperProfile.updateMany({
      where: { userId, isAvailable: true },
      data: { isAvailable: false },
    });
    if (reserved.count !== 1) {
      return false;
    }

    const claimed = await transaction.request.updateMany({
      where: {
        id: requestId.data,
        status: 'OPEN',
        requesterId: { not: userId },
        neededBy: { gt: now },
      },
      data: { status: 'ACCEPTED', acceptedById: userId },
    });
    if (claimed.count !== 1) {
      await transaction.helperProfile.updateMany({
        where: { userId, isAvailable: false },
        data: { isAvailable: true },
      });
      return false;
    }

    await transaction.notification.create({
      data: {
        userId: match.requesterId,
        type: 'REQUEST_ACCEPTED',
        payload: { requestId: match.id, helperId: userId },
      },
    });
    return true;
  });

  if (!accepted) {
    response.status(409).json({
      error: {
        code: 'REQUEST_ALREADY_CLAIMED',
        message: 'This request is no longer open.',
      },
    });
    return;
  }

  response.status(200).json({
    message: 'Request accepted. Open it to view the private contact details.',
    requestId: match.id,
  });
};

const getRequestDetails: RequestHandler = async (request, response) => {
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
    validationError(response, 'The request id is invalid.');
    return;
  }

  const item = await prisma.request.findUnique({
    where: { id: parsedId.data },
    select: {
      id: true,
      requesterId: true,
      acceptedById: true,
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
      requester: { select: { name: true, phone: true } },
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

  const details = {
    id: item.id,
    category: item.category,
    urgency: item.urgency,
    title: item.title,
    details: item.details,
    bloodGroup: item.bloodGroup,
    units: item.units,
    lat: item.lat,
    lng: item.lng,
    addressText: item.addressText,
    neededBy: item.neededBy,
    status: item.status,
    createdAt: item.createdAt,
    requester: item.requester,
  };
  response.status(200).json({ request: details });
};

export const requestRouter = Router();

requestRouter.get('/', listOpenRequests);
requestRouter.get(
  '/matches',
  authenticate,
  requireRoles(Role.HELPER),
  getHelperMatches,
);
requestRouter.put(
  '/helper-profile',
  authenticate,
  requireRoles(Role.HELPER),
  updateHelperProfile,
);
requestRouter.get(
  '/helper-profile',
  authenticate,
  requireRoles(Role.HELPER),
  getHelperProfile,
);
requestRouter.post(
  '/',
  authenticate,
  requireRoles(Role.REQUESTER),
  createRequest,
);
requestRouter.get('/mine', authenticate, listMyRequests);
requestRouter.get('/:id', authenticate, getRequestDetails);
requestRouter.post(
  '/:id/accept',
  authenticate,
  requireRoles(Role.HELPER),
  acceptRequest,
);
