"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ClinicalApi, CatalogApi } from "@/lib/api";
import { useState } from "react";
import { DrugImage } from "@/components/Avatar";
import { ScheduleLine } from "@/components/RxSchedule";
import { Card, StatusPill, EmptyState, Skeleton } from "@/components/ui";
import { RoleGate } from "@/components/RoleGate";

export default function PrescriptionsPage() {
  return <RoleGate allow={["PATIENT"]}><PrescriptionsInner /></RoleGate>;
}

function PrescriptionsInner() {
  const { data, isLoading, isError } = useQuery({ queryKey: ["my-prescriptions"], queryFn: ClinicalApi.myPrescriptions });
  const { data: drugs } = useQuery({ queryKey: ["drugs"], queryFn: () => CatalogApi.drugs() });
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
        </div>
      </Card>;
    })}</div>}
  </div>;
}
