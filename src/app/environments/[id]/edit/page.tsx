import { fetchEnvironmentById } from '@/lib/service-client';
import { notFound } from 'next/navigation';
import { EnvironmentForm } from '../../environment-form';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditEnvironmentPage({ params }: PageProps) {
  const { id } = await params;
  const env = await fetchEnvironmentById(id);
  if (!env) notFound();

  return (
    <EnvironmentForm
      initialData={{
        id: env.id,
        name: env.name,
        apiHostname: env.apiHostname,
        isActive: env.isActive,
      }}
    />
  );
}
