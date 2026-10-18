"use client";
import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RenewalApi } from "@/lib/api";
import { ApiError } from "@/lib/api-client";
import { RoleGate } from "@/components/RoleGate";
import { Card, EmptyState, Skeleton, StatusPill, inputCls } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";
import type { Renewal } from "@/types/api";

export default function RenewalsPage() {
  return <RoleGate allow={["DOCTOR"]}><RenewalsInner /></RoleGate>;
}

function RenewalsInner() {
  const { data, isLoading, isError } = useQuery({ queryKey: ["doctor-renewals"], queryFn: () => RenewalApi.list(), refetchInterval: 60_000 });
  const pending = (data ?? []).filter((r) => r.status === "PENDING");
  const decided = (data ?? []).filter((r) => r.status !== "PENDING");
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold">Prescription renewals</h1>
        <p className="text-slate-500 mt-1">Patients on a standing treatment ask for the same prescription again. Approving issues a new prescription with the same drug, dose and frequency; the old one is kept in the history.</p>
      </div>
      {isLoading ? <Skeleton className="h-40" />
      : isError ? <Card><EmptyState title="Could not load renewals" /></Card>
      : <>
        <h2 className="text-xl font-bold">Waiting for you ({pending.length})</h2>
        {!pending.length ? <Card><EmptyState title="No renewal requests" hint="New requests appear here." /></Card>
        : <div className="grid md:grid-cols-2 gap-4">{pending.map((r) => <PendingCard key={r.renewal_id} r={r} />)}</div>}
        {!!decided.length && <>
          <h2 className="text-xl font-bold pt-2">Decided</h2>
          <Card className="divide-y divide-slate-100">
            {decided.map((r) => (
              <div key={r.renewal_id} className="p-3 text-sm flex items-center gap-2 flex-wrap">
                <StatusPill status={r.status} />
                <Link href={`/patients/${r.patient_id}`} className="font-semibold hover:text-teal-700 hover:underline">{r.patient_first_name} {r.patient_last_name}</Link>
                <span className="text-slate-600">{r.drug_name ?? `Prescription #${r.prescription_id}`}</span>
                {r.new_prescription_id && <span className="text-slate-500">→ new prescription #{r.new_prescription_id}</span>}
                {r.doctor_note && <span className="text-slate-500">· “{r.doctor_note}”</span>}
                <span className="ml-auto text-xs text-slate-400">{r.decided_at ? fmtDateTime(r.decided_at) : ""}</span>
              </div>
            ))}
          </Card>
        </>}
      </>}
    </div>
  );
}

const DURATIONS: { label: string; days: number | null }[] = [
  { label: "30 days", days: 30 }, { label: "60 days", days: 60 }, { label: "90 days", days: 90 }, { label: "Open-ended", days: null },
];

function PendingCard({ r }: { r: Renewal }) {
  const qc = useQueryClient();
  const [days, setDays] = useState<number | null>(30);
  const [note, setNote] = useState("");
  const done = () => {
    qc.invalidateQueries({ queryKey: ["doctor-renewals"] });
    qc.invalidateQueries({ queryKey: ["renewal-count"] });
  };
  const approve = useMutation({ mutationFn: () => RenewalApi.approve(r.renewal_id, days, note.trim() || undefined), onSuccess: done });
  const decline = useMutation({ mutationFn: () => RenewalApi.decline(r.renewal_id, note.trim() || undefined), onSuccess: done });
  const busy = approve.isPending || decline.isPending;
  const err = approve.error ?? decline.error;
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Link href={`/patients/${r.patient_id}`} className="font-bold hover:text-teal-700 hover:underline">{r.patient_first_name} {r.patient_last_name}</Link>
        <span className="ml-auto text-xs text-slate-400">{r.created_at ? fmtDateTime(r.created_at) : ""}</span>
      </div>
      <div className="text-sm">
        {r.drug_id ? <Link href={`/drugs/${r.drug_id}`} className="font-semibold hover:text-teal-700 hover:underline">{r.drug_name}</Link> : <span className="font-semibold">Prescription #{r.prescription_id}</span>}
        <span className="text-slate-600">{[r.dosage, r.frequency].filter(Boolean).length ? ` · ${[r.dosage, r.frequency].filter(Boolean).join(" · ")}` : ""}</span>
        {r.prescription_status && r.prescription_status !== "ACTIVE" && <span className="ml-2"><StatusPill status={r.prescription_status} /></span>}
      </div>
      {r.patient_note && <p className="text-sm bg-slate-50 border border-slate-200 rounded-xl p-2.5">“{r.patient_note}”</p>}
      <div className="flex gap-1.5 flex-wrap" role="radiogroup" aria-label="Renewal length">
        {DURATIONS.map((d) => (
          <button key={d.label} type="button" role="radio" aria-checked={days === d.days} onClick={() => setDays(d.days)}
            className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${days === d.days ? "bg-slate-900 text-white border-slate-900" : "border-slate-300 bg-white"}`}>{d.label}</button>
        ))}
      </div>
      <input className={inputCls} maxLength={500} placeholder="Note to the patient (optional, shown in the app)" value={note} onChange={(e) => setNote(e.target.value)} aria-label="Note to patient" />
      <div className="flex gap-2">
        <button onClick={() => approve.mutate()} disabled={busy}
          className="text-sm font-semibold px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-50">{approve.isPending ? "Renewing…" : "Approve renewal"}</button>
        <button onClick={() => decline.mutate()} disabled={busy}
          className="text-sm font-semibold px-4 py-2 rounded-xl border border-slate-300 disabled:opacity-50">Needs a visit</button>
      </div>
      {err && <p className="text-sm text-rose-600" role="alert">{err instanceof ApiError ? err.message : "Could not save."}</p>}
    </Card>
  );
}
