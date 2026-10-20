import type { Metadata } from 'next';
import { SiteHeader } from '../../site-header';
import { MyRequests } from './my-requests';

export const metadata: Metadata = {
  title: 'My requests | LifeLine',
};

export default function MyRequestsPage() {
  return (
    <main className="min-h-screen">
      <SiteHeader />
      <MyRequests />
    </main>
  );
}
