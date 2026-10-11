"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useState, type ComponentType, type SVGProps } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  GridIcon, UsersIcon, FunnelIcon, BuildingIcon, DocumentIcon, ChartBarIcon, BanknotesIcon,
} from "@/components/icons/AppIcons";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

interface NavItem {
  href: string;
  label: string;
  icon: IconComponent;
  children?: { href: string; label: string }[];
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: GridIcon },
  { href: "/clients", label: "Clients", icon: UsersIcon },
  { href: "/leads", label: "Leads", icon: FunnelIcon },
  { href: "/projects", label: "Projects", icon: BuildingIcon },
  { href: "/invoices", label: "Invoice", icon: DocumentIcon },
  { href: "/reports", label: "Laporan", icon: ChartBarIcon },
  {
    href: "/keuangan",
    label: "Keuangan",
    icon: BanknotesIcon,
    children: [
      { href: "/keuangan/pengeluaran", label: "Pengeluaran Umum" },
      { href: "/keuangan/laporan", label: "Laporan Keuangan" },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { signOut } = useAuth();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  function NavLink({ item, onNav }: { item: NavItem; onNav?: () => void }) {
    const isActive =
      pathname === item.href ||
      pathname.startsWith(item.href + "/") ||
      item.children?.some((c) => pathname === c.href || pathname.startsWith(c.href + "/"));
    const hasChildren = !!item.children?.length;
    const ItemIcon = item.icon;

    return (
      <li>
        {hasChildren ? (
          <div>
            <div
              className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] transition-colors ${
                isActive
                  ? "bg-hover text-ink font-medium"
                  : "text-muted hover:text-ink hover:bg-hover"
              }`}
            >
              <ItemIcon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </div>
            <ul className="mt-0.5 ml-6 space-y-px">
              {item.children!.map((child) => {
                const childActive = pathname === child.href || pathname.startsWith(child.href + "/");
                return (
                  <li key={child.href}>
                    <Link
                      href={child.href}
                      onClick={onNav}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[13px] transition-colors ${
                        childActive
                          ? "bg-hover text-ink font-medium"
                          : "text-muted hover:text-ink hover:bg-hover"
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60 shrink-0" />
                      {child.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
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
        )}
      </li>
    );
  }

  const navContent = (
    <>
      <div className="p-4 border-b border-line flex flex-col items-center">
        <div className="bg-white rounded-md px-3 py-2">
          <img src="/logo.png" alt="RuangKerja" className="w-14 h-auto" />
        </div>
      </div>
      <nav className="flex-1 px-2.5 py-3 overflow-y-auto">
        <ul className="space-y-px">
          {navItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </ul>
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
        <div className="ml-3 bg-white rounded-md px-1.5 py-1 flex items-center">
          <img src="/logo.png" alt="RuangKerja" className="h-6 w-auto" />
        </div>
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
          <span className="text-ink font-semibold">Menu</span>
          <button onClick={() => setOpen(false)} className="text-muted hover:text-ink transition p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="flex-1 px-2.5 py-3 overflow-y-auto">
          <ul className="space-y-px">
            {navItems.map((item) => (
              <NavLink key={item.href} item={item} onNav={() => setOpen(false)} />
            ))}
          </ul>
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
