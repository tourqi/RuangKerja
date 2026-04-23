import ClientProfile from "@/features/clients/ClientProfile";

export default async function ClientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ClientProfile clientId={id} />;
}
