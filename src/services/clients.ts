import { supabase } from '@/services/supabase';
import { Client } from '@/types/db';

export async function getClients(): Promise<Client[]> {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Client[];
}

export async function addClient(client: Omit<Client, 'id' | 'created_at'>): Promise<Client> {
  const { data, error } = await supabase
    .from('clients')
    .insert([client])
    .select()
    .single();
  if (error) throw error;
  return data as Client;
}

export async function addClients(clients: Omit<Client, 'id' | 'created_at'>[]): Promise<number> {
  // Satu request per 500 baris supaya payload tetap kecil untuk file besar.
  let inserted = 0;
  for (let i = 0; i < clients.length; i += 500) {
    const { error } = await supabase.from('clients').insert(clients.slice(i, i + 500));
    if (error) throw new Error(`${error.message} (${inserted} client pertama sudah tersimpan)`);
    inserted += Math.min(500, clients.length - i);
  }
  return inserted;
}

export async function updateClient(id: string, updates: Partial<Client>): Promise<Client> {
  const { data, error } = await supabase
    .from('clients')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Client;
}

export async function deleteClient(id: string): Promise<void> {
  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', id);
  if (error) throw error;
}
