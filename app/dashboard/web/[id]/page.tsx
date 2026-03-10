import { redirect } from 'next/navigation';

interface DashboardWebRedirectProps {
  params: Promise<{ id: string }>;
}

export default async function DashboardWebRedirectPage({ params }: DashboardWebRedirectProps) {
  const { id } = await params;
  redirect(`/web/${id}`);
}
