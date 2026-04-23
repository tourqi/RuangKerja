import { supabase } from './supabase';
import type { ProjectExpense } from '@/types/db';

export async function getExpenses(projectId: string): Promise<ProjectExpense[]> {
  const { data, error } = await supabase
    .from('project_expenses')
    .select('*')
    .eq('project_id', projectId)
    .order('tanggal', { ascending: false });
  if (error) throw error;
  return data as ProjectExpense[];
}

export async function addExpense(expense: Omit<ProjectExpense, 'id' | 'created_at'>): Promise<void> {
  const { error } = await supabase.from('project_expenses').insert([expense]);
  if (error) throw error;
}

export async function updateExpense(id: string, updates: Partial<ProjectExpense>): Promise<void> {
  const { error } = await supabase.from('project_expenses').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase.from('project_expenses').delete().eq('id', id);
  if (error) throw error;
}
