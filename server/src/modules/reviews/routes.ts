import { Router, type RequestHandler } from 'express';
import { Role } from '../../generated/prisma/client.js';
import { authenticate, requireRoles } from '../../middleware/authenticate.js';
import { prisma } from '../../lib/prisma.js';
import { z } from 'zod';

const requestIdSchema = z.string().min(1).max(32);

const reviewSchema = z
  .object({
    rating: z.number().int().min(1).max(5),
    comment: z
      .string()
      .trim()
      .max(1000)
      .optional()
      .transform((value) => value || undefined),
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

const listReviews: RequestHandler = async (request, response) => {
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
    item.status !== 'FULFILLED'
  ) {
    response.status(404).json({
      error: {
        code: 'REQUEST_NOT_FOUND',
        message: 'The fulfilled request was not found.',
      },
    });
    return;
  }

  const reviews = await prisma.review.findMany({
    where: { requestId: parsedId.data },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      reviewerId: true,
      revieweeId: true,
      rating: true,
      comment: true,
      createdAt: true,
      reviewer: { select: { name: true } },
      reviewee: { select: { name: true } },
    },
  });
  response.status(200).json({
    reviews: reviews.map((review) => ({
      id: review.id,
      reviewerId: review.reviewerId,
      revieweeId: review.revieweeId,
      reviewerName: review.reviewer.name,
      revieweeName: review.reviewee.name,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt,
    })),
  });
};

const createReview: RequestHandler = async (request, response) => {
  const userId = request.authUser?.id;
  const parsedId = requestIdSchema.safeParse(request.params.id);
  const parsedBody = reviewSchema.safeParse(request.body);
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
      parsedBody.error.issues[0]?.message ?? 'The review is invalid.',
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
  if (item.status !== 'FULFILLED' || !item.acceptedById) {
    response.status(409).json({
      error: {
        code: 'REQUEST_NOT_REVIEWABLE',
        message: 'Only fulfilled requests can be reviewed.',
      },
    });
    return;
  }

  const existingReview = await prisma.review.findUnique({
    where: {
      requestId_reviewerId: {
        requestId: parsedId.data,
        reviewerId: userId,
      },
    },
    select: { id: true },
  });
  if (existingReview) {
    response.status(409).json({
      error: {
        code: 'REVIEW_ALREADY_SUBMITTED',
        message: 'You have already reviewed this request.',
      },
    });
    return;
  }

  const review = await prisma.review.create({
    data: {
      requestId: parsedId.data,
      reviewerId: userId,
      revieweeId:
        item.requesterId === userId ? item.acceptedById : item.requesterId,
      rating: parsedBody.data.rating,
      ...(parsedBody.data.comment ? { comment: parsedBody.data.comment } : {}),
    },
    select: {
      id: true,
      reviewerId: true,
      revieweeId: true,
      rating: true,
      comment: true,
      createdAt: true,
      reviewer: { select: { name: true } },
      reviewee: { select: { name: true } },
    },
  });
  response.status(201).json({
    review: {
      id: review.id,
      reviewerId: review.reviewerId,
      revieweeId: review.revieweeId,
      reviewerName: review.reviewer.name,
      revieweeName: review.reviewee.name,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt,
    },
  });
};

export const reviewRouter = Router();

reviewRouter.get('/:id/reviews', authenticate, listReviews);
reviewRouter.post(
  '/:id/reviews',
  authenticate,
  requireRoles(Role.REQUESTER, Role.HELPER),
  createReview,
);
