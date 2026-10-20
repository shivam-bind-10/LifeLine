'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from './auth/auth-provider';

export function SessionActions() {
  const { user, isLoading, signOut } = useAuth();
  const [error, setError] = useState<string | null>(null);

  async function handleSignOut() {
    setError(null);
    try {
      await signOut();
    } catch (signOutError) {
      setError(
        signOutError instanceof Error
          ? signOutError.message
          : 'Sign out failed. Please try again.',
      );
    }
  }

  if (isLoading) {
    return null;
  }

  if (!user) {
    return (
      <div className="flex items-center gap-3">
        {error && (
          <span
            className="hidden text-xs text-warning-foreground sm:inline"
            role="alert"
          >
            {error}
          </span>
        )}
        <Link
          className="hidden rounded-xl px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-surface sm:inline-flex"
          href="/auth"
        >
          Sign in
        </Link>
        <Link
          className="rounded-xl bg-forest-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-forest-700"
          href="/auth?mode=register"
        >
          Join LifeLine
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Link
        className="hidden text-sm font-semibold text-muted hover:text-forest-900 sm:inline"
        href="/notifications"
      >
        Notifications
      </Link>
      <Link
        className="hidden text-sm font-semibold text-muted hover:text-forest-900 sm:inline"
        href={user.role === 'HELPER' ? '/requests/matches' : '/requests/mine'}
      >
        {user.role === 'HELPER' ? 'Volunteer dashboard' : 'My requests'}
      </Link>
      <span className="hidden text-sm text-muted lg:inline">
        Hi, {user.name}
      </span>
      <button
        className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-semibold hover:bg-surface"
        onClick={() => void handleSignOut()}
        type="button"
      >
        Sign out
      </button>
      {error && (
        <span
          className="hidden text-xs text-warning-foreground sm:inline"
          role="alert"
        >
          {error}
        </span>
      )}
    </div>
  );
}
