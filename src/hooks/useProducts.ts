"use client";
import { useFetch } from "./useFetch";
import { getLeadProducts, getProducts, getProductUsage } from "@/services/products";
import type { LeadProduct, LeadProductUsage, Product } from "@/types/db";

export function useProducts() {
  const { data: products, loading, error, refetch } = useFetch<Product[]>("products", getProducts, []);
  return { products, loading, error, refetch };
}

export function useProductUsage() {
  const { data: usage, loading, error, refetch } = useFetch<LeadProductUsage[]>("product-usage", getProductUsage, []);
  return { usage, loading, error, refetch };
}

export function useLeadProducts(leadId: string) {
  const { data: leadProducts, loading, error, refetch } = useFetch<LeadProduct[]>(
    `lead-products-${leadId}`,
    () => (leadId ? getLeadProducts(leadId) : Promise.resolve([])),
    []
  );
  return { leadProducts, loading, error, refetch };
}
