import ProjectDetail from "@/features/projects/ProjectDetail";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div>
      <ProjectDetail projectId={id} />
    </div>
  );
}
