'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Category =
  'BLOOD' | 'OXYGEN' | 'AMBULANCE' | 'HOSPITAL_BED' | 'MEDICINE' | 'OTHER';
type Urgency = 'CRITICAL' | 'HIGH' | 'NORMAL';

type HelpRequest = {
  id: string;
  category: Category;
  urgency: Urgency;
  title: string;
  lat: number;
  lng: number;
  neededBy: string;
  createdAt: string;
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
const categories: Array<{ value: Category | ''; label: string }> = [
  { value: '', label: 'All needs' },
  { value: 'BLOOD', label: 'Blood' },
  { value: 'OXYGEN', label: 'Oxygen' },
  { value: 'AMBULANCE', label: 'Ambulance' },
  { value: 'HOSPITAL_BED', label: 'Hospital bed' },
  { value: 'MEDICINE', label: 'Medicine' },
  { value: 'OTHER', label: 'Other' },
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function isHelpRequest(value: unknown): value is HelpRequest {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string' &&
    'category' in value &&
    typeof value.category === 'string' &&
    categories.some((item) => item.value === value.category) &&
    'urgency' in value &&
    (value.urgency === 'CRITICAL' ||
      value.urgency === 'HIGH' ||
      value.urgency === 'NORMAL') &&
    'title' in value &&
    typeof value.title === 'string' &&
    'lat' in value &&
    typeof value.lat === 'number' &&
    Number.isFinite(value.lat) &&
    'lng' in value &&
    typeof value.lng === 'number' &&
    Number.isFinite(value.lng) &&
    'neededBy' in value &&
    typeof value.neededBy === 'string' &&
    Number.isFinite(Date.parse(value.neededBy)) &&
    'createdAt' in value &&
    typeof value.createdAt === 'string' &&
    Number.isFinite(Date.parse(value.createdAt))
  );
}

export function RequestFeed() {
  const [category, setCategory] = useState<Category | ''>('');
  const [requests, setRequests] = useState<HelpRequest[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({ limit: '30' });
    if (category) {
      query.set('category', category);
    }

    setIsLoading(true);
    setError(null);
    void fetch(`${API_URL}/requests?${query}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Could not load requests (HTTP ${response.status}).`);
        }
        const body: unknown = await response.json();
        const page = parseRequestPage(body);
        setRequests(page.requests);
        setNextCursor(page.nextCursor);
      })
      .catch((loadError: unknown) => {
        if (loadError instanceof Error && loadError.name === 'AbortError') {
          return;
        }
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Unable to load requests. Please try again.',
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [category]);

  async function loadMore() {
    if (!nextCursor) {
      return;
    }
    setIsLoadingMore(true);
    setError(null);
    const query = new URLSearchParams({ limit: '30', cursor: nextCursor });
    if (category) {
      query.set('category', category);
    }
    try {
      const response = await fetch(`${API_URL}/requests?${query}`);
      if (!response.ok) {
        throw new Error(
          `Could not load more requests (HTTP ${response.status}).`,
        );
      }
      const page = parseRequestPage(await response.json());
      setRequests((current) => [...current, ...page.requests]);
      setNextCursor(page.nextCursor);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Unable to load more requests.',
      );
    } finally {
      setIsLoadingMore(false);
    }
  }

  return (
    <section className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-700">
            Community requests
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            People who need help
          </h1>
          <p className="mt-3 max-w-2xl text-muted">
            Browse open requests and connect with people nearby. Locations are
            approximate to help protect privacy.
          </p>
        </div>
        <Link
          className="rounded-md bg-brand-700 px-5 py-3 font-semibold text-white hover:bg-brand-800"
          href="/requests/new"
        >
          Request help
        </Link>
      </div>

      <div className="mt-8 max-w-xs">
        <label className="mb-1.5 block text-sm font-medium" htmlFor="category">
          Filter by need
        </label>
        <select
          className="w-full rounded-md border border-border bg-background px-3 py-2.5"
          id="category"
          onChange={(event) => setCategory(event.target.value as Category | '')}
          value={category}
        >
          {categories.map((item) => (
            <option key={item.value || 'ALL'} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <p className="mt-8 text-sm text-muted" role="status">
          Loading open requests...
        </p>
      ) : error ? (
        <p
          className="mt-8 rounded-md border border-warning-border bg-warning-surface p-4 text-sm text-warning-foreground"
          role="alert"
        >
          {error}
        </p>
      ) : requests.length === 0 ? (
        <p className="mt-8 rounded-lg border border-border bg-surface p-6 text-muted">
          No open requests in this category right now. Please check back soon.
        </p>
      ) : (
        <ul className="mt-8 grid gap-4 md:grid-cols-2">
          {requests.map((item) => (
            <li
              className="rounded-xl border border-border bg-background p-5"
              key={item.id}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    {item.category.replaceAll('_', ' ')}
                  </p>
                  <h2 className="mt-2 text-lg font-semibold">{item.title}</h2>
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                    item.urgency === 'CRITICAL'
                      ? 'bg-warning-surface text-warning-foreground'
                      : 'bg-surface text-foreground'
                  }`}
                >
                  {item.urgency.toLowerCase()}
                </span>
              </div>
              <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-muted">Approx. area</dt>
                  <dd className="mt-1 font-medium">
                    {item.lat.toFixed(2)}, {item.lng.toFixed(2)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Needed by</dt>
                  <dd className="mt-1 font-medium">
                    {formatDate(item.neededBy)}
                  </dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}
      {!isLoading && !error && nextCursor && (
        <button
          className="mt-6 rounded-md border border-border px-5 py-3 font-semibold hover:bg-surface disabled:opacity-60"
          disabled={isLoadingMore}
          onClick={() => void loadMore()}
          type="button"
        >
          {isLoadingMore ? 'Loading...' : 'Load more requests'}
        </button>
      )}
    </section>
  );
}

function parseRequestPage(value: unknown): {
  requests: HelpRequest[];
  nextCursor: string | null;
} {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('requests' in value) ||
    !Array.isArray(value.requests) ||
    !value.requests.every(isHelpRequest) ||
    !('nextCursor' in value) ||
    (value.nextCursor !== null && typeof value.nextCursor !== 'string')
  ) {
    throw new Error('The server returned an invalid request list.');
  }
  return {
    requests: value.requests,
    nextCursor: value.nextCursor,
  };
}
