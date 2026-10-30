import { describe, expect, it } from "vitest";
import { computeProductStats, sortProductsByDemand } from "./productStats";
import type { LeadProductUsage, Product } from "@/types/db";

const usage = (product_id: string, dibeli: boolean, lead_status: LeadProductUsage["lead_status"]): LeadProductUsage => ({
  lead_id: `${product_id}-${lead_status}`,
  product_id,
  dibeli,
  lead_status,
});

const product = (id: string, kode: string): Product => ({
  id,
  kode,
  nama: kode,
  kategori: "Desain",
  status: "Draft",
  aktif: true,
});

describe("computeProductStats", () => {
  it("menghitung diminati dari semua lead dan dibeli hanya dari Deal Won", () => {
    const stats = computeProductStats([
      usage("a", true, "Deal Won"),
      usage("a", false, "Survey"),
      usage("a", false, "Deal Won"),
    ]);
    expect(stats.a).toEqual({ diminati: 3, dibeli: 1 });
  });

  it("tidak menghitung dibeli kalau lead sudah tidak Deal Won", () => {
    expect(computeProductStats([usage("a", true, "Deal Lost")]).a).toEqual({ diminati: 1, dibeli: 0 });
  });
});

describe("sortProductsByDemand", () => {
  it("mengurutkan dibeli, lalu diminati, lalu kode", () => {
    const products = [product("a", "CF01"), product("b", "CF02"), product("c", "AA01"), product("d", "DS01")];
    const stats = { b: { diminati: 1, dibeli: 2 }, a: { diminati: 5, dibeli: 0 } };
    expect(sortProductsByDemand(products, stats).map((p) => p.id)).toEqual(["b", "a", "c", "d"]);
  });
});
