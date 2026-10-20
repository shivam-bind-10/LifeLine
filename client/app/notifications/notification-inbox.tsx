'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '../auth/auth-provider';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

type InboxItem = {
  id: string;
  type: string;
  payload: unknown;
  readAt: string | null;
  createdAt: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isInboxItem(value: unknown): value is InboxItem {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.type === 'string' &&
    'payload' in value &&
    (typeof value.readAt === 'string' || value.readAt === null) &&
    typeof value.createdAt === 'string' &&
    Number.isFinite(Date.parse(value.createdAt))
  );
}

function getErrorMessage(body: unknown, status: number) {
  if (
    isRecord(body) &&
    isRecord(body.error) &&
    typeof body.error.message === 'string'
  ) {
    return body.error.message;
  }
  return `Request failed (HTTP ${status}).`;
}

function notificationText(item: InboxItem) {
  const requestId =
    isRecord(item.payload) && typeof item.payload.requestId === 'string'
      ? item.payload.requestId
      : null;
  const requestLabel = requestId ? ` (${requestId})` : '';
  switch (item.type) {
    case 'REQUEST_ACCEPTED':
      return `A volunteer accepted your request${requestLabel}.`;
    case 'REQUEST_FULFILLED':
      return `Your request was marked fulfilled${requestLabel}.`;
    case 'REQUEST_CANCELLED':
      return `The requester cancelled the request${requestLabel}.`;
    default:
      return `LifeLine update${requestLabel}.`;
  }
}

export function NotificationInbox() {
  const { user, isLoading, apiFetch } = useAuth();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isFetching, setIsFetching] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadNotifications() {
    setIsFetching(true);
    setError(null);
    try {
      const response = await apiFetch(`${API_URL}/notifications?limit=50`);
      const body: unknown = await response.json();
      if (!response.ok) {
        throw new Error(getErrorMessage(body, response.status));
      }
      if (
        !isRecord(body) ||
        !Array.isArray(body.notifications) ||
        !body.notifications.every(isInboxItem) ||
        typeof body.unreadCount !== 'number' ||
        !Number.isInteger(body.unreadCount)
      ) {
        throw new Error('The server returned an invalid notification inbox.');
      }
      setItems(body.notifications);
      setUnreadCount(body.unreadCount);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Unable to load notifications.',
      );
    } finally {
      setIsFetching(false);
    }
  }

  useEffect(() => {
    if (!isLoading && user) {
      void loadNotifications();
    }
  }, [isLoading, user]);

  async function markRead(item: InboxItem) {
    if (item.readAt) {
      return;
    }
    setIsUpdating(true);
    setError(null);
    try {
      const response = await apiFetch(
        `${API_URL}/notifications/${encodeURIComponent(item.id)}/read`,
        { method: 'POST' },
      );
      const body: unknown = await response.json();
      if (!response.ok) {
        throw new Error(getErrorMessage(body, response.status));
      }
      setItems((current) =>
        current.map((entry) =>
          entry.id === item.id
            ? { ...entry, readAt: new Date().toISOString() }
            : entry,
        ),
      );
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : 'Unable to mark the notification as read.',
      );
    } finally {
      setIsUpdating(false);
    }
  }

  async function markAllRead() {
    if (unreadCount === 0) {
      return;
    }
    setIsUpdating(true);
    setError(null);
    try {
      const response = await apiFetch(`${API_URL}/notifications/read-all`, {
        method: 'POST',
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        throw new Error(getErrorMessage(body, response.status));
      }
      const readAt = new Date().toISOString();
      setItems((current) =>
        current.map((item) => ({ ...item, readAt: item.readAt ?? readAt })),
      );
      setUnreadCount(0);
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : 'Unable to mark notifications as read.',
      );
    } finally {
      setIsUpdating(false);
    }
  }

  if (isLoading || (user && isFetching && items.length === 0)) {
    return (
      <p className="mx-auto max-w-4xl px-6 py-12 text-muted" role="status">
        Loading notifications...
      </p>
    );
  }

  if (!user) {
    return (
      <section className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="text-3xl font-bold">Sign in to view notifications</h1>
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
            Notifications
          </h1>
          <p className="mt-2 text-sm text-muted">{unreadCount} unread</p>
        </div>
        <div className="flex gap-3">
          <button
            className="rounded-md border border-border px-4 py-2 text-sm font-semibold hover:bg-surface disabled:opacity-60"
            disabled={isFetching}
            onClick={() => void loadNotifications()}
            type="button"
          >
            Refresh
          </button>
          <button
            className="rounded-md bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
            disabled={isUpdating || unreadCount === 0}
            onClick={() => void markAllRead()}
            type="button"
          >
            Mark all read
          </button>
        </div>
      </div>

      {error && (
        <p
          className="mt-6 rounded-md border border-warning-border bg-warning-surface p-4 text-sm text-warning-foreground"
          role="alert"
        >
          {error}
        </p>
      )}

      {items.length === 0 ? (
        <p className="mt-8 rounded-lg border border-border bg-surface p-6 text-muted">
          You don&apos;t have any notifications yet.
        </p>
      ) : (
        <ul className="mt-8 space-y-3">
          {items.map((item) => (
            <li
              className={`flex flex-wrap items-start justify-between gap-4 rounded-xl border border-border p-5 ${
                item.readAt ? 'bg-background' : 'bg-surface'
              }`}
              key={item.id}
            >
              <div>
                <p className="font-medium">{notificationText(item)}</p>
                <p className="mt-2 text-sm text-muted">
                  {new Intl.DateTimeFormat(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  }).format(new Date(item.createdAt))}
                </p>
              </div>
              {item.readAt ? (
                <span className="text-xs text-muted">Read</span>
              ) : (
                <button
                  className="text-sm font-semibold text-brand-700 hover:text-brand-800 disabled:opacity-60"
                  disabled={isUpdating}
                  onClick={() => void markRead(item)}
                  type="button"
                >
                  Mark read
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
