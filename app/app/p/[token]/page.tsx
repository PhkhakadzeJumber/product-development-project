import Link from "next/link";
import { sql } from "@/lib/db";
import { initials } from "@/lib/format";
import OpensDoctorListEvent from "./OpensDoctorListEvent";

export const dynamic = "force-dynamic";

const SOURCES = ["demo_invite", "clinic_referral"];

// S2 · Gela opens his link and finds his doctor (Figma frame "MVP 1 · Your doctor").
export default async function PatientHome({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ src?: string }>;
}) {
  const { token } = await params;
  const { src } = await searchParams;

  const [row] = await sql`
    select p.id as patient_id, p.first_name, d.id as doctor_id, d.display_name, d.specialty
    from patients p
    join doctors d on d.id = p.doctor_id
    where p.token = ${token}`;

  if (!row) {
    return <p className="p-6 text-center text-slate-600">This link is not valid.</p>;
  }

  const doctorName: string = row.display_name;
  const source = src && SOURCES.includes(src) ? src : "other";

  return (
    <div className="flex flex-col gap-4 px-5 py-5">
      <OpensDoctorListEvent patientId={row.patient_id} source={source} />

      <span className="flex w-fit items-center gap-1.5 rounded-full bg-brand-tint px-3 py-1.5 text-sm font-semibold text-brand-dark">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
          <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
        </svg>
        Opened from your clinic&apos;s link
      </span>

      <div>
        <h1 className="text-3xl font-bold leading-tight">Hello, {row.first_name}</h1>
        <p className="mt-1 text-slate-500">
          This is your own doctor. Ask what changed since your last visit — no trip needed.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-pink-600 font-semibold text-white">
            {initials(doctorName)}
          </span>
          <div>
            <p className="font-semibold">{doctorName}</p>
            <p className="text-sm text-slate-500">{row.specialty}</p>
          </div>
        </div>
        <Link
          href={`/p/${token}/ask`}
          className="rounded-xl bg-brand-tint py-3 text-center font-semibold text-brand-dark"
        >
          Ask a question
        </Link>
      </div>
    </div>
  );
}
