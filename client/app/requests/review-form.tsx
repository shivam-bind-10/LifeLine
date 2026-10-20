'use client';

import { useState, type FormEvent } from 'react';
import { useAuth } from '../auth/auth-provider';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export type ReviewSummary = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isReviewSummary(value: unknown): value is ReviewSummary {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.rating === 'number' &&
    Number.isInteger(value.rating) &&
    value.rating >= 1 &&
    value.rating <= 5 &&
    (typeof value.comment === 'string' || value.comment === null) &&
    typeof value.createdAt === 'string' &&
    Number.isFinite(Date.parse(value.createdAt))
  );
}

function errorMessage(body: unknown, status: number) {
  if (
    isRecord(body) &&
    isRecord(body.error) &&
    typeof body.error.message === 'string'
  ) {
    return body.error.message;
  }
  return `Request failed (HTTP ${status}).`;
}

export function ReviewForm({
  requestId,
  revieweeName,
  initialReview,
}: {
  requestId: string;
  revieweeName: string;
  initialReview: ReviewSummary | null;
}) {
  const { apiFetch } = useAuth();
  const [review, setReview] = useState(initialReview);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const response = await apiFetch(
        `${API_URL}/requests/${encodeURIComponent(requestId)}/reviews`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rating, comment }),
        },
      );
      const body: unknown = await response.json();
      if (!response.ok) {
        throw new Error(errorMessage(body, response.status));
      }
      if (!isRecord(body) || !isReviewSummary(body.review)) {
        throw new Error('The server returned an invalid review.');
      }
      setReview(body.review);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Unable to submit your review.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (review) {
    return (
      <p className="mt-4 rounded-md border border-border bg-surface p-3 text-sm">
        You rated {revieweeName} {review.rating} out of 5
        {review.comment ? `: "${review.comment}"` : '.'}
      </p>
    );
  }

  return (
    <form
      className="mt-4 space-y-3 rounded-lg border border-border bg-surface p-4"
      onSubmit={submitReview}
    >
      <h3 className="font-semibold">Review {revieweeName}</h3>
      {error && (
        <p className="text-sm text-warning-foreground" role="alert">
          {error}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
        <label className="text-sm font-medium" htmlFor={`rating-${requestId}`}>
          Rating
          <select
            className="ml-2 rounded-md border border-border bg-background px-2 py-1.5"
            id={`rating-${requestId}`}
            onChange={(event) => setRating(Number(event.target.value))}
            value={rating}
          >
            {[5, 4, 3, 2, 1].map((value) => (
              <option key={value} value={value}>
                {value} / 5
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium" htmlFor={`comment-${requestId}`}>
          Comment (optional)
          <textarea
            className="mt-1 min-h-20 w-full rounded-md border border-border bg-background px-3 py-2"
            id={`comment-${requestId}`}
            maxLength={1000}
            onChange={(event) => setComment(event.target.value)}
            value={comment}
          />
        </label>
      </div>
      <button
        className="rounded-md border border-border px-4 py-2 text-sm font-semibold hover:bg-background disabled:opacity-60"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? 'Submitting...' : 'Submit review'}
      </button>
    </form>
  );
}
