import React from "react";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import { ToastProvider } from "../components/Toast";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="flex h-screen w-full overflow-hidden bg-gray-50">
        <Sidebar />
        {/* Right column: TopBar + scrollable content */}
        <div className="flex-1 min-w-0 flex flex-col pt-14 lg:pt-0 overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-y-auto overflow-x-hidden">
            <div className="p-4 sm:p-6 lg:p-8">
              <div className="w-full max-w-7xl mx-auto">
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
