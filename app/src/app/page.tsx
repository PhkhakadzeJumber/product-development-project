import Link from "next/link";
import { Card } from "@/components/ui";

export default function Home() {
  return <div className="space-y-8">
    <section className="bg-gradient-to-br from-teal-600 to-cyan-700 text-white rounded-3xl p-8 sm:p-12 shadow-card">
      <h1 className="text-3xl sm:text-4xl font-bold max-w-xl">Book the right doctor. Track your treatment.</h1>
      <p className="mt-3 text-teal-50 max-w-lg">Browse doctors across hospitals, book online or in-person visits, get prescriptions and chat with your doctor.</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/doctors" className="bg-white text-teal-700 font-semibold px-5 py-2.5 rounded-xl">Find doctors</Link>
        <Link href="/login" className="border border-white/40 font-semibold px-5 py-2.5 rounded-xl hover:bg-white/10">Login</Link>
      </div>
    </section>
    <section className="grid sm:grid-cols-3 gap-4">
      {[
        { t: "Patients", d: "Search doctors, book & cancel visits, review prescriptions.", href: "/register/patient", cta: "Register as patient" },
        { t: "Doctors", d: "Teams-style timetable, consultations, prescriptions, chat.", href: "/timetable", cta: "Open timetable" },
        { t: "Admins", d: "Manage slots per doctor and monitor hospital visits.", href: "/slots", cta: "Manage slots" },
      ].map((c) => <Card key={c.t} className="p-6 space-y-2">
        <h2 className="font-bold text-lg">{c.t}</h2>
        <p className="text-sm text-slate-600">{c.d}</p>
        <Link href={c.href} className="inline-block text-teal-700 font-semibold text-sm underline underline-offset-4">{c.cta} →</Link>
      </Card>)}
    </section>
  </div>;
}
