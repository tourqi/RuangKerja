import React from 'react';
import Sidebar from '../components/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <main className="flex-1 min-w-0 bg-gray-50 p-4 sm:p-6 md:p-8 overflow-x-auto">
        <div className="w-full max-w-full md:max-w-5xl lg:max-w-6xl xl:max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
