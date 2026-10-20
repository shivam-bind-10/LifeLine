import type { Metadata } from 'next';
import { SiteHeader } from '../../site-header';
import { RequestForm } from './request-form';

export const metadata: Metadata = {
  title: 'Request emergency help | LifeLine',
};

export default function NewRequestPage() {
  return (
    <main className="min-h-screen">
      <SiteHeader />
      <RequestForm />
    </main>
  );
}
