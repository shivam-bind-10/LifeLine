import type { Metadata } from 'next';
import Link from 'next/link';
import { NotificationInbox } from './notification-inbox';

export const metadata: Metadata = {
  title: 'Notifications | LifeLine',
};

export default function NotificationsPage() {
  return (
    <main className="min-h-screen">
      <header className="border-b border-border">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link
            className="text-sm font-bold uppercase tracking-[0.2em] text-brand-700"
            href="/"
          >
            LifeLine
          </Link>
          <Link
            className="text-sm font-semibold hover:text-brand-700"
            href="/requests"
          >
            Browse requests
          </Link>
        </nav>
      </header>
      <NotificationInbox />
    </main>
  );
}
