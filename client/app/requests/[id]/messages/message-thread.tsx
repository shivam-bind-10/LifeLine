'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../../../auth/auth-provider';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

type Message = {
  id: string;
  senderId: string;
  text: string;
  createdAt: string;
  sender: { name: string };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isMessage(value: unknown): value is Message {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.senderId === 'string' &&
    typeof value.text === 'string' &&
    typeof value.createdAt === 'string' &&
    Number.isFinite(Date.parse(value.createdAt)) &&
    isRecord(value.sender) &&
    typeof value.sender.name === 'string'
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

export function MessageThread({ requestId }: { requestId: string }) {
  const { user, isLoading, apiFetch } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMessages = useCallback(async () => {
    setError(null);
    setIsLoadingMessages(true);
    try {
      const response = await apiFetch(
        `${API_URL}/requests/${encodeURIComponent(requestId)}/messages`,
      );
      const body: unknown = await response.json();
      if (!response.ok) {
        throw new Error(errorMessage(body, response.status));
      }
      if (
        !isRecord(body) ||
        !Array.isArray(body.messages) ||
        !body.messages.every(isMessage)
      ) {
        throw new Error('The server returned an invalid message list.');
      }
      setMessages(body.messages);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Unable to load this conversation.',
      );
    } finally {
      setIsLoadingMessages(false);
    }
  }, [apiFetch, requestId]);

  useEffect(() => {
    if (!isLoading && user) {
      void loadMessages();
    }
  }, [isLoading, loadMessages, user]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSending(true);
    try {
      const response = await apiFetch(
        `${API_URL}/requests/${encodeURIComponent(requestId)}/messages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        },
      );
      const body: unknown = await response.json();
      if (!response.ok) {
        throw new Error(errorMessage(body, response.status));
      }
      if (!isRecord(body) || !isMessage(body.message)) {
        throw new Error('The server returned an invalid message.');
      }
      const sentMessage = body.message;
      setMessages((current) => [...current, sentMessage]);
      setText('');
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : 'Unable to send this message.',
      );
    } finally {
      setIsSending(false);
    }
  }

  if (isLoading || (user && isLoadingMessages && messages.length === 0)) {
    return (
      <p className="mx-auto max-w-4xl px-6 py-12 text-muted" role="status">
        Loading conversation...
      </p>
    );
  }

  if (!user) {
    return (
      <section className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="text-3xl font-bold">Sign in to view messages</h1>
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
    <section className="mx-auto max-w-4xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-700">
            Request conversation
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Messages</h1>
        </div>
        <button
          className="rounded-md border border-border px-4 py-2 text-sm font-semibold hover:bg-surface disabled:opacity-60"
          disabled={isLoadingMessages}
          onClick={() => void loadMessages()}
          type="button"
        >
          Refresh
        </button>
      </div>

      {error && (
        <p
          className="mt-6 rounded-md border border-warning-border bg-warning-surface p-4 text-sm text-warning-foreground"
          role="alert"
        >
          {error}
        </p>
      )}

      <ol
        aria-label="Conversation messages"
        className="mt-6 max-h-[55vh] space-y-3 overflow-y-auto rounded-xl border border-border bg-surface p-4"
      >
        {messages.length === 0 ? (
          <li className="py-8 text-center text-sm text-muted">
            No messages yet. Use this private conversation to coordinate help.
          </li>
        ) : (
          messages.map((message) => (
            <li
              className={`max-w-[85%] rounded-xl border border-border bg-background p-3 ${
                message.senderId === user.id ? 'ml-auto' : ''
              }`}
              key={message.id}
            >
              <p className="text-xs font-semibold text-brand-700">
                {message.senderId === user.id ? 'You' : message.sender.name}
              </p>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm">
                {message.text}
              </p>
              <time
                className="mt-2 block text-right text-xs text-muted"
                dateTime={message.createdAt}
              >
                {new Intl.DateTimeFormat(undefined, {
                  dateStyle: 'short',
                  timeStyle: 'short',
                }).format(new Date(message.createdAt))}
              </time>
            </li>
          ))
        )}
      </ol>

      <form className="mt-4 space-y-3" onSubmit={sendMessage}>
        <label className="sr-only" htmlFor="request-message">
          Write a message
        </label>
        <textarea
          className="min-h-24 w-full rounded-md border border-border bg-background px-3 py-2.5"
          id="request-message"
          maxLength={2000}
          onChange={(event) => setText(event.target.value)}
          placeholder="Write a message..."
          required
          value={text}
        />
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted">
            Messages are available only to the requester and assigned helper.
          </p>
          <button
            className="rounded-md bg-brand-700 px-5 py-3 font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
            disabled={isSending || !text.trim()}
            type="submit"
          >
            {isSending ? 'Sending...' : 'Send message'}
          </button>
        </div>
      </form>
    </section>
  );
}
