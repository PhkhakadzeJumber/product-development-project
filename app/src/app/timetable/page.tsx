"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppointmentApi, SlotApi, ClinicalApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Avatar } from "@/components/Avatar";
import { Card, StatusPill, EmptyState, Skeleton, inputCls } from "@/components/ui";
import { dayKey, fmtDay, timeKey, fmtDateTime } from "@/lib/format";

// Teams-style week grid: columns = days, rows = half-hour times. Matches seed DAY_GRID.
const ROWS = ["09:00", "09:30", "10:00", "10:30", "14:00", "14:30", "15:00", "15:30"];

export default function TimetablePage() {
  const { userId } = useAuth();
  const { data: appts, isLoading } = useQuery({ queryKey: ["doctor-appointments"], queryFn: AppointmentApi.mine });
  const { data: slots } = useQuery({
    queryKey: ["my-slots", userId], queryFn: () => SlotApi.list(userId ?? undefined),
    enabled: !!userId,
  });
  const qc = useQueryClient();
  const setStatus = useMutation({
    mutationFn: ({ id, s }: { id: number; s: string }) => AppointmentApi.setStatus(id, s),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["doctor-appointments"] }),
  });
  const [patientId, setPatientId] = useState("");
  const { data: cases } = useQuery({
    queryKey: ["cases", patientId], queryFn: () => ClinicalApi.cases(patientId ? Number(patientId) : undefined),
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
                    : <div className="space-y-1.5">{items.map(({ a }) => (
                      <Link key={a.appointment_id} href={`/appointments/${a.appointment_id}`}
                        className={`block rounded-xl border p-2 hover:ring-2 hover:ring-teal-500 transition ${a.status === "SCHEDULED" ? "bg-blue-50/70 border-blue-200" : "bg-slate-50 border-slate-200"}`}>
                        <div className="flex items-center gap-1.5">
                          <Avatar firstName="P" lastName={String(a.patient_id)} size={22} />
                          <span className="font-semibold text-xs">Patient #{a.patient_id}</span>
                        </div>
                        <div className="mt-1"><StatusPill status={a.status} /></div>
                        {a.status === "SCHEDULED" && <div className="mt-1.5 flex gap-1" onClick={(e) => e.preventDefault()}>
                          <button onClick={(e) => { e.preventDefault(); setStatus.mutate({ id: a.appointment_id, s: "COMPLETED" }); }}
                            className="text-[11px] font-semibold px-2 py-1 rounded-lg bg-emerald-600 text-white">Complete</button>
                          <button onClick={(e) => { e.preventDefault(); setStatus.mutate({ id: a.appointment_id, s: "NO_SHOW" }); }}
                            className="text-[11px] font-semibold px-2 py-1 rounded-lg bg-white border border-slate-300">No-show</button>
                        </div>}
                      </Link>
                    ))}</div>}
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
        {offGrid.map(({ a, slot }) => <li key={a.appointment_id}><Link className="hover:text-teal-700 hover:underline font-semibold" href={`/appointments/${a.appointment_id}`}>#{a.appointment_id}</Link> · {slot ? fmtDateTime(slot.start_time) : "?"} · Patient #{a.patient_id} · {a.status}</li>)}
      </ul>
    </Card>}
    <Card className="p-5">
      <h2 className="font-bold text-lg">Treatment cases</h2>
      <input className={`${inputCls} mt-3 max-w-xs`} placeholder="Filter by patient_id…" value={patientId} onChange={(e) => setPatientId(e.target.value)} />
      {!cases?.length
        ? <p className="text-sm text-slate-500 mt-3">No cases. Enter a patient ID that has visits with you.</p>
        : <ul className="mt-3 grid sm:grid-cols-2 gap-2">{cases.map((c) => (
          <li key={c.treatment_id} className="border border-slate-200 rounded-xl p-3 text-sm">
            <a className="font-semibold text-teal-700 hover:underline" href={`/cases/${c.treatment_id}`}>#{c.treatment_id} {c.title}</a>
            <span className="ml-2"><StatusPill status={c.status} /></span>
          </li>))}</ul>}
    </Card>
  </div>;
}
