import type { InvoiceStatus } from '@/types/db';

export function sumPayments(payments: { amount: number }[]): number {
  return payments.reduce((sum, p) => sum + p.amount, 0);
}

export interface DetermineInvoiceStatusInput {
  totalPaid: number;
  totalAmount: number;
  dueDate: Date | null;
  currentStatus?: InvoiceStatus;
  now?: Date;
}

export function determineInvoiceStatus({
  totalPaid,
  totalAmount,
  dueDate,
  currentStatus,
  now = new Date(),
}: DetermineInvoiceStatusInput): InvoiceStatus {
  if (totalPaid >= totalAmount && totalAmount > 0) {
    return 'paid';
  }
  if (totalPaid > 0) {
    return 'partial';
  }
  if (dueDate && dueDate < now) {
    return 'overdue';
  }
  return currentStatus === 'sent' ? 'sent' : 'draft';
}
