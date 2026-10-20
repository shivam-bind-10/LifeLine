import type { Metadata } from 'next';
import Link from 'next/link';
import { MessageThread } from './message-thread';

export const metadata: Metadata = {
  title: 'Request messages | LifeLine',
};

export default async function RequestMessagesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main className="min-h-screen">
      <header className="border-b border-border">
        <nav className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link
            className="text-sm font-bold uppercase tracking-[0.2em] text-brand-700"
            href="/"
          >
            LifeLine
          </Link>
          <Link
            className="text-sm font-semibold hover:text-brand-700"
            href="/requests/mine"
          >
            My requests
          </Link>
        </nav>
      </header>
      <MessageThread requestId={id} />
    </main>
  );
}
