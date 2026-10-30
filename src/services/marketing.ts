import { supabase } from './supabase';
import type { MarketingExperiment, MarketingKpiMonthly } from '@/types/db';

export async function getMarketingKpi(): Promise<MarketingKpiMonthly[]> {
  const { data, error } = await supabase
    .from('marketing_kpi_monthly')
    .select('*')
    .order('bulan', { ascending: false });
  if (error) throw error;
  return data as MarketingKpiMonthly[];
}

export async function saveMarketingKpi(row: MarketingKpiMonthly): Promise<void> {
  const { error } = await supabase
    .from('marketing_kpi_monthly')
    .upsert([{ ...row, updated_at: new Date().toISOString() }], { onConflict: 'bulan' });
  if (error) throw error;
}

export async function getExperiments(): Promise<MarketingExperiment[]> {
  const { data, error } = await supabase
    .from('marketing_experiments')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data as MarketingExperiment[];
}

export async function addExperiment(experiment: Omit<MarketingExperiment, 'id' | 'created_at'>): Promise<void> {
  const { error } = await supabase.from('marketing_experiments').insert([experiment]);
  if (error) throw error;
}

export async function updateExperiment(id: string, updates: Partial<MarketingExperiment>): Promise<void> {
  const { error } = await supabase.from('marketing_experiments').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteExperiment(id: string): Promise<void> {
  const { error } = await supabase.from('marketing_experiments').delete().eq('id', id);
  if (error) throw error;
}
