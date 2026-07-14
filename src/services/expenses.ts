import { supabase } from './supabase';
import type { ProjectExpense } from '@/types/db';
import { logActivity } from './activityLog';

export async function getAllExpenses(): Promise<ProjectExpense[]> {
  const { data, error } = await supabase
    .from('project_expenses')
    .select('*')
    .order('tanggal', { ascending: false });
  if (error) throw error;
  return data as ProjectExpense[];
}

export async function getExpenses(projectId: string): Promise<ProjectExpense[]> {
  const { data, error } = await supabase
    .from('project_expenses')
    .select('*')
    .eq('project_id', projectId)
    .order('tanggal', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as ProjectExpense[];
}

export async function addExpense(expense: Omit<ProjectExpense, 'id' | 'created_at'>): Promise<void> {
  const { error } = await supabase.from('project_expenses').insert([expense]);
  if (error) throw error;
  await logActivity({
    entity_type: 'expense',
    entity_id: expense.project_id,
    action: 'created',
    description: `Pengeluaran ditambahkan: ${expense.deskripsi} (Rp${expense.jumlah.toLocaleString('id-ID')})`,
  });
}

export async function updateExpense(id: string, updates: Partial<ProjectExpense>): Promise<void> {
  const { data: existing } = await supabase
    .from('project_expenses')
    .select('project_id, deskripsi')
    .eq('id', id)
    .single();
  const { error } = await supabase.from('project_expenses').update(updates).eq('id', id);
  if (error) throw error;
  await logActivity({
    entity_type: 'expense',
    entity_id: updates.project_id ?? existing?.project_id ?? id,
    action: 'updated',
    description: `Pengeluaran diperbarui: ${updates.deskripsi ?? existing?.deskripsi ?? ''}`,
  });
}

export async function deleteExpense(id: string): Promise<void> {
  const { data: existing } = await supabase
    .from('project_expenses')
    .select('project_id, deskripsi')
    .eq('id', id)
    .single();
  const { error } = await supabase.from('project_expenses').delete().eq('id', id);
  if (error) throw error;
  await logActivity({
    entity_type: 'expense',
    entity_id: existing?.project_id ?? id,
    action: 'deleted',
    description: `Pengeluaran dihapus${existing?.deskripsi ? `: ${existing.deskripsi}` : ''}`,
  });
}
