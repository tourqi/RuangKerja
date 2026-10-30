import { describe, expect, it } from "vitest";
import {
  buildFunnel, buildKpi, buildLostReasons, buildSourceRows, isAskLead, normalizeLostReason, recentMonths,
} from "./marketingCalculations";
import type { Invoice, Lead, Payment, Rab } from "@/types/db";

const lead = (id: string, extra: Partial<Lead> = {}): Lead => ({
  id,
  client_id: "c",
  status: "New Lead",
  created_at: "2026-11-05",
  ...extra,
});

const rab = (lead_id: string, sent_at?: string): Rab => ({ id: `r-${lead_id}-${sent_at}`, lead_id, nama: "RAB", status: "sent", sent_at });

const payment = (invoice_id: string, amount: number, payment_date: string): Payment => ({
  id: `${invoice_id}-${payment_date}`,
  invoice_id,
  amount,
  payment_date,
  payment_method: "transfer",
});

const invoice = (id: string, extra: Partial<Invoice>): Invoice => ({
  id,
  invoice_number: id,
  total_amount: 0,
  paid_amount: 0,
  status: "sent",
  ...extra,
});

describe("recentMonths", () => {
  it("mundur melewati pergantian tahun, terbaru lebih dulu", () => {
    expect(recentMonths("2027-01-15", 3)).toEqual(["2027-01", "2026-12", "2026-11"]);
  });
});

describe("isAskLead", () => {
  it("tidak peka huruf besar dan spasi", () => {
    expect(isAskLead({ referred_by: " pt ask " })).toBe(true);
    expect(isAskLead({ referred_by: "Budi" })).toBe(false);
    expect(isAskLead({})).toBe(false);
  });
});

describe("buildFunnel", () => {
  it("menghitung tiap tahap di bulan terjadinya", () => {
    const leads = [
      lead("a", { survey_date: "2026-11-10" }),
      lead("b", { survey_date: "2026-11-12", status: "Deal Won", closed_at: "2026-12-01", nominal_deal: 10_000_000 }),
      lead("c"),
      lead("d"),
    ];
    const [dec, nov] = buildFunnel(leads, [rab("b", "2026-11-20")], ["2026-12", "2026-11"]);
    expect(nov).toMatchObject({ leads: 4, surveys: 2, sph: 1, won: 0, leadToSurvey: 0.5, surveyToSph: 0.5, sphToWon: 0 });
    expect(dec).toMatchObject({ leads: 0, won: 1, nilai: 10_000_000, leadToSurvey: null });
  });

  it("SPH satu lead dihitung sekali di bulan pertama", () => {
    const rows = buildFunnel([lead("a")], [rab("a", "2026-12-02"), rab("a", "2026-11-02")], ["2026-12", "2026-11"]);
    expect(rows.map((r) => r.sph)).toEqual([0, 1]);
  });

  it("mengabaikan SPH lead di luar filter", () => {
    expect(buildFunnel([lead("a")], [rab("x", "2026-11-02")], ["2026-11"])[0].sph).toBe(0);
  });

  it("Deal Won yang sudah dibatalkan tidak terhitung", () => {
    const leads = [lead("a", { status: "Deal Lost", closed_at: "2026-11-02", nominal_deal: 5 })];
    expect(buildFunnel(leads, [], ["2026-11"])[0]).toMatchObject({ won: 0, nilai: 0 });
  });
});

describe("buildSourceRows", () => {
  it("menghitung per sumber dan memisahkan PT ASK di dalam Referral", () => {
    const { rows, ask } = buildSourceRows([
      lead("a", { source: "Referral", referred_by: "PT ASK", status: "Deal Won", nominal_deal: 30 }),
      lead("b", { source: "Referral", status: "Deal Won", nominal_deal: 10 }),
      lead("c", { source: "Instagram", survey_date: "2026-11-01" }),
    ]);
    expect(rows.find((r) => r.source === "Referral")).toMatchObject({ leads: 2, won: 2, leadToWon: 1, nilai: 40, porsiNilai: 1 });
    expect(rows.find((r) => r.source === "Instagram")).toMatchObject({ leads: 1, surveys: 1, won: 0 });
    expect(ask).toMatchObject({ leads: 1, nilai: 30, porsiNilai: 0.75 });
  });

  it("sumber kosong atau tidak dikenal masuk Lainnya", () => {
    const { rows } = buildSourceRows([lead("a"), lead("b", { source: "Walk-in" })]);
    expect(rows.find((r) => r.source === "Lainnya")?.leads).toBe(2);
  });
});

describe("alasan lost", () => {
  it("menormalkan auto-lost dan teks bebas", () => {
    expect(normalizeLostReason("Auto-lost: no response after 3 follow-ups")).toBe("Tidak ada respons");
    expect(normalizeLostReason("Klien pindah kota")).toBe("Lainnya");
    expect(normalizeLostReason("Harga")).toBe("Harga");
  });

  it("mengurutkan dari yang terbanyak dan hanya menghitung Deal Lost", () => {
    const rows = buildLostReasons([
      lead("a", { status: "Deal Lost", alasan_lost: "Ditunda" }),
      lead("b", { status: "Deal Lost", alasan_lost: "Harga" }),
      lead("c", { status: "Deal Lost", alasan_lost: "Harga" }),
      lead("d", { alasan_lost: "Harga" }),
    ]);
    expect(rows).toEqual([{ reason: "Harga", count: 2 }, { reason: "Ditunda", count: 1 }]);
  });
});

describe("buildKpi", () => {
  const leads = [lead("ask", { referred_by: "PT ASK" }), lead("own")];
  const projects = [{ id: "p", name: "P", status: "Done" as const, lead_id: "ask" }];
  const invoices = [invoice("i1", { project_id: "p" }), invoice("i2", { lead_id: "own" })];

  it("omzet dari pembayaran, porsi ASK lewat invoice ke lead", () => {
    const [row] = buildKpi(
      { leads, projects, invoices, payments: [payment("i1", 60, "2026-11-03"), payment("i2", 40, "2026-11-04"), payment("i1", 9, "2026-10-04")], kpi: [] },
      ["2026-11"]
    );
    expect(row).toMatchObject({ omzet: 100, omzetAsk: 60, porsiAsk: 0.6 });
  });

  it("review baru dihitung dari angka terakhir yang terisi", () => {
    const rows = buildKpi(
      {
        leads: [], projects: [], invoices: [], payments: [],
        kpi: [{ bulan: "2026-11-01", review_google_total: 20 }, { bulan: "2027-01-01", review_google_total: 26 }],
      },
      ["2027-01", "2026-12", "2026-11"]
    );
    expect(rows.map((r) => r.reviewBaru)).toEqual([6, null, 3]);
  });

  it("biaya per lead hanya kalau budget dan lead iklan ada", () => {
    const adLeads = [lead("a", { source: "Iklan Meta" }), lead("b", { source: "Iklan Meta" })];
    const [row] = buildKpi({ leads: adLeads, projects: [], invoices: [], payments: [], kpi: [{ bulan: "2026-11-01", budget_iklan: 300_000 }] }, ["2026-11"]);
    expect(row).toMatchObject({ leadIklan: 2, biayaPerLead: 150_000 });
    const [empty] = buildKpi({ leads: [], projects: [], invoices: [], payments: [], kpi: [{ bulan: "2026-11-01", budget_iklan: 300_000 }] }, ["2026-11"]);
    expect(empty.biayaPerLead).toBeNull();
  });
});
