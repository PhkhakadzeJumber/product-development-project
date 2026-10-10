"use client";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { Card, StatusPill } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";
import type { VisitDetailed } from "@/types/api";

/** Placeholder message button — disabled until doctor↔patient messaging ships. */
export function MessageButton({ label = "Message", className = "" }: { label?: string; className?: string }) {
  return (
    <button
      type="button"
      disabled
      title="Messaging coming soon"
      aria-label={`${label} (coming soon)`}
      className={`text-sm font-semibold px-4 py-2 rounded-xl bg-slate-200 text-slate-500 cursor-not-allowed ${className}`}
    >
      ✉ {label}
    </button>
  );
}

/** E-commerce style visit card for admin/staff: doctor + patient with contacts and status. */
export function VisitCard({ v }: { v: VisitDetailed }) {
  const doctorName = v.doctor_first_name ? `${v.doctor_first_name} ${v.doctor_last_name ?? ""}`.trim() : `Doctor #${v.doctor_id}`;
  const patientName = v.patient_first_name ? `${v.patient_first_name} ${v.patient_last_name ?? ""}`.trim() : `Patient #${v.patient_id}`;
  return (
    <Card className="p-5 flex flex-col gap-4 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 flex-wrap">
        <StatusPill status={v.status} />
        {v.consultation_mode && <StatusPill status={v.consultation_mode} />}
        <span className="ml-auto text-xs text-slate-400 font-medium">
          {v.start_time ? fmtDateTime(v.start_time) : "Time TBD"}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <Avatar src={v.doctor_photo_url} firstName={v.doctor_first_name ?? "D"} lastName={v.doctor_last_name ?? String(v.doctor_id)} size={52} />
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Doctor</p>
          <Link href={`/doctors/${v.doctor_id}`} className="font-bold leading-tight hover:text-teal-700 hover:underline block truncate">
            {doctorName}
          </Link>
          <p className="text-xs text-slate-500 truncate">
            {[v.doctor_email, v.doctor_phone].filter(Boolean).join(" · ") || `ID #${v.doctor_id}`}
          </p>
        </div>
      </div>
      <div className="border-t border-slate-100" />
      <div className="flex items-center gap-3">
        <Avatar src={v.patient_avatar_url} firstName={v.patient_first_name ?? "P"} lastName={v.patient_last_name ?? String(v.patient_id)} size={52} />
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Patient</p>
          <Link href={`/patients/${v.patient_id}`} className="font-bold leading-tight hover:text-teal-700 hover:underline block truncate">
            {patientName}
          </Link>
          <p className="text-xs text-slate-500 truncate">
            {[v.patient_email, v.patient_phone].filter(Boolean).join(" · ") || `ID #${v.patient_id}`}
          </p>
        </div>
      </div>
      <div className="mt-auto pt-1 flex items-center gap-2">
        <Link href={`/appointments/${v.appointment_id}`}
          className="text-sm font-semibold px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-700">
          View visit #{v.appointment_id}
        </Link>
      </div>
    </Card>
  );
}

export interface PatientCardData {
  patient_id: number;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  visit_count: number;
  last_visit?: string | null;
  last_status?: string | null;
  treatment_id?: number | null;
  treatment_status?: string | null;
}

/** Patient card for doctors: photo, name, contacts, visit stats, actions. */
export function PatientCard({ p }: { p: PatientCardData }) {
  const name = p.first_name ? `${p.first_name} ${p.last_name ?? ""}`.trim() : `Patient #${p.patient_id}`;
  return (
    <Card className="p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3">
        <Avatar src={p.avatar_url} firstName={p.first_name ?? "P"} lastName={p.last_name ?? String(p.patient_id)} size={56} />
        <div className="min-w-0 flex-1">
          <Link href={`/patients/${p.patient_id}`} className="font-bold text-lg leading-tight hover:text-teal-700 hover:underline block truncate">
            {name}
          </Link>
          <p className="text-xs text-slate-500 truncate">
            {[p.email, p.phone].filter(Boolean).join(" · ") || `ID #${p.patient_id}`}
          </p>
          {p.city && <p className="text-xs text-slate-400">{p.city}</p>}
        </div>
        {p.treatment_status && <StatusPill status={p.treatment_status} />}
      </div>
      <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
        <span className="font-semibold bg-slate-100 border border-slate-200 rounded-lg px-2 py-1">
          {p.visit_count} visit{p.visit_count === 1 ? "" : "s"}
        </span>
        {p.last_status && <StatusPill status={p.last_status} />}
        {p.last_visit && <span>{fmtDateTime(p.last_visit)}</span>}
      </div>
      <div className="flex gap-2 flex-wrap mt-auto pt-1">
        <Link href={`/patients/${p.patient_id}`}
          className="text-sm font-semibold px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-700">
          View profile
        </Link>
        {p.treatment_id
          ? <Link href={`/cases/${p.treatment_id}`}
              className="text-sm font-semibold px-4 py-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700">
              Open tracking
            </Link>
          : null}
        <MessageButton />
      </div>
    </Card>
  );
}
