"use client";
import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppointmentApi, ClinicalApi, ProfileApi } from "@/lib/api";
import { ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth";
import { Avatar } from "@/components/Avatar";
import { MessageButton } from "@/components/VisitCard";
import { Card, StatusPill, EmptyState, Skeleton, ConfirmModal, inputCls } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";

export default function VisitDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const { role } = useAuth();
  const qc = useQueryClient();
  const { data: v, isLoading, isError } = useQuery({
    queryKey: ["appointment", id],
    queryFn: () => AppointmentApi.get(id),
    enabled: Number.isFinite(id),
  });
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [caseTitle, setCaseTitle] = useState("");
  const { data: patientProfile } = useQuery({
    queryKey: ["patient-profile", v?.patient_id],
    queryFn: () => ProfileApi.patient(v!.patient_id),
    enabled: !!v && role === "DOCTOR",
  });
  const { data: doctorContact } = useQuery({
    queryKey: ["doctor-contact", v?.doctor_id],
    queryFn: () => ProfileApi.doctorContact(v!.doctor_id),
    enabled: !!v && role === "PATIENT",
  });
  const cancel = useMutation({
    mutationFn: () => AppointmentApi.cancel(id, cancelReason.trim() || undefined),
    onSuccess: () => {
      setCancelOpen(false);
      setCancelReason("");
      qc.invalidateQueries({ queryKey: ["appointment", id] });
      qc.invalidateQueries({ queryKey: ["my-appointments"] });
      qc.invalidateQueries({ queryKey: ["doctor-appointments"] });
    },
  });
  const setStatus = useMutation({
    mutationFn: (s: string) => AppointmentApi.setStatus(id, s),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointment", id] });
      qc.invalidateQueries({ queryKey: ["doctor-appointments"] });
    },
  });
  const createCase = useMutation({
    mutationFn: () => ClinicalApi.createCase({ patient_id: v!.patient_id, title: caseTitle.trim() }),
    onSuccess: (c) => {
      setCaseTitle("");
      qc.invalidateQueries({ queryKey: ["appointment", id] });
      window.location.href = `/cases/${c.treatment_id}`;
    },
  });

  if (isLoading) return <div className="space-y-3"><Skeleton className="h-32" /><Skeleton className="h-48" /></div>;
  if (isError || !v) return <Card><EmptyState title="Visit not found" hint="It may belong to another patient or doctor." /></Card>;

  const patientName = v.patient_first_name ? `${v.patient_first_name} ${v.patient_last_name ?? ""}`.trim() : `Patient #${v.patient_id}`;
  const doctorName = v.doctor_first_name ? `${v.doctor_first_name} ${v.doctor_last_name ?? ""}`.trim() : `Doctor #${v.doctor_id}`;

  return (
    <div className="space-y-6">
      <Link href={role === "DOCTOR" ? "/timetable" : "/appointments"} className="text-sm font-semibold text-slate-500 hover:text-slate-800">
        ← {role === "DOCTOR" ? "Back to timetable" : "Back to My visits"}
      </Link>

      <Card className="p-6">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl font-bold">Visit #{v.appointment_id}</h1>
          <StatusPill status={v.status} />
          {v.consultation_mode && <StatusPill status={v.consultation_mode} />}
        </div>
        <p className="text-slate-500 mt-1 text-sm">
          {v.start_time ? fmtDateTime(v.start_time) : "Time TBD"}
          {v.end_time ? ` – ${fmtDateTime(v.end_time)}` : ""}
          {` · Slot #${v.slot_id}`}
        </p>
        {v.reason && <p className="text-sm text-slate-700 mt-3"><span className="font-semibold">Reason: </span>{v.reason}</p>}
        {v.status === "SCHEDULED" && role === "DOCTOR" && (
          <div className="mt-4 flex gap-2">
            <button onClick={() => setStatus.mutate("COMPLETED")}
              className="text-sm font-semibold px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700">Mark completed</button>
            <button onClick={() => setStatus.mutate("NO_SHOW")}
              className="text-sm font-semibold px-4 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50">Mark no-show</button>
          </div>
        )}
        {setStatus.isError && <p className="mt-2 text-sm text-rose-600" role="alert">Could not update status.</p>}
        {v.status === "SCHEDULED" && (role === "PATIENT" || role === "DOCTOR") && (
          <button onClick={() => { setCancelOpen(true); setCancelReason(""); cancel.reset(); }}
            className="mt-4 text-sm font-semibold text-rose-600 hover:underline">Cancel visit</button>
        )}
      </Card>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="p-5 flex gap-4 items-start">
          <Avatar src={v.patient_avatar_url} firstName={v.patient_first_name ?? "P"} lastName={v.patient_last_name ?? String(v.patient_id)} size={56} />
          <div>
            <h2 className="font-bold text-lg">Patient</h2>
            <Link href={`/patients/${v.patient_id}`} className="font-semibold hover:text-teal-700 hover:underline">{patientName}</Link>
            <p className="text-sm text-slate-500">ID #{v.patient_id}</p>
            {role === "DOCTOR" && patientProfile && (
              <p className="text-sm text-slate-600 mt-1">
                {patientProfile.email}{patientProfile.phone ? ` · ${patientProfile.phone}` : ""}
                {patientProfile.city ? ` · ${patientProfile.city}` : ""}
              </p>
            )}
            {role === "DOCTOR" && <div className="mt-3"><MessageButton label="Message patient" /></div>}
          </div>
        </Card>
        <Card className="p-5 flex gap-4 items-start">
          <Avatar src={v.doctor_photo_url} firstName={v.doctor_first_name ?? "D"} lastName={v.doctor_last_name ?? String(v.doctor_id)} size={56} />
          <div>
            <h2 className="font-bold text-lg">Doctor</h2>
            <Link href={`/doctors/${v.doctor_id}`} className="font-semibold hover:text-teal-700 hover:underline">{doctorName}</Link>
            <p className="text-sm text-slate-500">ID #{v.doctor_id}</p>
            {role === "PATIENT" && doctorContact && (
              <p className="text-sm text-slate-600 mt-1">
                {doctorContact.email}{doctorContact.phone ? ` · ${doctorContact.phone}` : ""}
              </p>
            )}
            {role === "PATIENT" && <div className="mt-3"><MessageButton label="Message doctor" /></div>}
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="font-bold text-lg">Visit info</h2>
        <dl className="text-sm text-slate-600 mt-2 space-y-1">
          <div><dt className="inline font-semibold text-slate-800">Status: </dt><dd className="inline">{v.status}</dd></div>
          {v.booked_at && <div><dt className="inline font-semibold text-slate-800">Booked: </dt><dd className="inline">{fmtDateTime(v.booked_at)}</dd></div>}
          {v.status === "CANCELLED" && <>
            {v.cancelled_at && <div><dt className="inline font-semibold text-slate-800">Cancelled at: </dt><dd className="inline">{fmtDateTime(v.cancelled_at)}</dd></div>}
            {v.cancelled_by && <div><dt className="inline font-semibold text-slate-800">Cancelled by: </dt><dd className="inline">{v.cancelled_by}</dd></div>}
            {v.cancel_reason && <div><dt className="inline font-semibold text-slate-800">Cancel reason: </dt><dd className="inline">{v.cancel_reason}</dd></div>}
          </>}
          {v.consultation_id && <div><dt className="inline font-semibold text-slate-800">Consultation: </dt><dd className="inline">#{v.consultation_id}</dd></div>}
          {v.treatment_id && (role === "DOCTOR" || role === "PATIENT") && <div><dt className="inline font-semibold text-slate-800">Treatment case: </dt><dd className="inline"><Link className="text-teal-700 hover:underline font-semibold" href={`/cases/${v.treatment_id}`}>#{v.treatment_id} — view case</Link></dd></div>}
        </dl>
        {v.treatment_id && role === "DOCTOR" && (
          <Link href={`/cases/${v.treatment_id}`}
            className="mt-3 inline-block text-sm font-semibold px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-700">
            Record visit / update tracking →
          </Link>
        )}
        {!v.treatment_id && role === "DOCTOR" && (v.status === "COMPLETED" || v.status === "SCHEDULED") && (
          <div className="mt-3 flex gap-2 flex-wrap">
            <input className={`${inputCls} max-w-xs`} placeholder="New case title (e.g. Hypertension)"
              value={caseTitle} onChange={(e) => setCaseTitle(e.target.value)} />
            <button disabled={createCase.isPending || !caseTitle.trim()} onClick={() => createCase.mutate()}
              className="text-sm font-semibold px-4 py-2 rounded-xl bg-teal-600 text-white disabled:opacity-40">
              Start tracking case
            </button>
          </div>
        )}
        {createCase.isError && <p className="mt-2 text-sm text-rose-600" role="alert">Could not start case.</p>}
        {!v.treatment_id && v.status === "COMPLETED" && role !== "DOCTOR" && (
          <p className="text-sm text-slate-500 mt-3">Your doctor will add the visit record here.</p>
        )}
      </Card>

      {cancelOpen && (
        <ConfirmModal
          title={`Cancel visit #${v.appointment_id}?`}
          body="The time slot becomes available for other patients. Free cancellation until 2 hours before the visit."
          confirmLabel="Cancel visit"
          pending={cancel.isPending}
          error={cancel.isError ? (cancel.error instanceof ApiError ? cancel.error.message : "Cancellation failed.") : null}
          onClose={() => { if (!cancel.isPending) { setCancelOpen(false); setCancelReason(""); cancel.reset(); } }}
          onConfirm={() => cancel.mutate()}
        >
          <textarea
            className={inputCls}
            rows={2}
            maxLength={1000}
            placeholder="Reason (optional)"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            aria-label="Cancellation reason"
          />
        </ConfirmModal>
      )}
    </div>
  );
}
