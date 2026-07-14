import { supabase } from '@/services/supabase';
import { Lead } from '@/types/db';
import { logActivity } from '@/services/activityLog';

export async function getLeads(): Promise<Lead[]> {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Lead[];
}

export async function addLead(lead: Omit<Lead, 'id' | 'created_at'>): Promise<Lead> {
  const { data, error } = await supabase
    .from('leads')
    .insert([lead])
    .select()
    .single();
  if (error) throw error;
  await logActivity({
    entity_type: 'lead',
    entity_id: data.id,
    action: 'created',
    description: `Lead baru dibuat${lead.project_name ? `: ${lead.project_name}` : ''}`,
  });
  return data as Lead;
}

export async function updateLead(id: string, updates: Partial<Lead>): Promise<Lead> {
  const { data, error } = await supabase
    .from('leads')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  await logActivity({
    entity_type: 'lead',
    entity_id: id,
    action: updates.status ? 'status_changed' : 'updated',
    description: updates.status ? `Status diubah menjadi ${updates.status}` : 'Lead diperbarui',
  });
  return data as Lead;
}

export async function deleteLead(id: string): Promise<void> {
  const { data: existing } = await supabase
    .from('leads')
    .select('project_name')
    .eq('id', id)
    .single();
  const { error } = await supabase
    .from('leads')
    .delete()
    .eq('id', id);
  if (error) throw error;
  await logActivity({
    entity_type: 'lead',
    entity_id: id,
    action: 'deleted',
    description: `Lead dihapus${existing?.project_name ? `: ${existing.project_name}` : ''}`,
  });
}
