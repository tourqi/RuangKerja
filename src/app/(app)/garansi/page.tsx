import { Suspense } from "react";
import GaransiPage from "@/features/garansi/GaransiPage";

export const metadata = { title: "Masa Garansi – Interior ERP" };

export default function Page() {
  return (
    <Suspense>
      <GaransiPage />
    </Suspense>
  );
}
