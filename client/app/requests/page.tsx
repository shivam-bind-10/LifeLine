import type { Metadata } from 'next';
import { SiteHeader } from '../site-header';
import { RequestFeed } from './request-feed';

export const metadata: Metadata = {
  title: 'Browse help requests | LifeLine',
};

export default function RequestsPage() {
  return (
    <main className="min-h-screen">
      <SiteHeader />
      <RequestFeed />
    </main>
  );
}
