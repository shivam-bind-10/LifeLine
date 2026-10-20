'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { useAuth } from './auth-provider';

type Mode = 'login' | 'register' | 'forgot';
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export function AuthForm() {
  const { user, isLoading, sessionError, signIn, register, signOut } =
    useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') ?? '');
    const password = String(formData.get('password') ?? '');
    try {
      if (mode === 'forgot') {
        const response = await fetch(`${API_URL}/auth/forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        const body: unknown = await response.json();
        if (!response.ok) {
          const message =
            typeof body === 'object' &&
            body !== null &&
            'error' in body &&
            typeof body.error === 'object' &&
            body.error !== null &&
            'message' in body.error &&
            typeof body.error.message === 'string'
              ? body.error.message
              : `Password reset request failed (HTTP ${response.status}).`;
          throw new Error(message);
        }
        setNotice(
          'If an account exists for this email, password reset instructions will be sent.',
        );
      } else if (mode === 'login') {
        await signIn({ email, password });
      } else {
        await register({
          name: String(formData.get('name') ?? ''),
          email,
          password,
          role:
            String(formData.get('role')) === 'HELPER' ? 'HELPER' : 'REQUESTER',
        });
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Something went wrong. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

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
          {user
            ? "You're signed in"
            : mode === 'login'
              ? 'Welcome back'
              : 'Create your account'}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          {user
            ? 'Your account is ready. Continue to LifeLine to find or offer help.'
            : 'Connect with nearby volunteers and service providers.'}
        </p>

        {isLoading ? (
          <p className="mt-8 text-sm text-muted" role="status">
            Checking your session...
          </p>
        ) : user ? (
          <div className="mt-8">
            <p className="font-semibold">{user.name}</p>
            <p className="mt-1 text-sm text-muted">{user.email}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                className="rounded-md bg-brand-700 px-5 py-3 font-semibold text-white hover:bg-brand-800"
                href="/"
              >
                Continue
              </Link>
              <button
                className="rounded-md border border-border px-5 py-3 font-semibold hover:bg-surface"
                onClick={handleSignOut}
                type="button"
              >
                Sign out
              </button>
            </div>
          </div>
        ) : (
          <>
            {sessionError && (
              <p
                className="mt-5 rounded-md border border-warning-border bg-warning-surface p-3 text-sm text-warning-foreground"
                role="alert"
              >
                {sessionError}
              </p>
            )}
            {mode !== 'forgot' && (
              <div
                aria-label="Choose account action"
                className="mt-7 grid grid-cols-2 rounded-lg bg-surface p-1"
                role="group"
              >
                {(['login', 'register'] as const).map((option) => (
                  <button
                    aria-pressed={mode === option}
                    className={`rounded-md px-3 py-2 text-sm font-semibold ${
                      mode === option ? 'bg-background shadow-sm' : 'text-muted'
                    }`}
                    key={option}
                    onClick={() => {
                      setMode(option);
                      setError(null);
                      setNotice(null);
                    }}
                    type="button"
                  >
                    {option === 'login' ? 'Sign in' : 'Create account'}
                  </button>
                ))}
              </div>
            )}

            {mode === 'forgot' && (
              <p className="mt-5 text-sm text-muted">
                Enter your account email and we&apos;ll send a one-time reset
                link if an account matches.
              </p>
            )}
            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              {mode === 'register' && (
                <>
                  <div>
                    <label
                      className="mb-1.5 block text-sm font-medium"
                      htmlFor="name"
                    >
                      Your name
                    </label>
                    <input
                      autoComplete="name"
                      className="w-full rounded-md border border-border bg-background px-3 py-2.5"
                      id="name"
                      maxLength={100}
                      name="name"
                      required
                    />
                  </div>
                  <div>
                    <label
                      className="mb-1.5 block text-sm font-medium"
                      htmlFor="role"
                    >
                      I want to
                    </label>
                    <select
                      className="w-full rounded-md border border-border bg-background px-3 py-2.5"
                      id="role"
                      name="role"
                    >
                      <option value="REQUESTER">Find help</option>
                      <option value="HELPER">Offer help as a volunteer</option>
                    </select>
                  </div>
                </>
              )}
              <div>
                <label
                  className="mb-1.5 block text-sm font-medium"
                  htmlFor="email"
                >
                  Email
                </label>
                <input
                  autoComplete="email"
                  className="w-full rounded-md border border-border bg-background px-3 py-2.5"
                  id="email"
                  maxLength={254}
                  name="email"
                  required
                  type="email"
                />
              </div>
              {mode !== 'forgot' && (
                <div>
                  <label
                    className="mb-1.5 block text-sm font-medium"
                    htmlFor="password"
                  >
                    Password
                  </label>
                  <input
                    autoComplete={
                      mode === 'login' ? 'current-password' : 'new-password'
                    }
                    className="w-full rounded-md border border-border bg-background px-3 py-2.5"
                    id="password"
                    maxLength={128}
                    minLength={mode === 'register' ? 12 : 1}
                    name="password"
                    required
                    type="password"
                  />
                  {mode === 'register' && (
                    <p className="mt-1.5 text-xs text-muted">
                      Use at least 12 characters.
                    </p>
                  )}
                </div>
              )}
              <button
                className="w-full rounded-md bg-brand-700 px-5 py-3 font-semibold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting
                  ? 'Please wait...'
                  : mode === 'login'
                    ? 'Sign in'
                    : mode === 'register'
                      ? 'Create account'
                      : 'Send reset link'}
              </button>
            </form>
            {mode === 'login' && (
              <button
                className="mt-4 text-sm font-semibold text-brand-700 hover:text-brand-800"
                onClick={() => {
                  setMode('forgot');
                  setError(null);
                  setNotice(null);
                }}
                type="button"
              >
                Forgot password?
              </button>
            )}
            {mode === 'forgot' && (
              <button
                className="mt-4 text-sm font-semibold text-brand-700 hover:text-brand-800"
                onClick={() => {
                  setMode('login');
                  setError(null);
                  setNotice(null);
                }}
                type="button"
              >
                Back to sign in
              </button>
            )}
          </>
        )}

        {notice && (
          <p
            className="mt-5 rounded-md border border-border bg-surface p-3 text-sm"
            role="status"
          >
            {notice}
          </p>
        )}
        {error && (
          <p
            className="mt-5 rounded-md border border-warning-border bg-warning-surface p-3 text-sm text-warning-foreground"
            role="alert"
          >
            {error}
          </p>
        )}
        <p className="mt-7 border-t border-border pt-5 text-xs leading-5 text-muted">
          LifeLine is not a replacement for emergency services. In a
          life-threatening emergency, call 112 or 108.
        </p>
      </section>
    </main>
  );
}
