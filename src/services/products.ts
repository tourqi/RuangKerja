import { supabase } from './supabase';
import type { LeadProduct, LeadProductUsage, LeadStatus, Product } from '@/types/db';

export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('kode', { ascending: true });
  if (error) throw error;
  return data as Product[];
}

export async function addProduct(product: Omit<Product, 'id' | 'created_at'>): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .insert([product])
    .select()
    .single();
  if (error) throw error;
  return data as Product;
}

export async function updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Product;
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) {
    // 23503 = foreign key violation: produk sudah dipakai di lead_products.
    if (error.code === '23503') {
      throw new Error('Produk sudah dipakai di lead. Nonaktifkan produk ini lewat Edit.');
    }
    throw error;
  }
}

export async function getLeadProducts(leadId: string): Promise<LeadProduct[]> {
  const { data, error } = await supabase
    .from('lead_products')
    .select('*')
    .eq('lead_id', leadId);
  if (error) throw error;
  return data as LeadProduct[];
}

export async function getProductUsage(): Promise<LeadProductUsage[]> {
  const { data, error } = await supabase
    .from('lead_products')
    .select('lead_id, product_id, dibeli, leads(status)');
  if (error) throw error;
  const rows = data as unknown as (LeadProduct & { leads: { status: LeadStatus } | null })[];
  return rows.map(({ leads, ...row }) => ({ ...row, lead_status: leads?.status }));
}

/** Samakan produk lead dengan pilihan form. Produk yang tetap dipilih mempertahankan status dibeli-nya. */
export async function setLeadProducts(leadId: string, productIds: string[], isDealWon: boolean): Promise<void> {
  const existing = await getLeadProducts(leadId);
  const existingIds = new Set(existing.map((row) => row.product_id));
  const selectedIds = new Set(productIds);

  const removed = existing.filter((row) => !selectedIds.has(row.product_id)).map((row) => row.product_id);
  if (removed.length > 0) {
    const { error } = await supabase
      .from('lead_products')
      .delete()
      .eq('lead_id', leadId)
      .in('product_id', removed);
    if (error) throw error;
  }

  const added = productIds.filter((id) => !existingIds.has(id));
  if (added.length > 0) {
    const { error } = await supabase
      .from('lead_products')
      .insert(added.map((product_id) => ({ lead_id: leadId, product_id, dibeli: isDealWon })));
    if (error) throw error;
  }
}

export async function setLeadProductDibeli(leadId: string, productId: string, dibeli: boolean): Promise<void> {
  const { error } = await supabase
    .from('lead_products')
    .update({ dibeli })
    .eq('lead_id', leadId)
    .eq('product_id', productId);
  if (error) throw error;
}
