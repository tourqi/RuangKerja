import { supabase } from '@/services/supabase';
import { Rab, RabGroup, RabItem } from '@/types/db';
import { logActivity } from '@/services/activityLog';
import { grandTotal } from '@/utils/rabCalculations';

export async function getApprovedRabTotals(): Promise<Record<string, number>> {
  const { data: rabs, error: e1 } = await supabase
    .from('rab')
    .select('id, lead_id, diskon_nilai')
    .eq('status', 'approved');
  if (e1) throw e1;
  if (!rabs?.length) return {};

  const rabIds = rabs.map((r) => r.id);
  const { data: groups, error: e2 } = await supabase
    .from('rab_groups')
    .select('rab_id, rab_items(qty, harga)')
    .in('rab_id', rabIds);
  if (e2) throw e2;

  const grossByRab: Record<string, number> = {};
  for (const g of (groups ?? []) as Array<{ rab_id: string; rab_items: Array<{ qty: number; harga: number }> }>) {
    grossByRab[g.rab_id] = (grossByRab[g.rab_id] ?? 0) + grandTotal([{ items: g.rab_items ?? [] }]);
  }

  const totals: Record<string, number> = {};
  for (const rab of rabs as Array<{ id: string; lead_id: string; diskon_nilai?: number }>) {
    const net = (grossByRab[rab.id] ?? 0) - (rab.diskon_nilai ?? 0);
    totals[rab.lead_id] = (totals[rab.lead_id] ?? 0) + net;
  }
  return totals;
}

export async function getAllRabs(): Promise<Rab[]> {
  const { data, error } = await supabase
    .from('rab')
    .select('id, lead_id, nama, status, sent_at, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Rab[];
}

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
  await logActivity({
    entity_type: 'rab',
    entity_id: data.id,
    action: 'created',
    description: `RAB baru dibuat: ${nama}`,
  });
  return data as Rab;
}

export async function updateRab(id: string, updates: Partial<Pick<Rab, 'nama' | 'status' | 'opsi' | 'diskon_persen' | 'diskon_nilai' | 'skema_pembayaran'>>): Promise<Rab> {
  const { data, error } = await supabase
    .from('rab')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  await logActivity({
    entity_type: 'rab',
    entity_id: id,
    action: updates.status ? 'status_changed' : 'updated',
    description: updates.status ? `Status RAB diubah menjadi ${updates.status}` : 'RAB diperbarui',
  });
  return data as Rab;
}

export async function duplicateRab(rabId: string): Promise<Rab> {
  const { data: source, error: e0 } = await supabase
    .from('rab')
    .select('*')
    .eq('id', rabId)
    .single();
  if (e0) throw e0;

  const { data: newRab, error: e1 } = await supabase
    .from('rab')
    .insert([{
      lead_id: source.lead_id,
      nama: `${source.nama} (Copy)`,
      status: 'draft',
      diskon_persen: source.diskon_persen,
      diskon_nilai: source.diskon_nilai,
      skema_pembayaran: source.skema_pembayaran,
    }])
    .select()
    .single();
  if (e1) throw e1;

  const groups = await getRabWithGroups(rabId);
  await Promise.all(
    groups.map(async (g) => {
      const { data: newGroup, error: eg } = await supabase
        .from('rab_groups')
        .insert([{ rab_id: newRab.id, no: g.no, deskripsi: g.deskripsi }])
        .select()
        .single();
      if (eg) throw eg;

      const items = g.items ?? [];
      if (items.length === 0) return;
      const { error: ei } = await supabase.from('rab_items').insert(
        items.map((it) => ({
          group_id: newGroup.id,
          spesifikasi: it.spesifikasi,
          qty: it.qty,
          unit: it.unit,
          harga: it.harga,
          sort_order: it.sort_order,
          dimensi_p: it.dimensi_p,
          dimensi_l: it.dimensi_l,
        }))
      );
      if (ei) throw ei;
    })
  );

  await logActivity({
    entity_type: 'rab',
    entity_id: newRab.id,
    action: 'created',
    description: `RAB diduplikasi dari: ${source.nama}`,
  });

  return newRab as Rab;
}

export async function deleteRab(id: string): Promise<void> {
  const { data: existing } = await supabase
    .from('rab')
    .select('nama')
    .eq('id', id)
    .single();
  const { error } = await supabase.from('rab').delete().eq('id', id);
  if (error) throw error;
  await logActivity({
    entity_type: 'rab',
    entity_id: id,
    action: 'deleted',
    description: `RAB dihapus${existing?.nama ? `: ${existing.nama}` : ''}`,
  });
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
