"use client";
import { getProjects } from "@/services/projects";
import { Project } from "@/types/db";
import { useFetch } from "./useFetch";

export function useProjects() {
  const { data: projects, loading, error, refetch } = useFetch<Project[]>(getProjects, []);
  return { projects, loading, error, refetch };
}
