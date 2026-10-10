"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppointmentApi, SlotApi, ClinicalApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { RoleGate } from "@/components/RoleGate";
import { Avatar } from "@/components/Avatar";
import { Card, StatusPill, EmptyState, Skeleton, inputCls } from "@/components/ui";
import { PatientCard, type PatientCardData } from "@/components/VisitCard";
import { dayKey, fmtDay, timeKey, fmtDateTime } from "@/lib/format";

// Teams-style week grid: columns = days, rows = half-hour times. Matches seed DAY_GRID.
const ROWS = ["09:00", "09:30", "10:00", "10:30", "14:00", "14:30", "15:00", "15:30"];

export default function TimetablePage() {
  return <RoleGate allow={["DOCTOR"]}><TimetableInner /></RoleGate>;
}

function TimetableInner() {
  const { userId } = useAuth();
  const { data: appts, isLoading } = useQuery({ queryKey: ["doctor-appointments"], queryFn: AppointmentApi.mineDetailed });
  const { data: slots } = useQuery({
    queryKey: ["my-slots", userId], queryFn: () => SlotApi.list(userId ?? undefined),
    enabled: !!userId,
  });
  const qc = useQueryClient();
  const setStatus = useMutation({
    mutationFn: ({ id, s }: { id: number; s: string }) => AppointmentApi.setStatus(id, s),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["doctor-appointments"] }),
  });
  const [search, setSearch] = useState("");
  const { data: cases } = useQuery({
    queryKey: ["doctor-cases"], queryFn: () => ClinicalApi.cases(),
  });

  const slotById = useMemo(() => new Map((slots ?? []).map((s) => [s.slot_id, s])), [slots]);
  const { days, grid, offGrid } = useMemo(() => {
    const withTime = (appts ?? []).map((a) => ({ a, slot: slotById.get(a.slot_id) }))
      .filter((x) => x.slot);
    const daySet = Array.from(new Set(withTime.map((x) => dayKey(x.slot!.start_time)))).sort().slice(0, 7);
    const cell = new Map<string, typeof withTime>();
    const off: typeof withTime = [];
    for (const x of withTime) {
      const dk = dayKey(x.slot!.start_time);
      const tk = timeKey(x.slot!.start_time);
      if (!daySet.includes(dk) || !ROWS.includes(tk)) { off.push(x); continue; }
      const k = `${dk}|${tk}`;
      if (!cell.has(k)) cell.set(k, []);
      cell.get(k)!.push(x);
    }
    return { days: daySet, grid: cell, offGrid: off };
  }, [appts, slotById]);

  const patients: PatientCardData[] = useMemo(() => {
    const byPatient = new Map<number, PatientCardData>();
    const caseByPatient = new Map<number, { treatment_id: number; status: string }>();
    for (const c of cases ?? []) {
      if (!caseByPatient.has(c.patient_id)) caseByPatient.set(c.patient_id, { treatment_id: c.treatment_id, status: c.status });
    }
    for (const a of appts ?? []) {
      const prev = byPatient.get(a.patient_id);
      const tc = caseByPatient.get(a.patient_id);
      if (!prev) {
        byPatient.set(a.patient_id, {
          patient_id: a.patient_id,
          first_name: a.patient_first_name ?? null,
          last_name: a.patient_last_name ?? null,
          avatar_url: a.patient_avatar_url ?? null,
          email: a.patient_email ?? null,
          phone: a.patient_phone ?? null,
          visit_count: 1,
          last_visit: a.start_time ?? null,
          last_status: a.status,
          treatment_id: tc?.treatment_id ?? null,
          treatment_status: tc?.status ?? null,
        });
      } else {
        prev.visit_count += 1;
        if (a.start_time && (!prev.last_visit || a.start_time > prev.last_visit)) {
          prev.last_visit = a.start_time;
          prev.last_status = a.status;
        }
        if (!prev.first_name && a.patient_first_name) { prev.first_name = a.patient_first_name; prev.last_name = a.patient_last_name; }
        if (!prev.avatar_url && a.patient_avatar_url) prev.avatar_url = a.patient_avatar_url;
        if (!prev.email && a.patient_email) prev.email = a.patient_email;
        if (!prev.phone && a.patient_phone) prev.phone = a.patient_phone;
        if (!prev.treatment_id && tc) { prev.treatment_id = tc.treatment_id; prev.treatment_status = tc.status; }
      }
    }
    return Array.from(byPatient.values());
  }, [appts, cases]);

  const q = search.trim().toLowerCase();
  const filteredPatients = !q ? patients : patients.filter((p) =>
    `${p.first_name ?? ""} ${p.last_name ?? ""} ${p.email ?? ""} ${p.phone ?? ""} ${p.patient_id}`.toLowerCase().includes(q));

  return <div className="space-y-6">
    <div><h1 className="text-3xl font-bold">Timetable</h1>
    <p className="text-slate-500 mt-1">Your week at a glance — like Teams calendar. Click complete / no-show inline.</p></div>
    {isLoading ? <Skeleton className="h-96" />
    : days.length === 0 ? <Card><EmptyState title="No scheduled visits with times" hint="Appointments appear here once slots carry start times." /></Card>
    : <Card className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm border-collapse">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/70">
            <th className="text-left font-semibold text-slate-500 p-3 w-20">Time</th>
            {days.map((d) => <th key={d} className="text-left font-semibold p-3">{fmtDay(d)}</th>)}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((t) => (
            <tr key={t} className="border-b border-slate-100 last:border-0 align-top">
              <td className="p-3 text-slate-400 font-medium whitespace-nowrap">{t}</td>
              {days.map((d) => {
                const items = grid.get(`${d}|${t}`) ?? [];
                return <td key={d} className="p-1.5 min-w-[160px]">
                  {items.length === 0
                    ? <div className="h-9 rounded-lg bg-slate-50 border border-dashed border-slate-200" />
                    : <div className="space-y-1.5">{items.map(({ a }) => {
                      const pname = a.patient_first_name ? `${a.patient_first_name} ${a.patient_last_name ?? ""}`.trim() : `Patient #${a.patient_id}`;
                      return <div key={a.appointment_id}
                        className={`block rounded-xl border p-2 hover:ring-2 hover:ring-teal-500 transition ${a.status === "SCHEDULED" ? "bg-blue-50/70 border-blue-200" : "bg-slate-50 border-slate-200"}`}>
                        <div className="flex items-center gap-1.5">
                          <Avatar src={a.patient_avatar_url} firstName={a.patient_first_name ?? "P"} lastName={a.patient_last_name ?? String(a.patient_id)} size={22} />
                          <Link href={`/patients/${a.patient_id}`}
                            className="font-semibold text-xs hover:text-teal-700 hover:underline truncate">{pname}</Link>
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          <StatusPill status={a.status} />
                          <Link href={`/appointments/${a.appointment_id}`} className="text-[11px] font-semibold text-teal-700 hover:underline">Open visit</Link>
                        </div>
                        {a.status === "SCHEDULED" && <div className="mt-1.5 flex gap-1">
                          <button onClick={() => setStatus.mutate({ id: a.appointment_id, s: "COMPLETED" })}
                            className="text-[11px] font-semibold px-2 py-1 rounded-lg bg-emerald-600 text-white">Complete</button>
                          <button onClick={() => setStatus.mutate({ id: a.appointment_id, s: "NO_SHOW" })}
                            className="text-[11px] font-semibold px-2 py-1 rounded-lg bg-white border border-slate-300">No-show</button>
                        </div>}
                      </div>;
                    })}</div>}
                </td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>}
    {offGrid.length > 0 && <Card className="p-4">
      <h2 className="font-bold mb-2">Outside grid ({offGrid.length})</h2>
      <ul className="text-sm text-slate-600 space-y-1">
        {offGrid.map(({ a, slot }) => {
          const pname = a.patient_first_name ? `${a.patient_first_name} ${a.patient_last_name ?? ""}`.trim() : `Patient #${a.patient_id}`;
          return <li key={a.appointment_id}><Link className="hover:text-teal-700 hover:underline font-semibold" href={`/appointments/${a.appointment_id}`}>#{a.appointment_id}</Link> · {slot ? fmtDateTime(slot.start_time) : "?"} · <Link className="hover:text-teal-700 hover:underline font-semibold" href={`/patients/${a.patient_id}`}>{pname}</Link> · {a.status}</li>;
        })}
      </ul>
    </Card>}
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold">My patients</h2>
          <p className="text-slate-500 mt-0.5 text-sm">{patients.length} patient{patients.length === 1 ? "" : "s"} under your care.</p>
        </div>
        <Link href="/my-patients" className="ml-auto text-sm font-semibold px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-700">
          Open full page →
        </Link>
      </div>
      <input className={`${inputCls} max-w-xs`} placeholder="Search patients…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search patients" />
      {!filteredPatients.length
        ? <Card><EmptyState title="No patients yet" hint="Patients appear here after they book visits with you." /></Card>
        : <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPatients.map((p) => <PatientCard key={p.patient_id} p={p} />)}
          </div>}
    </div>
  </div>;
}
