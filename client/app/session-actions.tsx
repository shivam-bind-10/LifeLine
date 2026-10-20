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
          <span className="text-xs text-warning-foreground" role="alert">
            {error}
          </span>
        )}
        <Link
          className="rounded-md border border-border px-4 py-2 text-sm font-semibold hover:bg-surface"
          href="/auth"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {user.role === 'HELPER' && (
        <Link
          className="hidden text-sm font-semibold hover:text-brand-700 sm:inline"
          href="/requests/matches"
        >
          Volunteer matches
        </Link>
      )}
      <Link
        className="hidden text-sm font-semibold hover:text-brand-700 sm:inline"
        href="/notifications"
      >
        Notifications
      </Link>
      <Link
        className="hidden text-sm font-semibold hover:text-brand-700 sm:inline"
        href="/requests/mine"
      >
        My requests
      </Link>
      <span className="hidden text-sm text-muted sm:inline">
        Hi, {user.name}
      </span>
      <button
        className="rounded-md border border-border px-4 py-2 text-sm font-semibold hover:bg-surface"
        onClick={() => void handleSignOut()}
        type="button"
      >
        Sign out
      </button>
      {error && (
        <span className="text-xs text-warning-foreground" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
