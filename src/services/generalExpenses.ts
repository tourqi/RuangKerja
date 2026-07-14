import { supabase } from './supabase';
import type { GeneralExpense } from '@/types/db';
import { logActivity } from './activityLog';

export async function getGeneralExpenses(): Promise<GeneralExpense[]> {
  const { data, error } = await supabase
    .from('general_expenses')
    .select('*')
    .order('tanggal', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as GeneralExpense[];
}

export async function addGeneralExpense(
  expense: Omit<GeneralExpense, 'id' | 'created_at'>
): Promise<GeneralExpense> {
  const { data, error } = await supabase
    .from('general_expenses')
    .insert([expense])
    .select()
    .single();
  if (error) throw error;
  await logActivity({
    entity_type: 'general_expense',
    entity_id: data.id,
    action: 'created',
    description: `Pengeluaran umum ditambahkan: ${expense.deskripsi} (Rp${expense.jumlah.toLocaleString('id-ID')})`,
  });
  return data as GeneralExpense;
}

export async function updateGeneralExpense(
  id: string,
  updates: Partial<GeneralExpense>
): Promise<GeneralExpense> {
  const { data, error } = await supabase
    .from('general_expenses')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  await logActivity({
    entity_type: 'general_expense',
    entity_id: id,
    action: 'updated',
    description: `Pengeluaran umum diperbarui${updates.deskripsi ? `: ${updates.deskripsi}` : ''}`,
  });
  return data as GeneralExpense;
}

export async function deleteGeneralExpense(id: string): Promise<void> {
  const { data: existing } = await supabase
    .from('general_expenses')
    .select('deskripsi')
    .eq('id', id)
    .single();
  const { error } = await supabase.from('general_expenses').delete().eq('id', id);
  if (error) throw error;
  await logActivity({
    entity_type: 'general_expense',
    entity_id: id,
    action: 'deleted',
    description: `Pengeluaran umum dihapus${existing?.deskripsi ? `: ${existing.deskripsi}` : ''}`,
  });
}
