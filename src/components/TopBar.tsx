"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useClients } from "@/hooks/useClients";
import { useLeads } from "@/hooks/useLeads";
import { useProjects } from "@/hooks/useProjects";
import { useInvoices } from "@/hooks/useInvoices";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import { useApprovedRabTotals } from "@/hooks/useRab";
import { getProjectValue as computeProjectValue } from "@/utils/projectValue";
import { QuestionCircleIcon } from "@/components/icons/AppIcons";
import HelpGuideModal from "@/components/HelpGuideModal";
import type { NotificationType } from "@/types/db";
import { formatIDR } from "@/utils/format";

/* ── Route config ── */
const ROUTE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  clients: "Clients",
  leads: "Leads",
  projects: "Projects",
  reports: "Laporan",
  invoices: "Invoice",
  settings: "Pengaturan",
};

const formatCurrency = (v?: number) =>
  v == null
    ? ""
    : formatIDR(v);

/* ── Breadcrumb ── */
function Breadcrumb({ clients, leads, projects, invoices }: {
  clients: ReturnType<typeof useClients>["clients"];
  leads: ReturnType<typeof useLeads>["leads"];
  projects: ReturnType<typeof useProjects>["projects"];
  invoices: ReturnType<typeof useInvoices>["invoices"];
}) {
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
    // Tampilkan nama record, bukan UUID
    const id = segments[1];
    const name =
      first === "projects" ? projects.find((p) => p.id === id)?.name :
      first === "invoices" ? invoices.find((i) => i.id === id)?.invoice_number :
      first === "leads" ? (() => {
        const lead = leads.find((l) => l.id === id);
        return lead ? (clients.find((c) => c.id === lead.client_id)?.name ?? lead.project_name) : undefined;
      })() : undefined;
    crumbs.push({ label, href: `/${first}` });
    if (segments[2] === "rab") {
      crumbs.push({ label: name ?? "Detail", href: `/${first}/${id}` });
      crumbs.push({ label: "RAB" });
    } else {
      crumbs.push({ label: name ?? "Detail" });
    }
  }

  return (
    <nav className="flex items-center gap-1.5 text-xs text-faint">
      <Link href="/dashboard" className="hover:text-muted transition-colors">Home</Link>
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <span>/</span>
          {crumb.href ? (
            <Link href={crumb.href} className="hover:text-muted transition-colors">{crumb.label}</Link>
          ) : (
            <span className="text-ink font-medium">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

const TYPE_CONFIG: Record<NotificationType, { color: string; dot: string; hover: string }> = {
  follow_up_due: { color: "text-warning", dot: "bg-warning", hover: "hover:bg-warning-soft" },
  project_overdue: { color: "text-danger", dot: "bg-danger", hover: "hover:bg-danger-soft" },
  invoice_overdue: { color: "text-warning", dot: "bg-warning", hover: "hover:bg-warning-soft" },
  lead_stale: { color: "text-muted", dot: "bg-faint", hover: "hover:bg-hover" },
  lead_survey_overdue: { color: "text-accent", dot: "bg-accent", hover: "hover:bg-accent-soft" },
  lead_auto_lost: { color: "text-danger", dot: "bg-danger", hover: "hover:bg-danger-soft" },
};

const TYPE_LABELS: Record<NotificationType, string> = {
  follow_up_due: "Follow-up",
  project_overdue: "Proyek Overdue",
  invoice_overdue: "Invoice Jatuh Tempo",
  lead_stale: "Lead Stale",
  lead_survey_overdue: "Survey Overdue",
  lead_auto_lost: "Lead Auto-Lost",
};

/* ── Notification bell ── */
function NotifBell({
  leads,
  projects,
  invoices,
  clients,
}: {
  leads: ReturnType<typeof useLeads>["leads"];
  projects: ReturnType<typeof useProjects>["projects"];
  invoices: ReturnType<typeof useInvoices>["invoices"];
  clients: ReturnType<typeof useClients>["clients"];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications(leads, projects, invoices, clients);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Group by type
  const groups = notifications.reduce<Record<NotificationType, typeof notifications>>((acc, n) => {
    if (!acc[n.type]) acc[n.type] = [];
    acc[n.type].push(n);
    return acc;
  }, {} as Record<NotificationType, typeof notifications>);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative w-9 h-9 flex items-center justify-center rounded-md text-muted hover:bg-hover hover:text-ink transition-colors"
        aria-label="Notifikasi"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-danger text-white text-[10px] font-semibold rounded-full flex items-center justify-center leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-80 bg-white border border-line rounded-md shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-line flex items-center justify-between">
            <p className="text-sm font-semibold text-ink">Notifikasi</p>
            {unreadCount > 0 ? (
              <button
                onClick={markAllRead}
                className="text-xs text-faint hover:text-muted transition-colors"
              >
                Tandai semua dibaca
              </button>
            ) : (
              <span className="text-xs text-faint">Semua beres</span>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-line">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-faint">
                Tidak ada notifikasi aktif
              </div>
            ) : (
              (Object.keys(groups) as NotificationType[]).map((type) => (
                <div key={type}>
                  <p className={`px-4 pt-3 pb-1 text-xs font-semibold ${TYPE_CONFIG[type].color}`}>
                    {TYPE_LABELS[type]} ({groups[type].length})
                  </p>
                  {groups[type].map((n) => (
                    <button
                      key={n.id}
                      onClick={() => {
                        markRead(n.id);
                        setOpen(false);
                        if (n.link) router.push(n.link);
                      }}
                      className={`w-full flex items-start gap-3 px-4 py-2.5 text-left transition-colors ${TYPE_CONFIG[type].hover} ${n.read ? "opacity-50" : ""}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${TYPE_CONFIG[type].dot} mt-1.5 flex-shrink-0`} />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-ink truncate">{n.title}</p>
                        {n.body && <p className="text-xs text-faint">{n.body}</p>}
                      </div>
                      {!n.read && (
                        <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              ))
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
  const { totals: rabTotals } = useApprovedRabTotals();
  const getProjectValue = (p: { lead_id?: string; value?: number }) => computeProjectValue(p, rabTotals);

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
        className="w-full max-w-xl bg-white rounded-lg shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-line">
          <svg className="w-4 h-4 text-faint flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Cari client, proyek, atau lead…"
            className="flex-1 text-sm text-ink placeholder:text-faint outline-none bg-transparent"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] text-faint border border-line rounded-md">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {!q && (
            <div className="px-4 py-8 text-center text-xs text-faint">
              Ketik minimal 1 karakter untuk mulai mencari
            </div>
          )}

          {q && !hasResults && (
            <div className="px-4 py-8 text-center text-xs text-faint">
              Tidak ditemukan untuk &ldquo;{query}&rdquo;
            </div>
          )}

          {matchedClients.length > 0 && (
            <div>
              <p className="px-4 pt-3 pb-1 text-xs font-semibold text-faint">Clients</p>
              {matchedClients.map((c) => (
                <Link
                  key={c.id}
                  href={`/clients/${c.id}`}
                  onClick={onClose}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-hover transition-colors"
                >
                  <span className="w-7 h-7 rounded-full bg-accent text-white text-xs font-semibold flex items-center justify-center flex-shrink-0">
                    {c.name?.[0]?.toUpperCase() ?? "?"}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">{c.name}</p>
                    <p className="text-xs text-faint">{c.phone ?? c.source ?? ""}</p>
                  </div>
                  {c.lead_status && (
                    <span className="ml-auto text-xs text-faint flex-shrink-0">{c.lead_status}</span>
                  )}
                </Link>
              ))}
            </div>
          )}

          {matchedProjects.length > 0 && (
            <div>
              <p className="px-4 pt-3 pb-1 text-xs font-semibold text-faint">Proyek</p>
              {matchedProjects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { router.push("/projects"); onClose(); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-hover transition-colors text-left"
                >
                  <span className="w-7 h-7 rounded-full bg-surface text-muted text-xs font-semibold flex items-center justify-center flex-shrink-0">P</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">{p.name}</p>
                    <p className="text-xs text-faint">{p.status}{getProjectValue(p) ? ` · ${formatCurrency(getProjectValue(p))}` : ""}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {matchedLeads.length > 0 && (
            <div>
              <p className="px-4 pt-3 pb-1 text-xs font-semibold text-faint">Leads</p>
              {matchedLeads.map((l) => {
                const c = clients.find((cl) => cl.id === l.client_id);
                return (
                  <Link
                    key={l.id}
                    href={c ? `/clients/${c.id}` : "/leads"}
                    onClick={onClose}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-hover transition-colors"
                  >
                    <span className="w-7 h-7 rounded-full bg-surface text-muted text-xs font-semibold flex items-center justify-center flex-shrink-0">L</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink">{c?.name ?? "-"}</p>
                      <p className="text-xs text-faint">Lead · {l.status}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {hasResults && (
            <div className="px-4 py-2.5 border-t border-line">
              <p className="text-xs text-faint text-center">Klik hasil untuk navigasi</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── User menu ── */
function UserMenu() {
  const { user, profile, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const displayName = profile?.name ?? user?.email ?? "RK";
  const initials = displayName
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-8 h-8 rounded-full bg-accent text-white text-xs font-semibold flex items-center justify-center flex-shrink-0 hover:bg-accent-hover transition-colors"
        aria-label="Menu pengguna"
      >
        {initials}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-52 bg-white border border-line rounded-md shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-line">
            <p className="text-xs font-semibold text-ink truncate">
              {profile?.name ?? "Pengguna"}
            </p>
            <p className="text-xs text-faint truncate">{user?.email}</p>
            {profile?.role && (
              <span className="inline-block mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded border border-line text-muted capitalize">
                {profile.role}
              </span>
            )}
          </div>
          {profile?.role === "owner" && (
            <Link
              href="/settings/users"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-2.5 text-xs text-muted hover:bg-hover transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Kelola Pengguna
            </Link>
          )}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-danger hover:bg-danger-soft transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Keluar
          </button>
        </div>
      )}
    </div>
  );
}

/* ── TopBar ── */
export default function TopBar() {
  const { clients } = useClients();
  const { leads } = useLeads();
  const { projects } = useProjects();
  const { invoices } = useInvoices();
  const [showSearch, setShowSearch] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

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
      <header className="flex-shrink-0 bg-white border-b border-line px-4 sm:px-6 lg:px-8">
        {/* Main bar */}
        <div className="h-12 flex items-center gap-4">
          {/* Breadcrumb */}
          <Breadcrumb clients={clients} leads={leads} projects={projects} invoices={invoices} />

          {/* Actions — ml-auto (not justify-between) keeps this pinned right even when
              Breadcrumb renders null, e.g. on /keuangan routes or the root path. */}
          <div className="flex items-center gap-1 ml-auto">
            {/* Search button */}
            <button
              onClick={() => setShowSearch(true)}
              className="flex items-center gap-2 px-2.5 h-8 w-48 max-sm:w-auto text-sm text-faint bg-white hover:bg-hover border border-line rounded-md transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="hidden sm:inline text-xs">Cari…</span>
              <kbd className="hidden sm:inline-flex items-center ml-auto px-1 font-mono text-[11px] text-muted border border-line rounded">
                <span>⌘K</span>
              </kbd>
            </button>

            {/* Notifications */}
            <NotifBell leads={leads} projects={projects} invoices={invoices} clients={clients} />

            {/* Panduan pemakaian */}
            <button
              onClick={() => setShowGuide(true)}
              className="w-9 h-9 flex items-center justify-center rounded-md text-muted hover:bg-hover hover:text-ink transition-colors"
              aria-label="Panduan pemakaian"
              title="Panduan pemakaian"
            >
              <span className="w-5 h-5"><QuestionCircleIcon /></span>
            </button>

            {/* Divider */}
            <div className="w-px h-5 bg-line mx-1" />

            {/* User menu */}
            <UserMenu />
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

      {/* Panduan pemakaian */}
      {showGuide && <HelpGuideModal onClose={() => setShowGuide(false)} />}
    </>
  );
}
