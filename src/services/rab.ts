import { supabase } from '@/services/supabase';
import { Rab, RabGroup, RabItem } from '@/types/db';

export async function getRabByLead(leadId: string): Promise<Rab[]> {
  const { data, error } = await supabase
    .from('rab')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Rab[];
}

export async function getRabWithGroups(rabId: string): Promise<RabGroup[]> {
  const { data, error } = await supabase
    .from('rab_groups')
    .select('*, items:rab_items(*)')
    .eq('rab_id', rabId)
    .order('no', { ascending: true });
  if (error) throw error;
  return (data as RabGroup[]).map((g) => ({
    ...g,
    items: (g.items ?? []).sort((a, b) => a.sort_order - b.sort_order),
  }));
}

export async function addRab(leadId: string, nama: string): Promise<Rab> {
  const { data, error } = await supabase
    .from('rab')
    .insert([{ lead_id: leadId, nama, status: 'draft' }])
    .select()
    .single();
  if (error) throw error;
  return data as Rab;
}

export async function updateRab(id: string, updates: Partial<Pick<Rab, 'nama' | 'status' | 'diskon_persen' | 'diskon_nilai'>>): Promise<Rab> {
  const { data, error } = await supabase
    .from('rab')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Rab;
}

export async function deleteRab(id: string): Promise<void> {
  const { error } = await supabase.from('rab').delete().eq('id', id);
  if (error) throw error;
}

export async function addRabGroup(rabId: string, no: number, deskripsi: string): Promise<RabGroup> {
  const { data, error } = await supabase
    .from('rab_groups')
    .insert([{ rab_id: rabId, no, deskripsi }])
    .select()
    .single();
  if (error) throw error;
  return data as RabGroup;
}

export async function updateRabGroup(id: string, updates: Partial<Pick<RabGroup, 'no' | 'deskripsi'>>): Promise<RabGroup> {
  const { data, error } = await supabase
    .from('rab_groups')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as RabGroup;
}

export async function deleteRabGroup(id: string): Promise<void> {
  const { error } = await supabase.from('rab_groups').delete().eq('id', id);
  if (error) throw error;
}

export async function addRabItem(groupId: string, item: Omit<RabItem, 'id' | 'group_id' | 'created_at'>): Promise<RabItem> {
  const { data, error } = await supabase
    .from('rab_items')
    .insert([{ ...item, group_id: groupId }])
    .select()
    .single();
  if (error) throw error;
  return data as RabItem;
}

export async function updateRabItem(id: string, updates: Partial<Omit<RabItem, 'id' | 'group_id' | 'created_at'>>): Promise<RabItem> {
  const { data, error } = await supabase
    .from('rab_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as RabItem;
}

export async function deleteRabItem(id: string): Promise<void> {
  const { error } = await supabase.from('rab_items').delete().eq('id', id);
  if (error) throw error;
}
