import { supabase } from './supabase';

export interface ActivityLog {
  id: string;
  entity_type: 'lead' | 'project' | 'invoice';
  entity_id: string;
  user_id?: string;
  user_name?: string;
  action: string;
  description: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
}

export async function getActivityLogs(
  entityType: ActivityLog['entity_type'],
  entityId: string
): Promise<ActivityLog[]> {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data as ActivityLog[];
}

export async function logActivity(
  entry: Omit<ActivityLog, 'id' | 'created_at'>
): Promise<void> {
  await supabase.from('activity_logs').insert([entry]);
}
