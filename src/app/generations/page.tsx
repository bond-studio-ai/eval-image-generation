import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Generations',
  description: 'Browse and review generated images.',
};

export default function GenerationsPage() {
  redirect('/executions?tab=generations');
}
