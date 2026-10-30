"use client";
import { useMemo, useState } from "react";
import type { Lead } from "@/types/db";
import { useInvoices } from "@/hooks/useInvoices";
import { useLeads } from "@/hooks/useLeads";
import { useMarketingKpi } from "@/hooks/useMarketing";
import { useAllPayments } from "@/hooks/usePayments";
import { useProjects } from "@/hooks/useProjects";
import { useAllRabs } from "@/hooks/useRab";
import { DetailTabs, useTabParam } from "@/components/DetailTabs";
import { buildFunnel, buildKpi, buildLostReasons, buildSourceRows, isAskLead, recentMonths } from "@/utils/marketingCalculations";
import { localToday } from "@/utils/warranty";
import { ExperimentsTab } from "./ExperimentsTab";
import { FunnelTab } from "./FunnelTab";
import { KpiTab } from "./KpiTab";
import { SourcesTab } from "./SourcesTab";

const TAB_KEYS = ["funnel", "sumber", "kpi", "eksperimen"] as const;
const MONTH_COUNT = 12;

export default function MarketingPage() {
  const { leads, loading: loadingLeads } = useLeads();
  const { rabs, loading: loadingRabs } = useAllRabs();
  const { projects, loading: loadingProjects } = useProjects();
  const { invoices, loading: loadingInvoices } = useInvoices();
  const { payments, loading: loadingPayments } = useAllPayments();
  const { kpi, loading: loadingKpi, refetch: refetchKpi } = useMarketingKpi();
  const [activeTab, setActiveTab] = useTabParam(TAB_KEYS, "funnel");
  const [excludeAsk, setExcludeAsk] = useState(false);

  const today = localToday();
  const months = useMemo(() => recentMonths(today, MONTH_COUNT), [today]);
  const funnelLeads: Lead[] = useMemo(() => (excludeAsk ? leads.filter((l) => !isAskLead(l)) : leads), [leads, excludeAsk]);
  const funnel = useMemo(() => buildFunnel(funnelLeads, rabs, months), [funnelLeads, rabs, months]);
  const lostReasons = useMemo(() => buildLostReasons(funnelLeads), [funnelLeads]);
  const sources = useMemo(() => buildSourceRows(leads), [leads]);
  const kpiRows = useMemo(
    () => buildKpi({ leads, projects, invoices: invoices ?? [], payments, kpi }, months),
    [leads, projects, invoices, payments, kpi, months]
  );

  const loading = loadingLeads || loadingRabs || loadingProjects || loadingInvoices || loadingPayments || loadingKpi;
  const current = funnel[0];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink">Marketing</h1>
        <p className="text-[13px] text-muted mt-0.5">
          {current ? `Bulan ini ${current.leads} lead masuk, ${current.surveys} survey, ${current.won} closing` : "Memuat data..."}
        </p>
      </div>

      <DetailTabs
        tabs={[
          { key: "funnel", label: "Funnel" },
          { key: "sumber", label: "Sumber Lead" },
          { key: "kpi", label: "KPI Bulanan" },
          { key: "eksperimen", label: "Eksperimen" },
        ]}
        active={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === "funnel" && (
        <FunnelTab rows={funnel} lostReasons={lostReasons} loading={loading} excludeAsk={excludeAsk} onExcludeAskChange={setExcludeAsk} />
      )}
      {activeTab === "sumber" && <SourcesTab rows={sources.rows} ask={sources.ask} loading={loading} />}
      {activeTab === "kpi" && <KpiTab rows={kpiRows} loading={loading} onSaved={refetchKpi} />}
      {activeTab === "eksperimen" && <ExperimentsTab />}
    </div>
  );
}
