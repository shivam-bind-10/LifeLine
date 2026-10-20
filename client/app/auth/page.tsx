import type { Metadata } from 'next';
import { AuthForm } from './auth-form';

export const metadata: Metadata = {
  title: 'Sign in or create an account | LifeLine',
};

export default function AuthPage() {
  return <AuthForm />;
}
