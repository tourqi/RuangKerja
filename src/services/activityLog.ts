import { supabase } from './supabase';

export interface ActivityLog {
  id: string;
  entity_type: 'lead' | 'project' | 'invoice' | 'rab' | 'expense' | 'general_expense';
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
  entry: Omit<ActivityLog, 'id' | 'created_at' | 'user_id' | 'user_name'> &
    Partial<Pick<ActivityLog, 'user_id' | 'user_name'>>
): Promise<void> {
  let { user_id, user_name } = entry;
  if (!user_id) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      user_id = user.id;
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single();
      user_name = profile?.name ?? user.email ?? undefined;
    }
  }

  const { error } = await supabase.from('activity_logs').insert([{ ...entry, user_id, user_name }]);
  if (error) throw error;
}

export async function deleteActivityLog(id: string): Promise<void> {
  const { error } = await supabase.from('activity_logs').delete().eq('id', id);
  if (error) throw error;
}
