import { supabase } from '@/services/supabase';
import { Project, ProjectStatus } from '@/types/db';
import { logActivity } from '@/services/activityLog';

export async function getProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Project[];
}

export async function addProject(project: Omit<Project, 'id' | 'created_at'>): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .insert([project])
    .select()
    .single();
  if (error) throw error;
  await logActivity({
    entity_type: 'project',
    entity_id: data.id,
    action: 'created',
    description: `Project baru dibuat: ${project.name}`,
  });
  return data as Project;
}

export async function updateProject(id: string, updates: Partial<Project>): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  await logActivity({
    entity_type: 'project',
    entity_id: id,
    action: updates.status ? 'status_changed' : 'updated',
    description: updates.status ? `Status diubah menjadi ${updates.status}` : 'Project diperbarui',
  });
  return data as Project;
}

export async function deleteProject(id: string): Promise<void> {
  const { data: existing } = await supabase
    .from('projects')
    .select('name')
    .eq('id', id)
    .single();
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id);
  if (error) throw error;
  await logActivity({
    entity_type: 'project',
    entity_id: id,
    action: 'deleted',
    description: `Project dihapus${existing?.name ? `: ${existing.name}` : ''}`,
  });
}
