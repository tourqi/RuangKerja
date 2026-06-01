import { supabase } from './supabase';
import type { Invoice, InvoiceStatus, Payment } from '@/types/db';

export async function getInvoicesByProject(projectId: string): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('project_id', projectId)
    .order('invoice_date', { ascending: true });
  if (error) throw error;
  return data as Invoice[];
}

export async function getInvoices(): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Invoice[];
}

export async function getInvoiceById(id: string): Promise<Invoice> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as Invoice;
}

export async function generateInvoiceNumber(): Promise<string> {
  const now = new Date();
  const prefix = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-`;
  const { data } = await supabase
    .from('invoices')
    .select('invoice_number')
    .ilike('invoice_number', `${prefix}%`)
    .order('invoice_number', { ascending: false })
    .limit(1);
  const lastNum = data?.[0]?.invoice_number ? parseInt(data[0].invoice_number.slice(-3)) : 0;
  return `${prefix}${String(lastNum + 1).padStart(3, '0')}`;
}

export async function addInvoice(
  invoice: Omit<Invoice, 'id' | 'created_at' | 'paid_amount'>
): Promise<Invoice> {
  const { data, error } = await supabase
    .from('invoices')
    .insert([{ ...invoice, paid_amount: 0 }])
    .select()
    .single();
  if (error) throw error;
  return data as Invoice;
}

export async function updateInvoice(id: string, updates: Partial<Invoice>): Promise<Invoice> {
  const { data, error } = await supabase
    .from('invoices')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Invoice;
}

export async function deleteInvoice(id: string): Promise<void> {
  const { error } = await supabase.from('invoices').delete().eq('id', id);
  if (error) throw error;
}

export async function getAllPayments(): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .order('payment_date', { ascending: false });
  if (error) throw error;
  return data as Payment[];
}

export async function getPaymentsByInvoice(invoiceId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('payment_date', { ascending: false });
  if (error) throw error;
  return data as Payment[];
}

export async function addPayment(
  payment: Omit<Payment, 'id' | 'created_at'>
): Promise<Payment> {
  const { data, error } = await supabase
    .from('payments')
    .insert([payment])
    .select()
    .single();
  if (error) throw error;
  await recalcInvoiceStatus(payment.invoice_id);
  return data as Payment;
}

export async function deletePayment(id: string, invoiceId: string): Promise<void> {
  const { error } = await supabase.from('payments').delete().eq('id', id);
  if (error) throw error;
  await recalcInvoiceStatus(invoiceId);
}

export async function recalcInvoiceStatus(invoiceId: string): Promise<void> {
  const { data: invoice } = await supabase
    .from('invoices')
    .select('total_amount, due_date, status')
    .eq('id', invoiceId)
    .single();
  const { data: paymentsData } = await supabase
    .from('payments')
    .select('amount')
    .eq('invoice_id', invoiceId);

  const totalPaid = (paymentsData ?? []).reduce((sum: number, p: { amount: number }) => sum + p.amount, 0);
  const totalAmount = invoice?.total_amount ?? 0;
  const dueDate = invoice?.due_date ? new Date(invoice.due_date) : null;
  const now = new Date();

  let status: InvoiceStatus;
  if (totalPaid >= totalAmount && totalAmount > 0) {
    status = 'paid';
  } else if (totalPaid > 0) {
    status = 'partial';
  } else if (dueDate && dueDate < now) {
    status = 'overdue';
  } else {
    status = (invoice?.status === 'sent' ? 'sent' : 'draft') as InvoiceStatus;
  }

  await supabase
    .from('invoices')
    .update({ paid_amount: totalPaid, status })
    .eq('id', invoiceId);
}
