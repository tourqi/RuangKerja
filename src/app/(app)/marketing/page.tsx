import { Suspense } from "react";
import MarketingPage from "@/features/marketing/MarketingPage";

export const metadata = { title: "Marketing – Interior ERP" };

export default function Page() {
  return (
    <Suspense>
      <MarketingPage />
    </Suspense>
  );
}
