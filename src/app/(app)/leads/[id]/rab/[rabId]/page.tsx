import RabEditor from "@/features/rab/RabEditor";

export default async function RabEditorPage({
  params,
}: {
  params: Promise<{ id: string; rabId: string }>;
}) {
  const { id, rabId } = await params;
  return <RabEditor leadId={id} rabId={rabId} />;
}
