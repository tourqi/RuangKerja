import { describe, expect, it } from 'vitest';
import { buildDashboard, chartMonths, periodFor, shortIDR, type DashboardInput } from './dashboardCalculations';
import type { Invoice, Lead, Project } from '@/types/db';

const TODAY = '2026-10-11';

const base: DashboardInput = {
  leads: [], projects: [], invoices: [], payments: [], projectExpenses: [], generalExpenses: [],
  rabTotals: {}, clientNames: {},
};

describe('periodFor', () => {
  it('builds year, quarter and 30-day ranges ending today', () => {
    expect(periodFor('year', TODAY)).toEqual({ from: '2026-01-01', to: TODAY });
    expect(periodFor('quarter', TODAY)).toEqual({ from: '2026-10-01', to: TODAY });
    expect(periodFor('30d', TODAY)).toEqual({ from: '2026-09-12', to: TODAY });
  });
});

describe('chartMonths', () => {
  it('shows at least 6 months, crossing the year boundary', () => {
    const m = chartMonths({ from: '2026-02-10', to: '2026-03-05' });
    expect(m.map((x) => x.key)).toEqual(['2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03']);
  });
  it('covers the whole period when it is longer than 6 months', () => {
    expect(chartMonths({ from: '2026-01-01', to: '2026-10-11' })).toHaveLength(10);
  });
});

describe('buildDashboard', () => {
  it('only counts money inside the period', () => {
    const d = buildDashboard({
      ...base,
      payments: [
        { id: 'p1', invoice_id: 'i', amount: 100, payment_date: '2026-08-01', payment_method: 'transfer' },
        { id: 'p2', invoice_id: 'i', amount: 999, payment_date: '2025-12-31', payment_method: 'transfer' },
      ],
      projectExpenses: [{ id: 'e1', project_id: 'x', tanggal: '2026-08-02', deskripsi: '', kategori: 'material', jumlah: 30 }],
      generalExpenses: [{ id: 'g1', tanggal: '2026-08-03', deskripsi: '', kategori: 'gaji', jumlah: 20 }],
    }, periodFor('year', TODAY), TODAY);
    expect(d.kasMasuk).toBe(100);
    expect(d.labaKotor).toBe(70);
    expect(d.labaBersih).toBe(50);
    expect(d.months.find((m) => m.key === '2026-08')).toMatchObject({ masuk: 100, keluar: 50 });
  });

  it('buckets outstanding invoices by days past due', () => {
    const inv = (id: string, due: string, total: number, paid = 0): Invoice =>
      ({ id, invoice_number: id, total_amount: total, paid_amount: paid, status: 'sent', due_date: due });
    const d = buildDashboard({
      ...base,
      invoices: [inv('a', '2026-10-20', 10), inv('b', '2026-08-28', 54, 20), inv('c', '2026-08-03', 40), { ...inv('d', '2026-01-01', 5), status: 'paid' }],
    }, periodFor('year', TODAY), TODAY);
    expect(d.aging.map((b) => b.amount)).toEqual([10, 0, 34, 40, 0]);
    expect(d.piutang).toBe(84);
    expect(d.piutangLewat).toBe(74);
    expect(d.actions[0].title).toContain('Rp40');
  });

  it('flags projects whose cost runs ahead of progress and over-billed contracts', () => {
    const project: Project = { id: 'p', name: 'Kantor', status: 'Planning', progress: 5, value: 100, start_date: '2026-08-16', deadline: '2026-08-31' };
    const d = buildDashboard({
      ...base,
      projects: [project],
      projectExpenses: [{ id: 'e', project_id: 'p', tanggal: '2026-08-16', deskripsi: '', kategori: 'jasa', jumlah: 60 }],
      invoices: [{ id: 'i', project_id: 'p', invoice_number: 'INV', total_amount: 150, paid_amount: 150, status: 'paid' }],
    }, periodFor('year', TODAY), TODAY);
    expect(d.health[0]).toMatchObject({ costPct: 60, daysLate: 41 });
    expect(d.belumDitagih).toBe(0);
    expect(d.actions.map((a) => a.title).join('|')).toMatch(/biaya 60% kontrak.*\|.*tagihan 150%/);
  });

  it('computes win rate and closing time from leads closed in the period', () => {
    const lead = (status: Lead['status'], created: string, closed?: string, deal?: number): Lead =>
      ({ id: Math.random().toString(), client_id: 'c', status, created_at: created, closed_at: closed, nominal_deal: deal, source: 'Referral' });
    const d = buildDashboard({
      ...base,
      leads: [lead('Deal Won', '2026-06-20', '2026-08-01', 50), lead('Deal Won', '2026-07-15', '2026-08-05', 50), lead('Deal Lost', '2026-07-10', '2026-07-20'), lead('Survey', '2026-08-05')],
    }, periodFor('year', TODAY), TODAY);
    expect(d.winRate).toBeCloseTo(66.67, 1);
    expect(d.avgCloseDays).toBe(31.5);
    expect(d.nilaiDeal).toBe(100);
    expect(d.sources[0]).toEqual({ source: 'Referral', won: 2, open: 1, lost: 1 });
  });
});

describe('shortIDR', () => {
  it('abbreviates rupiah amounts', () => {
    expect(shortIDR(40_000_000)).toBe('Rp40 jt');
    expect(shortIDR(312_500_000)).toBe('Rp312,5 jt');
    expect(shortIDR(-28_400_000)).toBe('−Rp28,4 jt');
  });
});
