'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

function errorMessage(body: unknown, status: number) {
  if (
    typeof body === 'object' &&
    body !== null &&
    'error' in body &&
    typeof body.error === 'object' &&
    body.error !== null &&
    'message' in body.error &&
    typeof body.error.message === 'string'
  ) {
    return body.error.message;
  }
  return `Password reset failed (HTTP ${status}).`;
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password: String(form.get('password') ?? ''),
        }),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        throw new Error(errorMessage(body, response.status));
      }
      setIsComplete(true);
    } catch (resetError) {
      setError(
        resetError instanceof Error
          ? resetError.message
          : 'Unable to reset your password.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <section className="w-full max-w-md rounded-2xl border border-border bg-background p-7 shadow-sm sm:p-9">
        <Link
          className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700"
          href="/"
        >
          LifeLine
        </Link>
        <h1 className="mt-7 text-3xl font-bold tracking-tight">
          Reset your password
        </h1>
        {isComplete ? (
          <>
            <p className="mt-3 text-sm leading-6 text-muted" role="status">
              Your password has been updated. Sign in with your new password.
            </p>
            <Link
              className="mt-6 inline-block rounded-md bg-brand-700 px-5 py-3 font-semibold text-white hover:bg-brand-800"
              href="/auth"
            >
              Continue to sign in
            </Link>
          </>
        ) : !token ? (
          <>
            <p className="mt-3 text-sm leading-6 text-muted">
              This reset link is missing its token. Request a new link from the
              sign-in page.
            </p>
            <Link
              className="mt-6 inline-block rounded-md bg-brand-700 px-5 py-3 font-semibold text-white hover:bg-brand-800"
              href="/auth"
            >
              Return to sign in
            </Link>
          </>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <p className="text-sm leading-6 text-muted">
              Choose a new password with at least 12 characters.
            </p>
            <div>
              <label
                className="mb-1.5 block text-sm font-medium"
                htmlFor="new-password"
              >
                New password
              </label>
              <input
                autoComplete="new-password"
                className="w-full rounded-md border border-border bg-background px-3 py-2.5"
                id="new-password"
                maxLength={128}
                minLength={12}
                name="password"
                required
                type="password"
              />
            </div>
            {error && (
              <p
                className="rounded-md border border-warning-border bg-warning-surface p-3 text-sm text-warning-foreground"
                role="alert"
              >
                {error}
              </p>
            )}
            <button
              className="w-full rounded-md bg-brand-700 px-5 py-3 font-semibold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? 'Updating password...' : 'Update password'}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
