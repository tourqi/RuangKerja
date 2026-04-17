import Link from 'next/link';
import React from 'react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/clients', label: 'Clients' },
  { href: '/leads', label: 'Leads' },
  { href: '/projects', label: 'Projects' },
];

export default function Sidebar() {
  return (
    <aside className="h-screen w-64 bg-gray-900 text-white flex flex-col p-4">
      <div className="text-2xl font-bold mb-8">Interior ERP</div>
      <nav className="flex-1">
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="block px-3 py-2 rounded hover:bg-gray-800">
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
