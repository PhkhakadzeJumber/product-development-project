"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";

const LINKS: Record<string, { href: string; label: string }[]> = {
  PATIENT: [
    { href: "/doctors", label: "Find doctors" },
    { href: "/appointments", label: "My visits" },
    { href: "/prescriptions", label: "Prescriptions" },
    { href: "/drugs", label: "Drugs" },
  ],
  DOCTOR: [
    { href: "/timetable", label: "Timetable" },
  ],
  HOSPITAL_ADMIN: [
    { href: "/slots", label: "Slots" },
    { href: "/doctors", label: "Doctors" },
  ],
};

export function Shell({ children }: { children: React.ReactNode }) {
  const { role, logout, token } = useAuth();
  const path = usePathname();
  const links = (role && LINKS[role]) ?? [];
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-bold text-teal-700 text-lg">
            <span className="bg-teal-600 text-white rounded-xl w-8 h-8 flex items-center justify-center">✚</span>
            MediBook
          </Link>
          <nav className="flex gap-1 text-sm font-medium">
            {links.map((l) => (
              <Link key={l.href} href={l.href}
                className={`px-3 py-2 rounded-lg ${path === l.href || (l.href !== "/" && path.startsWith(l.href)) ? "bg-teal-50 text-teal-700" : "text-slate-600 hover:bg-slate-100"}`}>
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            {token ? <>
              {role && <span className="hidden sm:inline text-xs font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-600">{role}</span>}
              <button onClick={logout} className="text-slate-600 hover:text-slate-900 font-medium">Logout</button>
            </> : <>
              <Link href="/login" className="text-slate-600 hover:text-slate-900 font-medium">Login</Link>
              <Link href="/register/patient" className="bg-teal-600 hover:bg-teal-700 text-white font-semibold px-4 py-2 rounded-xl">Book a visit</Link>
            </>}
          </div>
        </div>
      </header>
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-8">{children}</main>
      <footer className="border-t border-slate-200 text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 py-4 flex gap-4">
          <span>MediBook — hospital appointments & treatment tracking</span>
          <span className="ml-auto">Demo: patient@demo.ge · doctor@demo.ge · admin@demo.ge (Test123!)</span>
        </div>
      </footer>
    </div>
  );
}
