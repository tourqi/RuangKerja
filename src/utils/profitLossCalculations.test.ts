import { describe, expect, it } from 'vitest';
import { computeProjectProfitLoss } from './profitLossCalculations';

const getValue = (p: { id: string; value?: number }) => p.value ?? 0;

describe('computeProjectProfitLoss', () => {
  it('excludes projects with no expenses and no collected payments', () => {
    const projects = [{ id: 'p1', value: 1000000 }];
    const { rows } = computeProjectProfitLoss(projects, [], [], getValue);
    expect(rows).toHaveLength(0);
  });

  it('includes a project once it has expenses even with no payments yet', () => {
    const projects = [{ id: 'p1', value: 1000000 }];
    const expenses = [{ project_id: 'p1', jumlah: 200000 }];
    const { rows } = computeProjectProfitLoss(projects, expenses, [], getValue);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ pengeluaran: 200000, terkumpul: 0, laba: -200000, margin: null });
  });

  it('computes laba as terkumpul minus pengeluaran', () => {
    const projects = [{ id: 'p1', value: 1000000 }];
    const expenses = [{ project_id: 'p1', jumlah: 300000 }];
    const invoices = [{ project_id: 'p1', total_amount: 1000000, paid_amount: 700000 }];
    const { rows } = computeProjectProfitLoss(projects, expenses, invoices, getValue);
    expect(rows[0]).toMatchObject({ tagihan: 1000000, terkumpul: 700000, pengeluaran: 300000, laba: 400000 });
  });

  it('computes margin as a rounded percentage of laba over terkumpul', () => {
    const projects = [{ id: 'p1', value: 1000000 }];
    const expenses = [{ project_id: 'p1', jumlah: 250000 }];
    const invoices = [{ project_id: 'p1', total_amount: 1000000, paid_amount: 1000000 }];
    const { rows } = computeProjectProfitLoss(projects, expenses, invoices, getValue);
    // laba = 750000, terkumpul = 1000000 -> 75%
    expect(rows[0].margin).toBe(75);
  });

  it('margin is null (not 0 or negative) when nothing has been collected yet', () => {
    const projects = [{ id: 'p1', value: 1000000 }];
    const expenses = [{ project_id: 'p1', jumlah: 100000 }];
    const { rows } = computeProjectProfitLoss(projects, expenses, [], getValue);
    expect(rows[0].margin).toBeNull();
  });

  it('sums expenses/payments across multiple invoices and expense entries per project', () => {
    const projects = [{ id: 'p1', value: 0 }];
    const expenses = [
      { project_id: 'p1', jumlah: 100000 },
      { project_id: 'p1', jumlah: 50000 },
    ];
    const invoices = [
      { project_id: 'p1', total_amount: 500000, paid_amount: 200000 },
      { project_id: 'p1', total_amount: 500000, paid_amount: 100000 },
    ];
    const { rows } = computeProjectProfitLoss(projects, expenses, invoices, getValue);
    expect(rows[0]).toMatchObject({ tagihan: 1000000, terkumpul: 300000, pengeluaran: 150000, laba: 150000 });
  });

  it('ignores invoices with no project_id (general/unlinked invoices)', () => {
    const projects = [{ id: 'p1', value: 0 }];
    const expenses = [{ project_id: 'p1', jumlah: 50000 }];
    const invoices = [{ total_amount: 999999, paid_amount: 999999 }];
    const { rows } = computeProjectProfitLoss(projects, expenses, invoices, getValue);
    expect(rows[0].terkumpul).toBe(0);
  });

  it('sorts rows by laba descending (most profitable first)', () => {
    const projects = [
      { id: 'p1', value: 0 },
      { id: 'p2', value: 0 },
    ];
    const expenses = [
      { project_id: 'p1', jumlah: 900000 },
      { project_id: 'p2', jumlah: 100000 },
    ];
    const invoices = [
      { project_id: 'p1', total_amount: 1000000, paid_amount: 1000000 },
      { project_id: 'p2', total_amount: 1000000, paid_amount: 1000000 },
    ];
    const { rows } = computeProjectProfitLoss(projects, expenses, invoices, getValue);
    expect(rows.map((r) => r.project.id)).toEqual(['p2', 'p1']);
  });

  it('computes totals across all included projects', () => {
    const projects = [
      { id: 'p1', value: 0 },
      { id: 'p2', value: 0 },
    ];
    const expenses = [
      { project_id: 'p1', jumlah: 200000 },
      { project_id: 'p2', jumlah: 100000 },
    ];
    const invoices = [
      { project_id: 'p1', total_amount: 1000000, paid_amount: 500000 },
      { project_id: 'p2', total_amount: 1000000, paid_amount: 500000 },
    ];
    const { totals } = computeProjectProfitLoss(projects, expenses, invoices, getValue);
    expect(totals).toMatchObject({
      totalTerkumpul: 1000000,
      totalPengeluaran: 300000,
      totalLaba: 700000,
      totalMargin: 70,
    });
  });

  it('totalMargin is 0 (not NaN) when nothing has been collected across any project', () => {
    const projects = [{ id: 'p1', value: 0 }];
    const expenses = [{ project_id: 'p1', jumlah: 100000 }];
    const { totals } = computeProjectProfitLoss(projects, expenses, [], getValue);
    expect(totals.totalMargin).toBe(0);
    expect(Number.isNaN(totals.totalMargin)).toBe(false);
  });
});
