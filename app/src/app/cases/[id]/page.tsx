"use client";
import { useQuery } from "@tanstack/react-query";
import { ClinicalApi } from "@/lib/api";
import { Card, StatusPill, Skeleton } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";

const DOT: Record<string, string> = {
  IMPROVING: "bg-emerald-500", STABLE: "bg-blue-500", WORSENING: "bg-amber-500", RESOLVED: "bg-slate-400",
};

interface CaseInfo {
  treatment_id?: number; patient_id?: number; title?: string; diagnosis?: string;
  icd_code?: string; severity?: string; status?: string; started_on?: string; ended_on?: string;
}

function Section({ label, text }: { label: string; text: unknown }) {
  if (!text || typeof text !== "string") return null;
  return (
    <p className="text-sm text-slate-700 mt-2">
      <b>{label}:</b> {text}
    </p>
  );
}

export default function CaseTimeline({ params }: { params: { id: string } }) {
  const { data, isLoading } = useQuery({ queryKey: ["timeline", params.id], queryFn: () => ClinicalApi.timeline(Number(params.id)) });
  const consults = data?.consultations ?? [];
  const c = (data?.case ?? {}) as CaseInfo;

  return <div className="space-y-5 max-w-3xl">
    <div><h1 className="text-3xl font-bold">{c.title ? c.title : `Case #${params.id}`}</h1>
    <p className="text-slate-500 mt-1">{c.diagnosis ?? "Treatment timeline"}</p></div>
    {!isLoading && data?.case && (
      <Card className="p-4 flex flex-wrap items-center gap-2 text-sm">
        {c.status && <StatusPill status={String(c.status)} />}
        {c.severity && <StatusPill status={String(c.severity)} />}
        {c.icd_code && <span className="text-slate-500">ICD {String(c.icd_code)}</span>}
        {c.started_on && <span className="text-slate-500">Started {String(c.started_on)}</span>}
        {c.ended_on && <span className="text-slate-500">→ ended {String(c.ended_on)}</span>}
        {c.patient_id !== undefined && <span className="ml-auto text-slate-500">Patient #{String(c.patient_id)} · {consults.length} visit{consults.length === 1 ? "" : "s"}</span>}
      </Card>
    )}
    {isLoading ? <div className="space-y-3"><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
    : consults.length === 0 ? <Card className="p-8 text-center text-slate-500">No consultations recorded yet.</Card>
    : <ol className="relative border-l-2 border-slate-200 ml-2 space-y-4">
      {consults.map((item, idx) => {
        const status = String(item.condition_status ?? "STABLE");
        const vitals = item.vitals as Record<string, string | number> | null | undefined;
        return <li key={String(item.consultation_id)} className="ml-6 relative">
          <span className={`absolute -left-[31px] top-4 w-3.5 h-3.5 rounded-full border-2 border-white shadow ${DOT[status] ?? "bg-teal-500"}`} />
          <Card className="p-4">
            <div className="flex items-center gap-2 flex-wrap text-sm">
              <span className="font-semibold">Visit {idx + 1} · {item.created_at ? fmtDateTime(String(item.created_at)) : `#${String(item.consultation_id)}`}</span>
              <StatusPill status={status} />
              {item.appointment_id !== undefined && <span className="text-slate-400">appt #{String(item.appointment_id)}</span>}
            </div>
            <Section label="Chief complaint" text={item.chief_complaint} />
            <Section label="Symptoms" text={item.symptoms} />
            <Section label="Examination" text={item.examination_notes} />
            {vitals && typeof vitals === "object" && Object.keys(vitals).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {Object.entries(vitals).map(([k, v]) => (
                  <span key={k} className="text-xs font-medium bg-slate-100 border border-slate-200 rounded-lg px-2 py-1">{k}: {String(v)}</span>
                ))}
              </div>
            )}
            {typeof item.follow_up_plan === "string" && item.follow_up_plan && (
              <p className="mt-2 text-sm bg-teal-50/70 border border-teal-200 rounded-xl p-2.5 text-teal-900"><b>Plan:</b> {item.follow_up_plan}</p>
            )}
          </Card>
        </li>;
      })}
    </ol>}
  </div>;
}
