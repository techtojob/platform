import type { Metadata } from "next";
import type { ReactNode } from "react";

// El panel de staff nunca sale en buscadores.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function LayoutStaff({ children }: { children: ReactNode }) {
  return children;
}
