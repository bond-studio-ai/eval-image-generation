import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Analytics',
  description: 'Analytics dashboards and reporting.',
};

export default function AnalyticsRedirect() {
  redirect('/');
}
