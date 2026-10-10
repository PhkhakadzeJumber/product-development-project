"use client";
import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppointmentApi, ClinicalApi, DoctorApi, FeedbackChatApi } from "@/lib/api";
import { ApiError } from "@/lib/api-client";
import { RoleGate } from "@/components/RoleGate";
import { Avatar } from "@/components/Avatar";
import { Card, StatusPill, EmptyState, Skeleton, Stars, ConfirmModal, inputCls } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";

function ReviewBox({ appointmentId }: { appointmentId: number }) {
  const qc = useQueryClient();
  const { data: existing, isLoading } = useQuery({
    queryKey: ["review", appointmentId],
    queryFn: () => FeedbackChatApi.myReview(appointmentId),
  });
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [done, setDone] = useState(false);
  const review = useMutation({
    mutationFn: () => FeedbackChatApi.review(appointmentId, rating, comment.trim() || undefined),
    onSuccess: () => {
      setDone(true);
      qc.invalidateQueries({ queryKey: ["review", appointmentId] });
      qc.invalidateQueries({ queryKey: ["doctors-all"] });
    },
  });
  if (isLoading) return <Skeleton className="h-10 mt-2" />;
  if (existing) {
    return (
      <div className="mt-2 text-sm bg-emerald-50 border border-emerald-200 rounded-xl p-2.5">
        <span className="font-semibold text-emerald-700">Reviewed ✓ {"★".repeat(existing.rating)}</span>
        {existing.comment && <p className="text-slate-600 mt-1">{existing.comment}</p>}
      </div>
    );
  }
  if (done) return <p className="mt-2 text-sm text-emerald-600">Thanks for your review!</p>;
  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Stars value={rating} onChange={setRating} />
        <button
          onClick={() => review.mutate()}
          disabled={review.isPending}
          className="text-sm font-semibold px-3 py-1.5 rounded-lg bg-slate-900 text-white disabled:opacity-50"
        >
          {review.isPending ? "Sending…" : "Send review"}
        </button>
      </div>
      <textarea
        className={inputCls}
        rows={2}
        maxLength={2000}
        placeholder="How was your visit? (optional)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        aria-label={`Review comment for appointment ${appointmentId}`}
      />
      {review.isError && (
        <p className="text-sm text-rose-600" role="alert">
          {review.error instanceof ApiError ? review.error.message : "Could not send review."}
        </p>
      )}
    </div>
  );
}

export default function AppointmentsPage() {
  return <RoleGate allow={["PATIENT"]}><AppointmentsInner /></RoleGate>;
}

function AppointmentsInner() {
  const { data, isLoading, isError } = useQuery({ queryKey: ["my-appointments"], queryFn: AppointmentApi.mine });
  const { data: myCases } = useQuery({ queryKey: ["my-cases"], queryFn: ClinicalApi.myCases });
  const { data: doctors } = useQuery({ queryKey: ["doctors-all"], queryFn: () => DoctorApi.list() });
  const docById = new Map((doctors ?? []).map((d) => [d.doctor_id, d]));
  const qc = useQueryClient();
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const cancel = useMutation({
    mutationFn: (id: number) => AppointmentApi.cancel(id, cancelReason.trim() || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-appointments"] });
      qc.invalidateQueries({ queryKey: ["slots"] });
      setCancelId(null);
      setCancelReason("");
    },
  });

  return <div className="space-y-5">
    <div><h1 className="text-3xl font-bold">My visits</h1>
    <p className="text-slate-500 mt-1">Upcoming and past appointments, cancellations and reviews.</p></div>
    {!!myCases?.length && (
      <Card className="p-4">
        <h2 className="font-bold">My treatment tracking</h2>
        <ul className="mt-2 grid sm:grid-cols-2 gap-2">
          {myCases.map((c) => (
            <li key={c.treatment_id} className="border border-slate-200 rounded-xl p-3 text-sm">
              <Link className="font-semibold text-teal-700 hover:underline" href={`/cases/${c.treatment_id}`}>
                #{c.treatment_id} {c.title}
              </Link>
              <span className="ml-2"><StatusPill status={c.status} /></span>
            </li>
          ))}
        </ul>
      </Card>
    )}
    {isLoading ? <div className="space-y-3"><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
    : isError ? <Card><EmptyState title="Could not load visits" hint="Check your connection and try again." /></Card>
    : !data?.length ? <Card><EmptyState title="No appointments yet" hint="Find a doctor and book your first visit." /></Card>
    : <div className="space-y-3">{data.map((a) => {
      const d = docById.get(a.doctor_id);
      return <Card key={a.appointment_id} className="p-4 flex gap-4 items-start">
        <Avatar src={d?.photo_url} firstName={d?.first_name} lastName={d?.last_name} size={52} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {d ? (
              <Link href={`/doctors/${d.doctor_id}`} className="font-bold hover:text-teal-700 hover:underline">
                {d.first_name} {d.last_name}
              </Link>
            ) : (
              <span className="font-bold">Doctor #{a.doctor_id}</span>
            )}
            <StatusPill status={a.status} />
            {a.consultation_mode && <StatusPill status={a.consultation_mode} />}
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            <Link href={`/appointments/${a.appointment_id}`} className="font-semibold hover:text-teal-700 hover:underline">Appointment #{a.appointment_id}</Link>
            {a.start_time ? ` · ${fmtDateTime(a.start_time)}` : ""}
            {a.reason ? ` · ${a.reason}` : ""}
          </p>
          {a.status === "SCHEDULED" && (
            <button onClick={() => { setCancelId(a.appointment_id); setCancelReason(""); cancel.reset(); }} className="mt-2 text-sm font-semibold text-rose-600 hover:underline">Cancel visit</button>
          )}
          {a.status === "COMPLETED" && <ReviewBox appointmentId={a.appointment_id} />}
        </div>
      </Card>;
    })}</div>}
    {cancelId !== null && (
      <ConfirmModal
        title={`Cancel appointment #${cancelId}?`}
        body="The time slot becomes available for other patients. Free cancellation until 2 hours before the visit."
        confirmLabel="Cancel visit"
        pending={cancel.isPending}
        error={cancel.isError ? (cancel.error instanceof ApiError ? cancel.error.message : "Cancellation failed.") : null}
        onClose={() => { if (!cancel.isPending) { setCancelId(null); setCancelReason(""); cancel.reset(); } }}
        onConfirm={() => cancel.mutate(cancelId)}
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
  </div>;
}
