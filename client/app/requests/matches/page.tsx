import type { Metadata } from 'next';
import { SiteHeader } from '../../site-header';
import { HelperDashboard } from './helper-dashboard';

export const metadata: Metadata = {
  title: 'Volunteer availability and matches | LifeLine',
};

export default function MatchesPage() {
  return (
    <main className="min-h-screen">
      <SiteHeader />
      <HelperDashboard />
    </main>
  );
}
