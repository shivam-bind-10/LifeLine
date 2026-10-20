'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '../../auth/auth-provider';

type OwnRequest = {
  id: string;
  category: string;
  urgency: string;
  title: string;
  addressText: string | null;
  neededBy: string;
  status: string;
  createdAt: string;
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

function isOwnRequest(value: unknown): value is OwnRequest {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string' &&
    'category' in value &&
    typeof value.category === 'string' &&
    'urgency' in value &&
    typeof value.urgency === 'string' &&
    'title' in value &&
    typeof value.title === 'string' &&
    'addressText' in value &&
    (typeof value.addressText === 'string' || value.addressText === null) &&
    'neededBy' in value &&
    typeof value.neededBy === 'string' &&
    Number.isFinite(Date.parse(value.neededBy)) &&
    'status' in value &&
    typeof value.status === 'string' &&
    'createdAt' in value &&
    typeof value.createdAt === 'string' &&
    Number.isFinite(Date.parse(value.createdAt))
  );
}

export function MyRequests() {
  const { user, isLoading, apiFetch } = useAuth();
  const [requests, setRequests] = useState<OwnRequest[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading || !user) {
      return;
    }
    const controller = new AbortController();
    setIsFetching(true);
    void apiFetch(`${API_URL}/requests/mine`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          const body: unknown = await response.json();
          const message =
            typeof body === 'object' &&
            body !== null &&
            'error' in body &&
            typeof body.error === 'object' &&
            body.error !== null &&
            'message' in body.error &&
            typeof body.error.message === 'string'
              ? body.error.message
              : `Could not load your requests (HTTP ${response.status}).`;
          throw new Error(message);
        }
        const body: unknown = await response.json();
        if (
          typeof body !== 'object' ||
          body === null ||
          !('requests' in body) ||
          !Array.isArray(body.requests) ||
          !body.requests.every(isOwnRequest)
        ) {
          throw new Error('The server returned an invalid request list.');
        }
        setRequests(body.requests);
      })
      .catch((loadError: unknown) => {
        if (loadError instanceof Error && loadError.name === 'AbortError') {
          return;
        }
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Unable to load your requests.',
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsFetching(false);
        }
      });
    return () => controller.abort();
  }, [apiFetch, isLoading, user]);

  if (isLoading || (user && isFetching)) {
    return (
      <p className="mx-auto max-w-4xl px-6 py-12 text-muted" role="status">
        Loading your requests...
      </p>
    );
  }

  if (!user) {
    return (
      <section className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="text-3xl font-bold">Sign in to view your requests</h1>
        <Link
          className="mt-6 inline-block rounded-md bg-brand-700 px-5 py-3 font-semibold text-white"
          href="/auth"
        >
          Sign in
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-4xl px-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-700">
            Your account
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            My requests
          </h1>
        </div>
        <Link
          className="rounded-md bg-brand-700 px-5 py-3 font-semibold text-white hover:bg-brand-800"
          href="/requests/new"
        >
          New request
        </Link>
      </div>

      {error ? (
        <p
          className="mt-8 rounded-md border border-warning-border bg-warning-surface p-4 text-sm text-warning-foreground"
          role="alert"
        >
          {error}
        </p>
      ) : requests.length === 0 ? (
        <p className="mt-8 rounded-lg border border-border bg-surface p-6 text-muted">
          You haven&apos;t created any requests yet.
        </p>
      ) : (
        <ul className="mt-8 space-y-4">
          {requests.map((item) => (
            <li
              className="rounded-xl border border-border bg-background p-5"
              key={item.id}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    {item.category.replaceAll('_', ' ')}
                  </p>
                  <h2 className="mt-2 text-lg font-semibold">{item.title}</h2>
                </div>
                <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold">
                  {item.status.toLowerCase()}
                </span>
              </div>
              <p className="mt-4 text-sm text-muted">
                {item.urgency.toLowerCase()} priority · Needed by{' '}
                {new Intl.DateTimeFormat(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                }).format(new Date(item.neededBy))}
              </p>
              {item.addressText && (
                <p className="mt-2 text-sm text-muted">
                  Responder address: {item.addressText}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
