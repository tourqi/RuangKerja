"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useClients } from "@/hooks/useClients";
import { useLeads } from "@/hooks/useLeads";
import { useProjects } from "@/hooks/useProjects";

/* ── Route config ── */
const ROUTE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  clients: "Clients",
  leads: "Leads",
  projects: "Projects",
  reports: "Laporan",
};

const formatCurrency = (v?: number) =>
  v == null
    ? ""
    : new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(v);

/* ── Breadcrumb ── */
function Breadcrumb({ clients }: { clients: ReturnType<typeof useClients>["clients"] }) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  type Crumb = { label: string; href?: string };
  const crumbs: Crumb[] = [];

  if (segments.length === 0) return null;

  const first = segments[0];
  const label = ROUTE_LABELS[first];
  if (!label) return null;

  if (segments.length === 1) {
    crumbs.push({ label });
  } else if (segments[0] === "clients" && segments[1]) {
    const client = clients.find((c) => c.id === segments[1]);
    crumbs.push({ label: "Clients", href: "/clients" });
    crumbs.push({ label: client?.name ?? "Profil Client" });
  } else {
    crumbs.push({ label, href: `/${first}` });
    crumbs.push({ label: segments[1] });
  }

  return (
    <nav className="flex items-center gap-1.5 text-xs text-gray-400">
      <Link href="/dashboard" className="hover:text-gray-600 transition-colors">Home</Link>
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <span>/</span>
          {crumb.href ? (
            <Link href={crumb.href} className="hover:text-gray-600 transition-colors">{crumb.label}</Link>
          ) : (
            <span className="text-gray-700 font-medium">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

/* ── Notification bell ── */
function NotifBell({
  leads,
  projects,
}: {
  leads: ReturnType<typeof useLeads>["leads"];
  projects: ReturnType<typeof useProjects>["projects"];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdueProjects = projects.filter(
    (p) => p.status !== "Done" && p.deadline && new Date(p.deadline) < today
  );
  const followUpLeads = leads.filter(
    (l) =>
      l.status !== "Deal" &&
      l.status !== "Lost" &&
      l.follow_up_date &&
      new Date(l.follow_up_date) <= today
  );
  const total = overdueProjects.length + followUpLeads.length;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
        aria-label="Notifikasi"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {total > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
            {total > 9 ? "9+" : total}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-80 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-800">Notifikasi</p>
            {total === 0 && <span className="text-xs text-gray-400">Semua beres</span>}
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {total === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-gray-400">
                Tidak ada notifikasi aktif
              </div>
            ) : (
              <>
                {overdueProjects.length > 0 && (
                  <div>
                    <p className="px-4 pt-3 pb-1 text-xs font-semibold text-red-600 uppercase tracking-wide">
                      Proyek Overdue ({overdueProjects.length})
                    </p>
                    {overdueProjects.map((p) => (
                      <Link
                        key={p.id}
                        href="/projects"
                        onClick={() => setOpen(false)}
                        className="flex items-start gap-3 px-4 py-2.5 hover:bg-red-50 transition-colors"
                      >
                        <span className="w-2 h-2 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-gray-800 truncate">{p.name}</p>
                          <p className="text-xs text-gray-400">
                            Deadline: {p.deadline ? new Date(p.deadline).toLocaleDateString("id-ID") : "-"}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
                {followUpLeads.length > 0 && (
                  <div>
                    <p className="px-4 pt-3 pb-1 text-xs font-semibold text-orange-600 uppercase tracking-wide">
                      Follow-up Hari Ini ({followUpLeads.length})
                    </p>
                    {followUpLeads.map((l) => (
                      <Link
                        key={l.id}
                        href="/leads"
                        onClick={() => setOpen(false)}
                        className="flex items-start gap-3 px-4 py-2.5 hover:bg-orange-50 transition-colors"
                      >
                        <span className="w-2 h-2 rounded-full bg-orange-400 mt-1.5 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-gray-800 truncate">Lead #{l.id.slice(0, 8)}</p>
                          <p className="text-xs text-gray-400">Status: {l.status}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Search modal ── */
function SearchModal({
  clients,
  leads,
  projects,
  onClose,
}: {
  clients: ReturnType<typeof useClients>["clients"];
  leads: ReturnType<typeof useLeads>["leads"];
  projects: ReturnType<typeof useProjects>["projects"];
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const q = query.toLowerCase().trim();

  const matchedClients = q.length >= 1
    ? clients.filter((c) =>
        c.name?.toLowerCase().includes(q) || c.phone?.includes(q)
      ).slice(0, 5)
    : [];

  const matchedProjects = q.length >= 1
    ? projects.filter((p) => p.name?.toLowerCase().includes(q)).slice(0, 4)
    : [];

  const matchedLeads = q.length >= 1
    ? leads
        .filter((l) => {
          const c = clients.find((cl) => cl.id === l.client_id);
          return c?.name?.toLowerCase().includes(q);
        })
        .slice(0, 3)
    : [];

  const hasResults = matchedClients.length > 0 || matchedProjects.length > 0 || matchedLeads.length > 0;

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-start justify-center pt-20 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Cari client, proyek, atau lead…"
            className="flex-1 text-sm text-gray-800 placeholder:text-gray-400 outline-none bg-transparent"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] text-gray-400 border border-gray-200 rounded-md">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {!q && (
            <div className="px-4 py-8 text-center text-xs text-gray-400">
              Ketik minimal 1 karakter untuk mulai mencari
            </div>
          )}

          {q && !hasResults && (
            <div className="px-4 py-8 text-center text-xs text-gray-400">
              Tidak ditemukan untuk &ldquo;{query}&rdquo;
            </div>
          )}

          {matchedClients.length > 0 && (
            <div>
              <p className="px-4 pt-3 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">Clients</p>
              {matchedClients.map((c) => (
                <Link
                  key={c.id}
                  href={`/clients/${c.id}`}
                  onClick={onClose}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
                >
                  <span className="w-7 h-7 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {c.name?.[0]?.toUpperCase() ?? "?"}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800">{c.name}</p>
                    <p className="text-xs text-gray-400">{c.phone ?? c.source ?? ""}</p>
                  </div>
                  {c.lead_status && (
                    <span className="ml-auto text-xs text-gray-400 flex-shrink-0">{c.lead_status}</span>
                  )}
                </Link>
              ))}
            </div>
          )}

          {matchedProjects.length > 0 && (
            <div>
              <p className="px-4 pt-3 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">Proyek</p>
              {matchedProjects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { router.push("/projects"); onClose(); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
                >
                  <span className="w-7 h-7 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center flex-shrink-0">P</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.status}{p.value ? ` · ${formatCurrency(p.value)}` : ""}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {matchedLeads.length > 0 && (
            <div>
              <p className="px-4 pt-3 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">Leads</p>
              {matchedLeads.map((l) => {
                const c = clients.find((cl) => cl.id === l.client_id);
                return (
                  <Link
                    key={l.id}
                    href={c ? `/clients/${c.id}` : "/leads"}
                    onClick={onClose}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
                  >
                    <span className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center flex-shrink-0">L</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800">{c?.name ?? "-"}</p>
                      <p className="text-xs text-gray-400">Lead · {l.status}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {hasResults && (
            <div className="px-4 py-2.5 border-t border-gray-50">
              <p className="text-xs text-gray-400 text-center">Klik hasil untuk navigasi</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Avatar ── */
function Avatar() {
  return (
    <div className="w-8 h-8 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 cursor-default select-none">
      RK
    </div>
  );
}

/* ── TopBar ── */
export default function TopBar() {
  const { clients } = useClients();
  const { leads } = useLeads();
  const { projects } = useProjects();
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowSearch(true);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <header className="flex-shrink-0 bg-white border-b border-gray-100 px-4 sm:px-6 lg:px-8">
        {/* Main bar */}
        <div className="h-14 flex items-center justify-between gap-4">
          {/* Breadcrumb */}
          <Breadcrumb clients={clients} />

          {/* Actions */}
          <div className="flex items-center gap-1">
            {/* Search button */}
            <button
              onClick={() => setShowSearch(true)}
              className="flex items-center gap-2 px-3 h-9 text-sm text-gray-400 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="hidden sm:inline text-xs">Cari…</span>
              <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] text-gray-300">
                <span>⌘K</span>
              </kbd>
            </button>

            {/* Notifications */}
            <NotifBell leads={leads} projects={projects} />

            {/* Divider */}
            <div className="w-px h-5 bg-gray-200 mx-1" />

            {/* Avatar */}
            <Avatar />
          </div>
        </div>
      </header>

      {/* Search modal */}
      {showSearch && (
        <SearchModal
          clients={clients}
          leads={leads}
          projects={projects}
          onClose={() => setShowSearch(false)}
        />
      )}
    </>
  );
}
