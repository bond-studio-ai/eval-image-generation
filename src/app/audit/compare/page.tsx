import type { Metadata } from 'next';
import { AuditComparePage } from './audit-compare-page';

export const metadata: Metadata = {
  title: 'Audit Comparison',
  description: 'Compare image generation runs side by side.',
};

export const dynamic = 'force-dynamic';

export default function Page() {
  return <AuditComparePage />;
}
