"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { CatalogApi, ClinicalApi } from "@/lib/api";
import { DrugImage } from "@/components/Avatar";
import { Card, StatusPill, EmptyState, Skeleton } from "@/components/ui";

export default function DrugDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const { data: drug, isLoading } = useQuery({
    queryKey: ["drug", id],
    queryFn: () => CatalogApi.drug(id),
    enabled: Number.isFinite(id),
  });
  const { data: prescriptions } = useQuery({
    queryKey: ["my-prescriptions"],
    queryFn: ClinicalApi.myPrescriptions,
  });
  const mine = (prescriptions ?? []).filter((p) => p.drug_id === id);

  if (isLoading) return <div className="space-y-3"><Skeleton className="h-40" /><Skeleton className="h-28" /></div>;
  if (!drug) return <Card><EmptyState title="Drug not found" hint="Try the drugs list." /></Card>;

  return (
    <div className="space-y-6">
      <Link href="/drugs" className="text-sm font-semibold text-slate-500 hover:text-slate-800">← All drugs</Link>
      <Card className="p-6 flex gap-5 flex-wrap sm:flex-nowrap">
        <DrugImage src={drug.image_url} name={drug.name} size={120} />
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold">{drug.name}</h1>
          <div className="mt-2 flex gap-2 flex-wrap">
            {drug.strength && <StatusPill status={drug.strength} />}
            {drug.form && <StatusPill status={drug.form} />}
          </div>
          {drug.generic_name && <p className="text-sm text-slate-500 mt-2">Generic: {drug.generic_name}</p>}
          {drug.description ? (
            <p className="text-sm text-slate-600 mt-3 whitespace-pre-line">{drug.description}</p>
          ) : (
            <p className="text-sm text-slate-500 mt-3">No description provided.</p>
          )}
          <p className="text-xs text-slate-400 mt-3">Always follow your doctor&apos;s dosage — this page is informational.</p>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="font-bold text-lg">Your prescriptions with this drug</h2>
        {!mine.length ? (
          <p className="text-sm text-slate-500 mt-2">No prescriptions for this drug. Active prescriptions appear under <Link href="/prescriptions" className="underline font-semibold text-teal-700">Prescriptions</Link>.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {mine.map((p) => (
              <li key={p.prescription_id} className="border border-slate-200 rounded-xl p-3 text-sm">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">Prescription #{p.prescription_id}</span>
                  <StatusPill status={p.status} />
                </div>
                <p className="text-slate-600 mt-1">
                  {[p.dosage, p.frequency, p.route].filter(Boolean).join(" · ") || "See your doctor for dosage details."}
                </p>
                {p.instructions && <p className="text-slate-500 mt-1">{p.instructions}</p>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
