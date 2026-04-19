import React from "react";
import Sidebar from "../components/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full bg-gray-50">
      <Sidebar />
      <main className="flex-1 min-w-0 pt-14 lg:pt-0 p-4 sm:p-6 lg:p-8 overflow-x-auto">
        <div className="w-full max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
