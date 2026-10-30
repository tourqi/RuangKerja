import { supabase } from './supabase';
import { logActivity } from './activityLog';
import type { WarrantyFollowup, WarrantyKondisi } from '@/types/db';

export async function getWarrantyFollowups(): Promise<WarrantyFollowup[]> {
  const { data, error } = await supabase
    .from('warranty_followups')
    .select('*')
    .order('due_date', { ascending: true });
  if (error) throw error;
  return data as WarrantyFollowup[];
}

export async function completeWarrantyFollowup(
  followup: WarrantyFollowup,
  result: { kondisi: WarrantyKondisi; tugas_selesai: boolean; catatan?: string }
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('warranty_followups')
    .update({ ...result, status: 'done', done_at: new Date().toISOString(), done_by: user?.id })
    .eq('id', followup.id);
  if (error) throw error;
  await logActivity({
    entity_type: 'project',
    entity_id: followup.project_id,
    action: 'updated',
    description: `Follow-up garansi bulan ke-${followup.bulan_ke} dicatat: ${result.kondisi === 'aman' ? 'aman' : 'ada keluhan'}`,
  });
}

export async function skipWarrantyFollowup(followup: WarrantyFollowup): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('warranty_followups')
    .update({ status: 'skipped', done_at: new Date().toISOString(), done_by: user?.id })
    .eq('id', followup.id);
  if (error) throw error;
  await logActivity({
    entity_type: 'project',
    entity_id: followup.project_id,
    action: 'updated',
    description: `Follow-up garansi bulan ke-${followup.bulan_ke} dilewati`,
  });
}
