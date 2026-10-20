import Link from 'next/link';
import { SessionActions } from './session-actions';

export default function Home() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link
            className="text-sm font-bold uppercase tracking-[0.2em] text-brand-700"
            href="/"
          >
            LifeLine
          </Link>
          <SessionActions />
        </nav>
      </header>
      <main className="mx-auto flex min-h-[calc(100vh-73px)] max-w-6xl flex-col justify-center px-6 py-16">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">
          Help is closer than you think
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
          Find help when every minute matters.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
          Connect with nearby volunteers and providers for blood, oxygen,
          transport, hospital beds, and medicine.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            className="rounded-md bg-brand-700 px-5 py-3 font-semibold text-white hover:bg-brand-800"
            href="/requests/new"
          >
            Request Help
          </Link>
          <Link
            className="rounded-md border border-border px-5 py-3 font-semibold text-foreground hover:bg-surface"
            href="/requests"
          >
            Browse Requests
          </Link>
          <Link
            className="rounded-md border border-border px-5 py-3 font-semibold text-foreground hover:bg-surface"
            href="/auth"
          >
            Become a Helper
          </Link>
        </div>
        <aside
          aria-label="Emergency services disclaimer"
          className="mt-12 max-w-3xl rounded-lg border border-warning-border bg-warning-surface p-5 text-sm leading-6 text-warning-foreground"
        >
          LifeLine connects volunteers and providers. It is not a replacement
          for emergency services. In a life-threatening emergency call 112
          (India) or 108 (ambulance) immediately.
        </aside>
      </main>
    </div>
  );
}
