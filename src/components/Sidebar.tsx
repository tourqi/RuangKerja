"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useState, type ComponentType, type SVGProps } from "react";
import { useAuth } from "@/context/AuthContext";
import { Logo } from "@/components/Logo";
import {
  GridIcon, UsersIcon, FunnelIcon, BuildingIcon, DocumentIcon, ChartBarIcon, BanknotesIcon,
  ReceiptIcon, LockIcon, ShoppingBagIcon, CheckCircleIcon, MegaphoneIcon,
} from "@/components/icons/AppIcons";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

interface NavItem {
  href: string;
  label: string;
  icon: IconComponent;
}

interface NavGroup {
  label?: string;
  ownerOnly?: boolean;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  { items: [{ href: "/dashboard", label: "Dashboard", icon: GridIcon }] },
  {
    label: "Penjualan",
    items: [
      { href: "/leads", label: "Leads", icon: FunnelIcon },
      { href: "/clients", label: "Clients", icon: UsersIcon },
      { href: "/products", label: "Produk", icon: ShoppingBagIcon },
      { href: "/marketing", label: "Marketing", icon: MegaphoneIcon },
    ],
  },
  {
    label: "Operasional",
    items: [{ href: "/projects", label: "Projects", icon: BuildingIcon }],
  },
  {
    label: "Purna Jual",
    items: [{ href: "/garansi", label: "Masa Garansi", icon: CheckCircleIcon }],
  },
  {
    label: "Keuangan",
    items: [
      { href: "/invoices", label: "Invoice", icon: DocumentIcon },
      { href: "/keuangan/pengeluaran", label: "Pengeluaran Umum", icon: ReceiptIcon },
      { href: "/keuangan/laporan", label: "Laporan Keuangan", icon: BanknotesIcon },
    ],
  },
  {
    label: "Laporan",
    items: [{ href: "/reports", label: "Laporan Bisnis", icon: ChartBarIcon }],
  },
  {
    label: "Pengaturan",
    ownerOnly: true,
    items: [{ href: "/settings/users", label: "Pengguna", icon: LockIcon }],
  },
];

function isItemActive(item: NavItem, pathname: string) {
  return pathname === item.href || pathname.startsWith(item.href + "/");
}

function NavLink({ item, pathname, onNav }: { item: NavItem; pathname: string; onNav?: () => void }) {
  const isActive = isItemActive(item, pathname);
  const ItemIcon = item.icon;

  return (
    <li>
      <Link
        href={item.href}
        onClick={onNav}
        className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] transition-colors ${
          isActive
            ? "bg-hover text-ink font-medium"
            : "text-muted hover:text-ink hover:bg-hover"
        }`}
      >
        <ItemIcon className="w-4 h-4 shrink-0" />
        <span>{item.label}</span>
      </Link>
    </li>
  );
}

function NavList({ groups, pathname, onNav }: { groups: NavGroup[]; pathname: string; onNav?: () => void }) {
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [prevPathname, setPrevPathname] = useState(pathname);

  // Pindah halaman selalu membuka kategori halaman tersebut, agar menu aktif tetap terlihat.
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    const activeGroup = groups.find((group) => group.items.some((item) => isItemActive(item, pathname)));
    setCollapsed((prev) => prev.filter((label) => label !== activeGroup?.label));
  }

  function toggleGroup(label: string) {
    setCollapsed((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label],
    );
  }

  return (
    <div className="space-y-2">
      {groups.map((group) => {
        const { label } = group;
        const isOpen = !label || !collapsed.includes(label);
        return (
          <div key={label ?? "utama"}>
            {label && (
              <button
                type="button"
                onClick={() => toggleGroup(label)}
                aria-expanded={isOpen}
                className="w-full flex items-center justify-between px-2.5 py-1 mb-px rounded-md text-xs font-medium text-faint hover:text-ink hover:bg-hover transition-colors"
              >
                <span>{label}</span>
                <svg
                  className={`w-3.5 h-3.5 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            )}
            {isOpen && (
              <ul className="space-y-px">
                {group.items.map((item) => (
                  <NavLink key={item.href} item={item} pathname={pathname} onNav={onNav} />
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { signOut, profile } = useAuth();
  const router = useRouter();
  const visibleGroups = navGroups.filter((group) => !group.ownerOnly || profile?.role === "owner");

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  const navContent = (
    <>
      <Link href="/dashboard" className="h-12 px-4 border-b border-line flex items-center shrink-0">
        <Logo markClassName="w-6 h-6" />
      </Link>
      <nav className="flex-1 px-2.5 py-3 overflow-y-auto">
        <NavList groups={visibleGroups} pathname={pathname} />
      </nav>
      <div className="p-4 border-t border-line space-y-2">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] text-muted hover:text-ink hover:bg-hover transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>Keluar</span>
        </button>
        <p className="text-xs text-faint text-center">© 2026 RuangKerja</p>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-surface flex items-center px-4 border-b border-line">
        <button
          onClick={() => setOpen(true)}
          className="text-muted hover:text-ink transition p-1"
          aria-label="Buka menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <Link href="/dashboard" className="ml-3 flex items-center">
          <Logo markClassName="w-6 h-6" />
        </Link>
      </div>

      {/* Mobile overlay */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`lg:hidden fixed top-0 left-0 z-50 h-full w-64 bg-surface flex flex-col shadow-2xl transform transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-line">
          <Logo markClassName="w-6 h-6" />
          <button onClick={() => setOpen(false)} className="text-muted hover:text-ink transition p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="flex-1 px-2.5 py-3 overflow-y-auto">
          <NavList groups={visibleGroups} pathname={pathname} onNav={() => setOpen(false)} />
        </nav>
        <div className="p-4 border-t border-line">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] text-muted hover:text-ink hover:bg-hover transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex h-screen w-52 bg-surface border-r border-line flex-col sticky top-0">
        {navContent}
      </aside>
    </>
  );
}
