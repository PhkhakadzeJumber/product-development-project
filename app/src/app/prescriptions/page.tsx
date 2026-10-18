"use client";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClinicalApi, CatalogApi, RenewalApi } from "@/lib/api";
import { ApiError } from "@/lib/api-client";
import type { Prescription, Renewal } from "@/types/api";
import { fmtDateTime } from "@/lib/format";
import { useState } from "react";
import { DrugImage } from "@/components/Avatar";
import { ScheduleLine } from "@/components/RxSchedule";
import { Card, StatusPill, EmptyState, Skeleton, inputCls } from "@/components/ui";
import { RoleGate } from "@/components/RoleGate";

export default function PrescriptionsPage() {
  return <RoleGate allow={["PATIENT"]}><PrescriptionsInner /></RoleGate>;
}

function PrescriptionsInner() {
  const { data, isLoading, isError } = useQuery({ queryKey: ["my-prescriptions"], queryFn: ClinicalApi.myPrescriptions });
  const { data: drugs } = useQuery({ queryKey: ["drugs"], queryFn: () => CatalogApi.drugs() });
  const { data: renewals } = useQuery({ queryKey: ["my-renewals"], queryFn: () => RenewalApi.list() });
  // Latest renewal request per prescription (list comes newest first).
  const latestRenewal = new Map<number, Renewal>();
  for (const r of renewals ?? []) if (!latestRenewal.has(r.prescription_id)) latestRenewal.set(r.prescription_id, r);
  const [tab, setTab] = useState<"ACTIVE" | "ALL">("ACTIVE");
  const byId = new Map((drugs ?? []).map((d) => [d.drug_id, d]));
  const rows = (data ?? []).filter((p) => tab === "ALL" || p.status === "ACTIVE");

  return <div className="space-y-5">
    <div className="flex items-end gap-4 flex-wrap">
      <div><h1 className="text-3xl font-bold">Prescriptions</h1>
      <p className="text-slate-500 mt-1">Your current medication and history.</p></div>
      <div className="ml-auto flex bg-white border border-slate-200 rounded-xl p-1 text-sm font-semibold">
        {(["ACTIVE", "ALL"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg ${tab === t ? "bg-slate-900 text-white" : "text-slate-500"}`}>{t === "ALL" ? "History" : "Current"}</button>
        ))}
      </div>
    </div>
    {isLoading ? <div className="grid sm:grid-cols-2 gap-4"><Skeleton className="h-28" /><Skeleton className="h-28" /></div>
    : isError ? <Card><EmptyState title="Could not load prescriptions" hint="Check your connection and try again." /></Card>
    : rows.length === 0 ? <Card><EmptyState title={tab === "ACTIVE" ? "No active prescriptions" : "No prescriptions"} hint="Prescriptions from your consultations appear here." /></Card>
    : <div className="grid sm:grid-cols-2 gap-4">{rows.map((p) => {
      const drug = byId.get(p.drug_id);
      return <Card key={p.prescription_id} className="p-4 flex gap-4">
        <DrugImage src={drug?.image_url} name={drug?.name ?? `drug ${p.drug_id}`} size={64} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/drugs/${p.drug_id}`} className="font-bold hover:text-teal-700 hover:underline">{drug?.name ?? `Drug #${p.drug_id}`}{drug?.strength ? ` · ${drug.strength}` : ""}</Link>
            <StatusPill status={p.status} />
          </div>
          <p className="text-xs text-slate-500 mt-0.5">#{p.prescription_id}{drug?.form ? ` · ${drug.form}` : ""}{drug?.generic_name ? ` · ${drug.generic_name}` : ""}</p>
          {(p.dosage || p.frequency || p.instructions) && (
            <p className="text-sm text-slate-600 mt-1">{[p.dosage, p.frequency, p.route].filter(Boolean).join(" · ")}{p.instructions ? ` — ${p.instructions}` : ""}</p>
          )}
          <ScheduleLine rx={p} status={p.status} />
          {p.supersedes_id != null && (
            <p className="mt-1 text-xs font-semibold text-slate-500">Replaces prescription #{p.supersedes_id}</p>
          )}
          <Link href={`/drugs/${p.drug_id}`} className="inline-block mt-1 text-sm font-semibold text-teal-700 hover:underline">View drug details →</Link>
          <RenewalBox rx={p} latest={latestRenewal.get(p.prescription_id)} />
        </div>
      </Card>;
    })}</div>}
  </div>;
}

/** Ask the doctor for the same prescription again instead of a trip to the clinic. */
function RenewalBox({ rx, latest }: { rx: Prescription; latest?: Renewal }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const done = () => {
    setOpen(false);
    setNote("");
    qc.invalidateQueries({ queryKey: ["my-renewals"] });
    qc.invalidateQueries({ queryKey: ["my-prescriptions"] });
  };
  const request = useMutation({ mutationFn: () => RenewalApi.request(rx.prescription_id, note.trim() || undefined), onSuccess: done });
  const cancel = useMutation({ mutationFn: (id: number) => RenewalApi.cancel(id), onSuccess: done });
  if (rx.status === "DISCONTINUED") return null;

  if (latest?.status === "PENDING") {
    return (
      <div className="mt-2 text-sm bg-amber-50 border border-amber-200 rounded-xl p-2.5">
        <span className="font-semibold text-amber-800">Renewal requested</span>
        <span className="text-amber-800">{latest.created_at ? ` · ${fmtDateTime(latest.created_at)}` : ""} · waiting for your doctor</span>
        <button onClick={() => cancel.mutate(latest.renewal_id)} disabled={cancel.isPending}
          className="ml-2 font-semibold text-slate-500 hover:text-slate-800">Cancel request</button>
      </div>
    );
  }
  if (latest?.status === "APPROVED" && latest.new_prescription_id && rx.status !== "ACTIVE") {
    return <p className="mt-2 text-sm font-semibold text-emerald-700">Renewed ✓ — see prescription #{latest.new_prescription_id}{latest.doctor_note ? ` · “${latest.doctor_note}”` : ""}</p>;
  }
  return (
    <div className="mt-2 space-y-2">
      {latest?.status === "DECLINED" && (
        <p className="text-sm bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-2.5">
          Your doctor needs to see you before renewing{latest.doctor_note ? `: “${latest.doctor_note}”` : "."}{" "}
          <Link href={`/doctors/${rx.doctor_id}/slots`} className="font-semibold underline">Book a visit</Link>
        </p>
      )}
      {!open ? (
        <button onClick={() => { setOpen(true); request.reset(); }}
          className="text-sm font-semibold px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-700 text-white">Request renewal</button>
      ) : (
        <div className="space-y-2">
          <input className={inputCls} maxLength={500} placeholder="Note for the doctor (optional), e.g. last tablets on Friday"
            value={note} onChange={(e) => setNote(e.target.value)} aria-label="Renewal note" />
          <div className="flex gap-2">
            <button onClick={() => request.mutate()} disabled={request.isPending}
              className="text-sm font-semibold px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-50">
              {request.isPending ? "Sending…" : "Send request"}
            </button>
            <button onClick={() => setOpen(false)} className="text-sm font-semibold px-3 py-1.5 text-slate-500">Cancel</button>
          </div>
        </div>
      )}
      {request.isError && <p className="text-sm text-rose-600" role="alert">{request.error instanceof ApiError ? request.error.message : "Could not send the request."}</p>}
    </div>
  );
}
