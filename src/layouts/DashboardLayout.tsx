import React from "react";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import { ToastProvider } from "../components/Toast";
import { ConfirmProvider } from "../components/ConfirmProvider";
import { DataErrorBanner, DataErrorProvider } from "../components/DataErrorBoundary";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <DataErrorProvider>
          <div className="flex h-screen w-full overflow-hidden bg-white">
            <Sidebar />
            {/* Right column: TopBar + scrollable content */}
            <div className="flex-1 min-w-0 flex flex-col pt-14 lg:pt-0 overflow-hidden">
              <TopBar />
              <main className="flex-1 overflow-y-auto overflow-x-hidden">
                <div className="px-4 py-5 sm:px-6 lg:px-8">
                  <div className="w-full">
                    <DataErrorBanner />
                    {children}
                  </div>
                </div>
              </main>
            </div>
          </div>
        </DataErrorProvider>
      </ConfirmProvider>
    </ToastProvider>
  );
}
