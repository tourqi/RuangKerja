import { supabase } from './supabase';
import { LeadContact } from '@/types/db';

export async function getLeadContacts(leadId: string): Promise<LeadContact[]> {
  const { data, error } = await supabase
    .from('lead_contacts')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as LeadContact[];
}

export async function addLeadContact(
  contact: Omit<LeadContact, 'id' | 'created_at' | 'created_by'>
): Promise<LeadContact> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('lead_contacts')
    .insert([{ ...contact, created_by: user?.id }])
    .select()
    .single();
  if (error) throw error;
  return data as LeadContact;
}
