"use client";
import { useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { AppointmentApi, ClinicalApi, ProfileApi } from "@/lib/api";
import { RoleGate } from "@/components/RoleGate";
import { Card, EmptyState, Skeleton, inputCls } from "@/components/ui";
import { PatientCard, type PatientCardData } from "@/components/VisitCard";

export default function MyPatientsPage() {
  return <RoleGate allow={["DOCTOR"]}><MyPatientsInner /></RoleGate>;
}

function MyPatientsInner() {
  const { data: appts, isLoading } = useQuery({ queryKey: ["doctor-appointments"], queryFn: AppointmentApi.mineDetailed });
  const { data: cases } = useQuery({ queryKey: ["doctor-cases"], queryFn: () => ClinicalApi.cases() });
  const [search, setSearch] = useState("");

  const caseByPatient = useMemo(() => {
    const m = new Map<number, { treatment_id: number; status: string }>();
    for (const c of cases ?? []) {
      if (!m.has(c.patient_id)) m.set(c.patient_id, { treatment_id: c.treatment_id, status: c.status });
    }
    return m;
  }, [cases]);

  const summary = useMemo(() => {
    const m = new Map<number, { count: number; last?: string | null; lastStatus?: string | null }>();
    for (const a of appts ?? []) {
      const e = m.get(a.patient_id) ?? { count: 0 };
      e.count += 1;
      if (!e.last || (a.start_time && e.last && a.start_time > e.last)) {
        e.last = a.start_time ?? e.last;
        e.lastStatus = a.status;
      }
      if (!e.last) { e.last = a.start_time ?? null; e.lastStatus = a.status; }
      m.set(a.patient_id, e);
    }
    return m;
  }, [appts]);

  const ids = useMemo(() => Array.from(summary.keys()), [summary]);
  const profiles = useQueries({
    queries: ids.map((pid) => ({
      queryKey: ["patient-profile", pid],
      queryFn: () => ProfileApi.patient(pid),
      staleTime: 60_000,
    })),
  });

  const cards: PatientCardData[] = useMemo(() => ids.map((pid, i) => {
    const p = profiles[i]?.data;
    const s = summary.get(pid)!;
    const tc = caseByPatient.get(pid);
    const base = (appts ?? []).find((a) => a.patient_id === pid);
    return {
      patient_id: pid,
      first_name: p?.first_name ?? base?.patient_first_name ?? null,
      last_name: p?.last_name ?? base?.patient_last_name ?? null,
      avatar_url: base?.patient_avatar_url ?? null,
      email: p?.email ?? base?.patient_email ?? null,
      phone: p?.phone ?? base?.patient_phone ?? null,
      city: p?.city ?? null,
      visit_count: s.count,
      last_visit: s.last ?? null,
      last_status: s.lastStatus ?? null,
      treatment_id: tc?.treatment_id ?? null,
      treatment_status: tc?.status ?? null,
    };
  }), [ids, profiles, summary, caseByPatient, appts]);

  const q = search.trim().toLowerCase();
  const filtered = !q ? cards : cards.filter((c) =>
    `${c.first_name ?? ""} ${c.last_name ?? ""} ${c.email ?? ""} ${c.phone ?? ""} ${c.patient_id}`.toLowerCase().includes(q));

  return <div className="space-y-6">
    <div>
      <h1 className="text-3xl font-bold">My patients</h1>
      <p className="text-slate-500 mt-1">{cards.length} patient{cards.length === 1 ? "" : "s"} with visits under your care.</p>
    </div>
    <Card className="p-4">
      <input className={inputCls} placeholder="Search name, email, phone…" value={search}
        onChange={(e) => setSearch(e.target.value)} aria-label="Search patients" />
    </Card>
    {isLoading ? <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-56" />)}</div>
    : filtered.length === 0 ? <Card><EmptyState title="No patients found" hint="Patients appear here after they book visits with you." /></Card>
    : <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((p) => <PatientCard key={p.patient_id} p={p} />)}
      </div>}
  </div>;
}
