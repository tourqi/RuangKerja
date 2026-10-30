import { describe, expect, it } from "vitest";
import { addMonths, groupWarrantyFollowups, isUnderWarranty, projectsWithoutBast, warrantyEnd } from "./warranty";
import type { Project, WarrantyFollowup } from "@/types/db";

const project = (id: string, extra: Partial<Project> = {}): Project => ({ id, name: id, status: "Done", ...extra });

const followup = (id: string, project_id: string, due_date: string, status: WarrantyFollowup["status"] = "pending"): WarrantyFollowup => ({
  id,
  project_id,
  bulan_ke: 1,
  due_date,
  status,
  tugas_selesai: false,
});

describe("addMonths", () => {
  it("memepet ke akhir bulan seperti Postgres", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2024-01-31", 1)).toBe("2024-02-29");
  });

  it("melewati pergantian tahun", () => {
    expect(addMonths("2026-11-15", 3)).toBe("2027-02-15");
    expect(addMonths("2026-10-31", 12)).toBe("2027-10-31");
  });
});

describe("masa garansi", () => {
  it("default 3 bulan dari tanggal BAST", () => {
    expect(warrantyEnd({ bast_date: "2026-10-01" })).toBe("2027-01-01");
  });

  it("memakai garansi_bulan per project", () => {
    expect(warrantyEnd({ bast_date: "2026-10-01", garansi_bulan: 6 })).toBe("2027-04-01");
  });

  it("hari terakhir garansi masih terhitung", () => {
    const p = { bast_date: "2026-10-01" };
    expect(isUnderWarranty(p, "2027-01-01")).toBe(true);
    expect(isUnderWarranty(p, "2027-01-02")).toBe(false);
  });

  it("tanpa BAST berarti tidak bergaransi", () => {
    expect(warrantyEnd({})).toBeNull();
    expect(isUnderWarranty({}, "2026-10-01")).toBe(false);
  });
});

describe("groupWarrantyFollowups", () => {
  const projects = [project("a"), project("b", { followup_dihentikan: true })];

  it("memisahkan telat, bulan ini, dan mendatang", () => {
    const groups = groupWarrantyFollowups(
      [followup("1", "a", "2026-10-30"), followup("2", "a", "2026-10-31"), followup("3", "a", "2026-11-01")],
      projects,
      "2026-10-31"
    );
    expect(groups.late.map((f) => f.id)).toEqual(["1"]);
    expect(groups.thisMonth.map((f) => f.id)).toEqual(["2"]);
    expect(groups.upcoming.map((f) => f.id)).toEqual(["3"]);
  });

  it("mengabaikan yang selesai, dihentikan, dan project yang tidak ada", () => {
    const groups = groupWarrantyFollowups(
      [followup("1", "a", "2026-10-01", "done"), followup("2", "b", "2026-10-01"), followup("3", "x", "2026-10-01")],
      projects,
      "2026-10-31"
    );
    expect(groups).toEqual({ late: [], thisMonth: [], upcoming: [] });
  });
});

describe("projectsWithoutBast", () => {
  it("hanya project Selesai tanpa tanggal BAST", () => {
    const list = [project("a"), project("b", { bast_date: "2026-10-01" }), project("c", { status: "Production" })];
    expect(projectsWithoutBast(list).map((p) => p.id)).toEqual(["a"]);
  });
});
