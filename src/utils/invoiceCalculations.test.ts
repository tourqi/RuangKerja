import { describe, expect, it } from 'vitest';
import { sumPayments, determineInvoiceStatus } from './invoiceCalculations';

describe('sumPayments', () => {
  it('sums payment amounts', () => {
    expect(sumPayments([{ amount: 100000 }, { amount: 50000 }])).toBe(150000);
  });

  it('returns 0 for no payments', () => {
    expect(sumPayments([])).toBe(0);
  });
});

describe('determineInvoiceStatus', () => {
  const now = new Date('2026-07-15T00:00:00Z');

  it('is paid when totalPaid covers totalAmount exactly', () => {
    expect(
      determineInvoiceStatus({ totalPaid: 1000000, totalAmount: 1000000, dueDate: null, now })
    ).toBe('paid');
  });

  it('is paid when totalPaid exceeds totalAmount (overpayment)', () => {
    expect(
      determineInvoiceStatus({ totalPaid: 1200000, totalAmount: 1000000, dueDate: null, now })
    ).toBe('paid');
  });

  it('is not paid when totalAmount is 0 even if totalPaid is 0 (avoids false "paid" on empty invoice)', () => {
    expect(
      determineInvoiceStatus({ totalPaid: 0, totalAmount: 0, dueDate: null, currentStatus: 'draft', now })
    ).toBe('draft');
  });

  it('is partial when some but not all has been paid', () => {
    expect(
      determineInvoiceStatus({ totalPaid: 400000, totalAmount: 1000000, dueDate: null, now })
    ).toBe('partial');
  });

  it('partial takes priority over overdue when a due date has passed but payment exists', () => {
    const pastDue = new Date('2026-01-01T00:00:00Z');
    expect(
      determineInvoiceStatus({ totalPaid: 400000, totalAmount: 1000000, dueDate: pastDue, now })
    ).toBe('partial');
  });

  it('is overdue when nothing paid and due date has passed', () => {
    const pastDue = new Date('2026-01-01T00:00:00Z');
    expect(
      determineInvoiceStatus({ totalPaid: 0, totalAmount: 1000000, dueDate: pastDue, now })
    ).toBe('overdue');
  });

  it('is not overdue when nothing paid but due date is in the future', () => {
    const futureDue = new Date('2026-12-01T00:00:00Z');
    expect(
      determineInvoiceStatus({ totalPaid: 0, totalAmount: 1000000, dueDate: futureDue, currentStatus: 'sent', now })
    ).toBe('sent');
  });

  it('falls back to draft when nothing paid, no due date, and current status is not sent', () => {
    expect(
      determineInvoiceStatus({ totalPaid: 0, totalAmount: 1000000, dueDate: null, currentStatus: 'draft', now })
    ).toBe('draft');
  });

  it('preserves sent status when nothing paid, no due date, and current status is sent', () => {
    expect(
      determineInvoiceStatus({ totalPaid: 0, totalAmount: 1000000, dueDate: null, currentStatus: 'sent', now })
    ).toBe('sent');
  });
});
