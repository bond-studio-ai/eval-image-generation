import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function GenerateRedirectPage({ params }: PageProps) {
  const { id } = await params;
  redirect(`/generate?prompt_version_id=${id}`);
}
