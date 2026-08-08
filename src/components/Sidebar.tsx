"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  children?: { href: string; label: string }[];
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "▦" },
  { href: "/clients", label: "Clients", icon: "⊙" },
  { href: "/leads", label: "Leads", icon: "◎" },
  { href: "/projects", label: "Projects", icon: "▣" },
  { href: "/invoices", label: "Invoice", icon: "◧" },
  { href: "/reports", label: "Laporan", icon: "◉" },
  {
    href: "/keuangan",
    label: "Keuangan",
    icon: "◈",
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

    return (
      <li>
        {hasChildren ? (
          <div>
            <div
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-400 hover:text-white hover:bg-white/10"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </div>
            <ul className="mt-0.5 ml-8 space-y-0.5">
              {item.children!.map((child) => {
                const childActive = pathname === child.href || pathname.startsWith(child.href + "/");
                return (
                  <li key={child.href}>
                    <Link
                      href={child.href}
                      onClick={onNav}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                        childActive
                          ? "bg-white/20 text-white"
                          : "text-gray-500 hover:text-white hover:bg-white/10"
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
            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
              isActive
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-400 hover:text-white hover:bg-white/10"
            }`}
          >
            <span className="text-base">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        )}
      </li>
    );
  }

  const navContent = (
    <>
      <div className="p-4 border-b border-white/10 flex flex-col items-center">
        <div className="bg-white rounded-lg px-3 py-2">
          <img src="/logo.png" alt="RuangKerja" className="w-14 h-auto" />
        </div>
      </div>
      <nav className="flex-1 p-3 overflow-y-auto">
        <ul className="space-y-0.5">
          {navItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </ul>
      </nav>
      <div className="p-4 border-t border-white/10 space-y-2">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-150"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>Keluar</span>
        </button>
        <p className="text-xs text-gray-600 text-center">© 2026 RuangKerja</p>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-gray-900 flex items-center px-4 border-b border-white/10">
        <button
          onClick={() => setOpen(true)}
          className="text-gray-400 hover:text-white transition p-1"
          aria-label="Buka menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="ml-3 bg-white rounded-lg px-1.5 py-1 flex items-center">
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
        className={`lg:hidden fixed top-0 left-0 z-50 h-full w-64 bg-gray-900 flex flex-col shadow-2xl transform transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <span className="text-white font-semibold">Menu</span>
          <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white transition p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="flex-1 p-3 overflow-y-auto">
          <ul className="space-y-0.5">
            {navItems.map((item) => (
              <NavLink key={item.href} item={item} onNav={() => setOpen(false)} />
            ))}
          </ul>
        </nav>
        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-150"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex h-screen w-60 bg-gray-900 flex-col shadow-xl sticky top-0">
        {navContent}
      </aside>
    </>
  );
}
