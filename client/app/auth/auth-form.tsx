'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { useAuth } from './auth-provider';

type Mode = 'login' | 'register';

export function AuthForm() {
  const { user, isLoading, sessionError, signIn, register, signOut } =
    useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') ?? '');
    const password = String(formData.get('password') ?? '');
    try {
      if (mode === 'login') {
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
                  }}
                  type="button"
                >
                  {option === 'login' ? 'Sign in' : 'Create account'}
                </button>
              ))}
            </div>

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
              <button
                className="w-full rounded-md bg-brand-700 px-5 py-3 font-semibold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting
                  ? 'Please wait...'
                  : mode === 'login'
                    ? 'Sign in'
                    : 'Create account'}
              </button>
            </form>
          </>
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
