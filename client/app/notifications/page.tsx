import type { Metadata } from 'next';
import { SiteHeader } from '../site-header';
import { NotificationInbox } from './notification-inbox';

export const metadata: Metadata = {
  title: 'Notifications | LifeLine',
};

export default function NotificationsPage() {
  return (
    <main className="min-h-screen">
      <SiteHeader />
      <NotificationInbox />
    </main>
  );
}
