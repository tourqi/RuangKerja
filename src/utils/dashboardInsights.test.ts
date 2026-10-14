import { describe, expect, it } from 'vitest';
import { buildDashboard, periodFor, type DashboardInput } from './dashboardCalculations';
import { buildInsights } from './dashboardInsights';
import type { Invoice, Project } from '@/types/db';

const TODAY = '2026-10-11';

const base: DashboardInput = {
  leads: [], projects: [], invoices: [], payments: [], projectExpenses: [], generalExpenses: [],
  rabTotals: {}, clientNames: {},
};
const build = (input: Partial<DashboardInput>) => buildInsights(buildDashboard({ ...base, ...input }, periodFor('year', TODAY), TODAY));
const texts = (xs: { text: string }[]) => xs.map((x) => x.text).join(' | ');

describe('buildInsights', () => {
  it('stays silent when there is no data', () => {
    const i = build({});
    expect(i.cashflow).toEqual([]);
    expect(i.profit).toEqual([]);
    expect(i.aging).toEqual([]);
  });

  it('names deficit months and notes the running month in cash flow', () => {
    const i = build({
      payments: [{ id: 'p', invoice_id: 'x', amount: 100_000_000, payment_date: '2026-07-01', payment_method: 'transfer' }],
      projectExpenses: [{ id: 'e', project_id: 'x', tanggal: '2026-08-02', deskripsi: '', kategori: 'material', jumlah: 30_000_000 }],
    });
    expect(texts(i.cashflow)).toContain('di Agu (selisih Rp30 jt)');
    expect(texts(i.cashflow)).toContain('Okt masih berjalan');
    expect(texts(i.profit)).toContain('Material menyerap 30%');
  });

  it('points to the biggest overdue debtor', () => {
    const inv = (id: string, client: string, due: string, total: number): Invoice =>
      ({ id, invoice_number: id, client_id: client, total_amount: total, paid_amount: 0, status: 'sent', due_date: due });
    const i = build({
      clientNames: { a: 'Ibu Rachel', b: 'Ibu Siska' },
      invoices: [inv('1', 'a', '2026-01-10', 30_000_000), inv('2', 'a', '2026-09-30', 10_000_000), inv('3', 'b', '2026-09-01', 10_000_000)],
    });
    expect(i.aging[0]).toMatchObject({ tone: 'danger' });
    expect(texts(i.aging)).toContain('80% piutang lewat tempo ada di Ibu Rachel (2 invoice');
  });

  it('suggests billing when progress runs ahead of invoices', () => {
    const project: Project = { id: 'p', name: 'Kitchen', status: 'Planning', progress: 80, value: 100_000_000 };
    const i = build({
      projects: [project],
      invoices: [{ id: 'i', project_id: 'p', invoice_number: 'INV', total_amount: 50_000_000, paid_amount: 50_000_000, status: 'paid' }],
    });
    expect(texts(i.billing)).toContain('Kitchen sudah 80% selesai tapi baru ditagih 50%, jadi masih bisa ditagih sekitar Rp30 jt');
  });
});
