import RabEditor from "@/features/rab/RabEditor";

export default async function RabEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; rabId: string }>;
  searchParams: Promise<{ project?: string }>;
}) {
  const { id, rabId } = await params;
  const { project } = await searchParams;
  return <RabEditor leadId={id} rabId={rabId} projectId={project} />;
}
