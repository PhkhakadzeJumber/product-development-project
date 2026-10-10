"use client";
import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ClinicalApi, CatalogApi, ProfileApi } from "@/lib/api";
import { ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth";
import type { ConsultationRx, TimelineConsultation } from "@/types/api";
import { Card, EmptyState, StatusPill, Skeleton, inputCls } from "@/components/ui";
import { MessageButton } from "@/components/VisitCard";
import { RoleGate } from "@/components/RoleGate";
import { ScheduleLine } from "@/components/RxSchedule";
import { fmtDateTime } from "@/lib/format";

const DOT: Record<string, string> = {
  IMPROVING: "bg-emerald-500", STABLE: "bg-blue-500", WORSENING: "bg-amber-500", RESOLVED: "bg-slate-400",
};

interface CaseInfo {
  treatment_id?: number; patient_id?: number; doctor_id?: number; title?: string; diagnosis?: string;
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

function RxFields({ value, onChange, prefix }: {
  value: Record<string, string>; onChange: (v: Record<string, string>) => void; prefix: string;
}) {
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...value, [k]: e.target.value });
  return (
    <div className="grid sm:grid-cols-2 gap-2">
      <input id={`${prefix}-dosage`} className={inputCls} placeholder="Dosage (e.g. 400mg)" value={value.dosage ?? ""} onChange={set("dosage")} />
      <input id={`${prefix}-freq`} className={inputCls} placeholder="Frequency (e.g. twice a day)" value={value.frequency ?? ""} onChange={set("frequency")} />
      <input id={`${prefix}-duration`} className={inputCls} placeholder="For how long? (e.g. for about a month)" value={value.duration_note ?? ""} onChange={set("duration_note")} maxLength={120} />
      <input id={`${prefix}-drug`} className={inputCls} placeholder="Drug ID" value={value.drug_id ?? ""} onChange={set("drug_id")} inputMode="numeric" />
      <input id={`${prefix}-start`} className={inputCls} type="date" title="Start date" value={value.start_date ?? ""} onChange={set("start_date")} />
      <input id={`${prefix}-instr`} className={`${inputCls} sm:col-span-2`} placeholder="Instructions (optional)" value={value.instructions ?? ""} onChange={set("instructions")} />
    </div>
  );
}

export default function CaseTimeline({ params }: { params: { id: string } }) {
  return <RoleGate allow={["DOCTOR", "PATIENT"]}><CaseTimelineInner params={params} /></RoleGate>;
}

function CaseTimelineInner({ params }: { params: { id: string } }) {
  const caseId = Number(params.id);
  const { role } = useAuth();
  const qc = useQueryClient();
  const isDoctor = role === "DOCTOR";
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["timeline", params.id],
    queryFn: () => ClinicalApi.timeline(caseId),
    enabled: Number.isFinite(caseId),
    retry: (count, err) => err instanceof ApiError && (err.status === 403 || err.status === 404) ? false : count < 2,
  });
  const consults = (data?.consultations ?? []) as TimelineConsultation[];
  const c = (data?.case ?? {}) as CaseInfo;
  const isInTreatment = String(c.status ?? "") === "IN_TREATMENT";
  const { data: drugs } = useQuery({ queryKey: ["drugs"], queryFn: () => CatalogApi.drugs(), enabled: isDoctor });
  const drugById = new Map((drugs ?? []).map((d) => [d.drug_id, d]));
  const { data: doctorContact } = useQuery({
    queryKey: ["doctor-contact", c.doctor_id],
    queryFn: () => ProfileApi.doctorContact(Number(c.doctor_id)),
    enabled: !isDoctor && !!c.doctor_id,
  });

  const [editingCase, setEditingCase] = useState(false);
  const [caseForm, setCaseForm] = useState({ diagnosis: "", status: "" });
  const [editingConsult, setEditingConsult] = useState<number | null>(null);
  const [consultForm, setConsultForm] = useState({ symptoms: "", examination_notes: "", follow_up_plan: "" });
  const [rxAction, setRxAction] = useState<{ kind: "edit" | "substitute" | "discontinue"; rx: ConsultationRx } | null>(null);
  const [rxForm, setRxForm] = useState<Record<string, string>>({});
  const [rxReason, setRxReason] = useState("");
  const [adding, setAdding] = useState(false);
  const [newVisit, setNewVisit] = useState({ appointment_id: "", chief_complaint: "", symptoms: "", examination_notes: "", follow_up_plan: "" });
  const [newRx, setNewRx] = useState<Record<string, string>>({});
  const [formErr, setFormErr] = useState("");
  const invalidate = () => qc.invalidateQueries({ queryKey: ["timeline", params.id] });

  const saveCase = useMutation({
    mutationFn: () => ClinicalApi.updateCase(caseId, {
      ...(caseForm.diagnosis ? { diagnosis: caseForm.diagnosis } : {}),
      ...(caseForm.status ? { status: caseForm.status } : {}),
    }),
    onSuccess: () => { setEditingCase(false); invalidate(); },
    onError: (e) => setFormErr(e instanceof ApiError ? e.message : "Could not update case."),
  });
  const saveConsult = useMutation({
    mutationFn: (id: number) => ClinicalApi.updateConsultation(id, {
      ...(consultForm.symptoms ? { symptoms: consultForm.symptoms } : {}),
      ...(consultForm.examination_notes ? { examination_notes: consultForm.examination_notes } : {}),
      ...(consultForm.follow_up_plan ? { follow_up_plan: consultForm.follow_up_plan } : {}),
    }),
    onSuccess: () => { setEditingConsult(null); invalidate(); },
    onError: (e) => setFormErr(e instanceof ApiError ? e.message : "Could not update visit."),
  });
  const rxMutate = useMutation({
    mutationFn: () => {
      if (!rxAction) throw new Error("No prescription selected");
      const id = rxAction.rx.prescription_id;
      if (rxAction.kind === "discontinue") return ClinicalApi.discontinuePrescription(id, rxReason.trim() || undefined);
      const body = {
        ...(rxForm.dosage ? { dosage: rxForm.dosage } : {}),
        ...(rxForm.frequency ? { frequency: rxForm.frequency } : {}),
        ...(rxForm.duration_note ? { duration_note: rxForm.duration_note } : {}),
        ...(rxForm.start_date ? { start_date: rxForm.start_date } : {}),
        ...(rxForm.instructions ? { instructions: rxForm.instructions } : {}),
      };
      if (rxAction.kind === "edit") return ClinicalApi.updatePrescription(id, body);
      return ClinicalApi.substitutePrescription(id, {
        ...body,
        drug_id: Number(rxForm.drug_id),
        ...(rxReason.trim() ? { reason: rxReason.trim() } : {}),
      });
    },
    onSuccess: () => { setRxAction(null); setRxForm({}); setRxReason(""); invalidate(); },
    onError: (e) => setFormErr(e instanceof ApiError ? e.message : "Prescription update failed."),
  });
  const addVisit = useMutation({
    mutationFn: async () => {
      const con = await ClinicalApi.createConsultation({
        appointment_id: Number(newVisit.appointment_id),
        treatment_id: caseId,
        chief_complaint: newVisit.chief_complaint || null,
        symptoms: newVisit.symptoms || null,
        examination_notes: newVisit.examination_notes || null,
        follow_up_plan: newVisit.follow_up_plan || null,
      });
      if (newRx.drug_id) {
        await ClinicalApi.createPrescription({
          consultation_id: con.consultation_id, treatment_id: caseId,
          patient_id: c.patient_id, drug_id: Number(newRx.drug_id),
          dosage: newRx.dosage || null, frequency: newRx.frequency || null,
          duration_note: newRx.duration_note || null,
          start_date: newRx.start_date || null,
          instructions: newRx.instructions || null,
        });
      }
      return con;
    },
    onSuccess: () => {
      setAdding(false);
      setNewVisit({ appointment_id: "", chief_complaint: "", symptoms: "", examination_notes: "", follow_up_plan: "" });
      setNewRx({});
      invalidate();
    },
    onError: (e) => setFormErr(e instanceof ApiError ? e.message : "Could not add visit."),
  });

  function openRx(kind: "edit" | "substitute" | "discontinue", rx: ConsultationRx) {
    setRxAction({ kind, rx });
    setRxForm({
      drug_id: String(rx.drug_id), dosage: rx.dosage ?? "", frequency: rx.frequency ?? "",
      duration_note: rx.duration_note ?? "", start_date: rx.start_date ?? "",
      instructions: (rx as unknown as { instructions?: string }).instructions ?? "",
    });
    setRxReason("");
    setFormErr("");
  }

  return <div className="space-y-5 max-w-3xl">
    <div><h1 className="text-3xl font-bold">{c.title ? c.title : `Case #${params.id}`}</h1>
    <p className="text-slate-500 mt-1">{c.diagnosis ?? "Treatment timeline"}</p></div>
    {isError && (
      <Card><EmptyState
        title={error instanceof ApiError && error.status === 403 ? "Not authorized" : "Case not found"}
        hint={error instanceof ApiError && error.status === 403
          ? "Treatment cases are only visible to doctors and patients."
          : "It may belong to another patient or doctor."}
      /></Card>
    )}
    {!isError && !isLoading && data?.case && (
      <Card className="p-4 flex flex-wrap items-center gap-2 text-sm">
        {c.status && <StatusPill status={String(c.status)} />}
        {c.severity && <StatusPill status={String(c.severity)} />}
        {c.icd_code && <span className="text-slate-500">ICD {String(c.icd_code)}</span>}
        {c.started_on && <span className="text-slate-500">Started {String(c.started_on)}</span>}
        {c.ended_on && <span className="text-slate-500">→ ended {String(c.ended_on)}</span>}
        {c.patient_id !== undefined && <span className="ml-auto text-slate-500">
          <Link className="font-semibold text-teal-700 hover:underline" href={`/patients/${String(c.patient_id)}`}>
            Patient #{String(c.patient_id)}
          </Link> · {consults.length} visit{consults.length === 1 ? "" : "s"}</span>}
        {isDoctor && isInTreatment && !editingCase && (
          <button onClick={() => { setCaseForm({ diagnosis: String(c.diagnosis ?? ""), status: "" }); setEditingCase(true); }}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50">Edit case</button>
        )}
      </Card>
    )}
    {editingCase && isInTreatment && (
      <Card className="p-4 space-y-2">
        <h2 className="font-bold">Edit case</h2>
        <input className={inputCls} placeholder="Diagnosis" value={caseForm.diagnosis}
          onChange={(e) => setCaseForm({ ...caseForm, diagnosis: e.target.value })} />
        <select className={inputCls} value={caseForm.status} onChange={(e) => setCaseForm({ ...caseForm, status: e.target.value })}>
          <option value="">Keep status</option>
          {["OPEN", "IN_TREATMENT", "RESOLVED"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="flex gap-2">
          <button disabled={saveCase.isPending} onClick={() => saveCase.mutate()}
            className="text-sm font-semibold px-4 py-2 rounded-xl bg-teal-600 text-white disabled:opacity-40">Save</button>
          <button onClick={() => setEditingCase(false)} className="text-sm font-semibold px-4 py-2 rounded-xl border border-slate-300">Cancel</button>
        </div>
      </Card>
    )}
    {!isDoctor && doctorContact && (
      <Card className="p-4 text-sm">
        <h2 className="font-bold">Your doctor&apos;s contact</h2>
        <p className="text-slate-600 mt-1">{doctorContact.first_name} {doctorContact.last_name}
          {doctorContact.email ? ` · ${doctorContact.email}` : ""}{doctorContact.phone ? ` · ${doctorContact.phone}` : ""}</p>
        <div className="mt-3"><MessageButton /></div>
      </Card>
    )}
    {!isInTreatment && !isLoading && data?.case && (
      <p className="bg-slate-100 border border-slate-200 text-slate-600 text-sm p-2.5 rounded-xl">
        Case {String(c.status ?? "")} — read-only. Edits are only available while the case is in treatment.
      </p>
    )}
    {isDoctor && isInTreatment && (
      <div>
        {!adding
          ? <button onClick={() => { setAdding(true); setFormErr(""); }}
              className="text-sm font-semibold px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-700">+ Add visit record</button>
          : <Card className="p-4 space-y-2">
              <h2 className="font-bold">New visit record</h2>
              <input className={inputCls} placeholder="Appointment ID *" value={newVisit.appointment_id}
                onChange={(e) => setNewVisit({ ...newVisit, appointment_id: e.target.value })} inputMode="numeric" />
              <input className={inputCls} placeholder="Chief complaint" value={newVisit.chief_complaint}
                onChange={(e) => setNewVisit({ ...newVisit, chief_complaint: e.target.value })} />
              <textarea className={inputCls} rows={2} placeholder="Symptoms" value={newVisit.symptoms}
                onChange={(e) => setNewVisit({ ...newVisit, symptoms: e.target.value })} />
              <textarea className={inputCls} rows={2} placeholder="Examination notes" value={newVisit.examination_notes}
                onChange={(e) => setNewVisit({ ...newVisit, examination_notes: e.target.value })} />
              <input className={inputCls} placeholder="Follow-up plan" value={newVisit.follow_up_plan}
                onChange={(e) => setNewVisit({ ...newVisit, follow_up_plan: e.target.value })} />
              <h3 className="font-semibold text-sm pt-1">Prescription (optional)</h3>
              <RxFields value={newRx} onChange={setNewRx} prefix="new" />
              <div className="flex gap-2">
                <button disabled={addVisit.isPending || !newVisit.appointment_id} onClick={() => addVisit.mutate()}
                  className="text-sm font-semibold px-4 py-2 rounded-xl bg-teal-600 text-white disabled:opacity-40">Save visit</button>
                <button onClick={() => setAdding(false)} className="text-sm font-semibold px-4 py-2 rounded-xl border border-slate-300">Cancel</button>
              </div>
            </Card>}
      </div>
    )}
    {formErr && <p className="bg-rose-50 border border-rose-200 text-rose-700 text-sm p-2.5 rounded-xl" role="alert">{formErr}</p>}
    {!isError && (isLoading ? <div className="space-y-3"><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
    : consults.length === 0 ? <Card className="p-8 text-center text-slate-500">No consultations recorded yet.</Card>
    : <ol className="relative border-l-2 border-slate-200 ml-2 space-y-4">
      {consults.map((item, idx) => {
        const status = String(item.condition_status ?? "STABLE");
        const vitals = item.vitals as Record<string, string | number> | null | undefined;
        const rxs = item.prescriptions ?? [];
        return <li key={String(item.consultation_id)} className="ml-6 relative">
          <span className={`absolute -left-[31px] top-4 w-3.5 h-3.5 rounded-full border-2 border-white shadow ${DOT[status] ?? "bg-teal-500"}`} />
          <Card className="p-4">
            <div className="flex items-center gap-2 flex-wrap text-sm">
              <span className="font-semibold">Visit {idx + 1} · {item.created_at ? fmtDateTime(String(item.created_at)) : `#${String(item.consultation_id)}`}</span>
              <StatusPill status={status} />
              {item.appointment_id !== undefined && <span className="text-slate-400">appt #{String(item.appointment_id)}</span>}
              {isDoctor && isInTreatment && editingConsult !== item.consultation_id && (
                <button onClick={() => {
                  setEditingConsult(item.consultation_id);
                  setConsultForm({
                    symptoms: String(item.symptoms ?? ""), examination_notes: String(item.examination_notes ?? ""),
                    follow_up_plan: String(item.follow_up_plan ?? ""),
                  });
                  setFormErr("");
                }} className="ml-auto text-xs font-semibold text-teal-700 hover:underline">Edit</button>
              )}
            </div>
            {editingConsult === item.consultation_id ? (
              <div className="mt-2 space-y-2">
                <textarea className={inputCls} rows={2} placeholder="Symptoms" value={consultForm.symptoms}
                  onChange={(e) => setConsultForm({ ...consultForm, symptoms: e.target.value })} />
                <textarea className={inputCls} rows={2} placeholder="Examination notes" value={consultForm.examination_notes}
                  onChange={(e) => setConsultForm({ ...consultForm, examination_notes: e.target.value })} />
                <input className={inputCls} placeholder="Follow-up plan" value={consultForm.follow_up_plan}
                  onChange={(e) => setConsultForm({ ...consultForm, follow_up_plan: e.target.value })} />
                <div className="flex gap-2">
                  <button disabled={saveConsult.isPending} onClick={() => saveConsult.mutate(item.consultation_id)}
                    className="text-sm font-semibold px-4 py-2 rounded-xl bg-teal-600 text-white disabled:opacity-40">Save</button>
                  <button onClick={() => setEditingConsult(null)} className="text-sm font-semibold px-4 py-2 rounded-xl border border-slate-300">Cancel</button>
                </div>
              </div>
            ) : (<>
              <Section label="Chief complaint" text={item.chief_complaint} />
              <Section label="Symptoms" text={item.symptoms} />
              <Section label="Examination" text={item.examination_notes} />
            </>)}
            {vitals && typeof vitals === "object" && Object.keys(vitals).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {Object.entries(vitals).map(([k, v]) => (
                  <span key={k} className="text-xs font-medium bg-slate-100 border border-slate-200 rounded-lg px-2 py-1">{k}: {String(v)}</span>
                ))}
              </div>
            )}
            {typeof item.follow_up_plan === "string" && item.follow_up_plan && editingConsult !== item.consultation_id && (
              <p className="mt-2 text-sm bg-teal-50/70 border border-teal-200 rounded-xl p-2.5 text-teal-900"><b>Plan:</b> {item.follow_up_plan}</p>
            )}
            {rxs.length > 0 && (
              <div className="mt-3 space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Prescriptions</h3>
                {rxs.map((rx) => {
                  const drug = drugById.get(rx.drug_id);
                  return <div key={rx.prescription_id} className="border border-slate-200 rounded-xl p-3 text-sm">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={`/drugs/${rx.drug_id}`} className="font-bold hover:text-teal-700 hover:underline">
                        {drug?.name ?? `Drug #${rx.drug_id}`}</Link>
                      <StatusPill status={rx.status} />
                      {rx.supersedes_id != null && (
                        <span className="text-xs font-semibold text-slate-500">replaces #{rx.supersedes_id}</span>
                      )}
                    </div>
                    {(rx.dosage || rx.frequency) && (
                      <p className="text-slate-600 mt-0.5">{[rx.dosage, rx.frequency, rx.route].filter(Boolean).join(" · ")}</p>
                    )}
                    <ScheduleLine rx={rx} status={rx.status} />
                    {isDoctor && isInTreatment && rx.status === "ACTIVE" && (
                      <div className="mt-2 flex gap-3 text-xs font-semibold">
                        <button onClick={() => openRx("edit", rx)} className="text-teal-700 hover:underline">Edit</button>
                        <button onClick={() => openRx("substitute", rx)} className="text-teal-700 hover:underline">Substitute</button>
                        <button onClick={() => openRx("discontinue", rx)} className="text-rose-600 hover:underline">Stop</button>
                      </div>
                    )}
                  </div>;
                })}
              </div>
            )}
          </Card>
        </li>;
      })}
    </ol>)}
    {rxAction && isInTreatment && (
      <Card className="p-4 space-y-2">
        <h2 className="font-bold">
          {rxAction.kind === "edit" ? `Edit prescription #${rxAction.rx.prescription_id}`
            : rxAction.kind === "substitute" ? `Substitute prescription #${rxAction.rx.prescription_id}`
            : `Stop prescription #${rxAction.rx.prescription_id}?`}
        </h2>
        {rxAction.kind !== "discontinue" && <RxFields value={rxForm} onChange={setRxForm} prefix="rx" />}
        {(rxAction.kind === "substitute" || rxAction.kind === "discontinue") && (
          <textarea className={inputCls} rows={2} placeholder="Reason (e.g. patient can't access this drug)"
            value={rxReason} onChange={(e) => setRxReason(e.target.value)} />
        )}
        {rxAction.kind === "substitute" && (
          <p className="text-xs text-slate-500">The old prescription is kept as discontinued; the new one links back to it. The patient is notified by email + SMS.</p>
        )}
        <div className="flex gap-2">
          <button disabled={rxMutate.isPending || (rxAction.kind === "substitute" && !rxForm.drug_id)}
            onClick={() => rxMutate.mutate()}
            className="text-sm font-semibold px-4 py-2 rounded-xl bg-teal-600 text-white disabled:opacity-40">Confirm</button>
          <button onClick={() => { setRxAction(null); setRxForm({}); setRxReason(""); }} className="text-sm font-semibold px-4 py-2 rounded-xl border border-slate-300">Cancel</button>
        </div>
      </Card>
    )}
  </div>;
}
