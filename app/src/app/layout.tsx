import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/lib/providers";
import { Shell } from "@/components/Shell";

export const metadata: Metadata = { title: "MediBook — Hospital Appointments" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body className="min-h-screen bg-slate-100 text-slate-900 antialiased"><Providers><Shell>{children}</Shell></Providers></body></html>;
}
