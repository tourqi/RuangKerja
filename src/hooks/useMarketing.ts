"use client";
import { useFetch } from "./useFetch";
import { getExperiments, getMarketingKpi } from "@/services/marketing";
import type { MarketingExperiment, MarketingKpiMonthly } from "@/types/db";

export function useMarketingKpi() {
  const { data: kpi, loading, error, refetch } = useFetch<MarketingKpiMonthly[]>("marketing-kpi", getMarketingKpi, []);
  return { kpi, loading, error, refetch };
}

export function useExperiments() {
  const { data: experiments, loading, error, refetch } = useFetch<MarketingExperiment[]>("marketing-experiments", getExperiments, []);
  return { experiments, loading, error, refetch };
}
