import type { Metadata } from 'next';
import { AuthForm } from './auth-form';

export const metadata: Metadata = {
  title: 'Sign in or create an account | LifeLine',
};

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode } = await searchParams;
  return <AuthForm initialMode={mode === 'register' ? 'register' : 'login'} />;
}
