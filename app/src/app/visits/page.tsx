"use client";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppointmentApi } from "@/lib/api";
import { RoleGate } from "@/components/RoleGate";
import { Card, EmptyState, Skeleton, inputCls } from "@/components/ui";
import { VisitCard } from "@/components/VisitCard";
import { dayKey } from "@/lib/format";
import { DelayControl } from "@/components/Care";

export default function AdminVisitsPage() {
  return <RoleGate allow={["HOSPITAL_ADMIN"]}><AdminVisitsInner /></RoleGate>;
}

function AdminVisitsInner() {
  const { data, isLoading } = useQuery({ queryKey: ["admin-visits"], queryFn: AppointmentApi.mineDetailed });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [scope, setScope] = useState<"all" | "today" | "scheduled">("all");

  const todayKey = useMemo(() => dayKey(new Date().toISOString()), []);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((v) => {
      if (status && v.status !== status) return false;
      if (scope === "today" && v.start_time && dayKey(v.start_time) !== todayKey) return false;
      if (scope === "scheduled" && v.status !== "SCHEDULED") return false;
      if (!q) return true;
      const hay = [
        v.doctor_first_name, v.doctor_last_name, v.doctor_email, v.doctor_phone,
        v.patient_first_name, v.patient_last_name, v.patient_email, v.patient_phone,
        String(v.doctor_id), String(v.patient_id), String(v.appointment_id),
      ].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [data, search, status, scope, todayKey]);

  // Reception can post "running late" for any doctor with visits today.
  const todaysDoctors = useMemo(() => {
    const m = new Map<number, string>();
    for (const v of data ?? []) {
      if (v.status === "SCHEDULED" && v.start_time && dayKey(v.start_time) === todayKey) {
        m.set(v.doctor_id, v.doctor_first_name ? `Dr. ${v.doctor_first_name} ${v.doctor_last_name ?? ""}`.trim() : `Doctor #${v.doctor_id}`);
      }
    }
    return Array.from(m.entries());
  }, [data, todayKey]);
  const [delayDoctor, setDelayDoctor] = useState<number | null>(null);
  const delayFor = delayDoctor ?? todaysDoctors[0]?.[0] ?? null;

  const counts = useMemo(() => ({
    all: data?.length ?? 0,
    scheduled: (data ?? []).filter((v) => v.status === "SCHEDULED").length,
    today: (data ?? []).filter((v) => v.start_time && dayKey(v.start_time) === todayKey).length,
  }), [data, todayKey]);

  return <div className="space-y-6">
    <div>
      <h1 className="text-3xl font-bold">Hospital visits</h1>
      <p className="text-slate-500 mt-1">
        {counts.all} visit{counts.all === 1 ? "" : "s"} · {counts.scheduled} scheduled · {counts.today} today
      </p>
    </div>
    {delayFor !== null && <div className="space-y-2">
      {todaysDoctors.length > 1 && (
        <select className={`${inputCls} max-w-xs`} value={delayFor} onChange={(e) => setDelayDoctor(Number(e.target.value))} aria-label="Doctor running late">
          {todaysDoctors.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
      )}
      <DelayControl key={delayFor} doctorId={delayFor}
        title={`Running late today? ${todaysDoctors.find(([id]) => id === delayFor)?.[1] ?? ""}`} />
    </div>}
    <Card className="p-4">
      <div className="grid sm:grid-cols-4 gap-3">
        <input className={inputCls} placeholder="Search doctor, patient, email, phone…" value={search}
          onChange={(e) => setSearch(e.target.value)} aria-label="Search visits" />
        <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status filter">
          <option value="">All statuses</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="NO_SHOW">No-show</option>
        </select>
        <select className={inputCls} value={scope} onChange={(e) => setScope(e.target.value as typeof scope)} aria-label="Time scope">
          <option value="all">All visits</option>
          <option value="today">Happening today</option>
          <option value="scheduled">Scheduled only</option>
        </select>
        <button onClick={() => { setSearch(""); setStatus(""); setScope("all"); }}
          className="text-sm font-semibold text-slate-500 hover:text-slate-800">Clear filters</button>
      </div>
    </Card>
    {isLoading ? <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-64" />)}</div>
    : filtered.length === 0 ? <Card><EmptyState title="No visits found" hint="Try clearing filters." /></Card>
    : <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((v) => <VisitCard key={v.appointment_id} v={v} />)}
      </div>}
  </div>;
}
