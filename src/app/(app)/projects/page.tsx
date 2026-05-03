import { Suspense } from "react";
import ProjectsTable from "@/features/projects/ProjectsTable";

export default function ProjectsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
        <p className="text-sm text-gray-500 mt-1">Kelola proyek interior dan progres pengerjaannya</p>
      </div>
      <Suspense>
        <ProjectsTable />
      </Suspense>
    </div>
  );
}
