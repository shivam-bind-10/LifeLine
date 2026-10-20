import type { Metadata } from 'next';
import { SiteHeader } from '../../../site-header';
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
      <SiteHeader />
      <MessageThread requestId={id} />
    </main>
  );
}
