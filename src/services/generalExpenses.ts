import { supabase } from './supabase';
import type { GeneralExpense } from '@/types/db';

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
  return data as GeneralExpense;
}

export async function deleteGeneralExpense(id: string): Promise<void> {
  const { error } = await supabase.from('general_expenses').delete().eq('id', id);
  if (error) throw error;
}
