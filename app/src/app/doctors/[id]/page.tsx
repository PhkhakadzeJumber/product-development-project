"use client";
import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DoctorApi, SlotApi, AppointmentApi, CatalogApi } from "@/lib/api";
import { ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth";
import { Avatar } from "@/components/Avatar";
import { MessageButton } from "@/components/VisitCard";
import { Card, StatusPill, EmptyState, Skeleton } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";

export default function DoctorDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const { role } = useAuth();
  const qc = useQueryClient();
  const { data: doctor, isLoading } = useQuery({
    queryKey: ["doctor", id],
    queryFn: () => DoctorApi.get(id),
    enabled: Number.isFinite(id),
  });
  const { data: reviewData } = useQuery({
    queryKey: ["doctor-reviews", id],
    queryFn: () => DoctorApi.reviews(id),
    enabled: Number.isFinite(id),
  });
  const { data: slots, isLoading: slotsLoading } = useQuery({
    queryKey: ["slots", id],
    queryFn: () => SlotApi.list(id, "AVAILABLE", true),
    enabled: Number.isFinite(id) && (!role || role === "PATIENT"),
  });
  const { data: hospitals } = useQuery({ queryKey: ["hospitals"], queryFn: () => CatalogApi.hospitals() });
  const hospital = hospitals?.find((h) => h.hospital_id === doctor?.hospital_id);
  const [bookErr, setBookErr] = useState("");
  const [bookedId, setBookedId] = useState<number | null>(null);
  const book = useMutation({
    mutationFn: (slot_id: number) => AppointmentApi.book(slot_id),
    onSuccess: (a) => {
      setBookedId(a.appointment_id);
      setBookErr("");
      qc.invalidateQueries({ queryKey: ["slots", id] });
      qc.invalidateQueries({ queryKey: ["my-appointments"] });
    },
    onError: (e) => setBookErr(e instanceof ApiError ? e.message : "Booking failed"),
  });

  if (isLoading) return <div className="space-y-3"><Skeleton className="h-40" /><Skeleton className="h-40" /></div>;
  if (!doctor) return <Card><EmptyState title="Doctor not found" hint="Try the doctors list." /></Card>;

  return (
    <div className="space-y-6">
      <Link href="/doctors" className="text-sm font-semibold text-slate-500 hover:text-slate-800">← All doctors</Link>
      <Card className="p-6 flex gap-5 flex-wrap sm:flex-nowrap">
        <Avatar src={doctor.photo_url} firstName={doctor.first_name} lastName={doctor.last_name} size={96} />
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold">{doctor.first_name} {doctor.last_name}</h1>
          <p className="text-slate-500 mt-1">
            {doctor.qualifications ?? "Doctor"}
            {doctor.years_of_experience ? ` · ${doctor.years_of_experience} yrs experience` : ""}
          </p>
          <div className="mt-2 flex gap-2 flex-wrap">
            {doctor.specialization_name && <StatusPill status={doctor.specialization_name} />}
            {doctor.hospital_name && <StatusPill status={doctor.hospital_name} />}
          </div>
          {reviewData && (
            <p className="mt-2 text-sm font-semibold text-slate-700">
              {reviewData.average_rating != null
                ? `★ ${Number(reviewData.average_rating).toFixed(1)} · ${reviewData.review_count} review${reviewData.review_count === 1 ? "" : "s"}`
                : "No reviews yet"}
            </p>
          )}
          <div className="mt-4"><MessageButton label="Message doctor" /></div>
        </div>
      </Card>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="p-6">
          <h2 className="font-bold text-lg">About</h2>
          {doctor.bio ? <p className="text-sm text-slate-600 mt-2 whitespace-pre-line">{doctor.bio}</p>
            : <p className="text-sm text-slate-500 mt-2">No biography provided.</p>}
        </Card>
        <Card className="p-6">
          <h2 className="font-bold text-lg">Clinic</h2>
          <dl className="text-sm text-slate-600 mt-2 space-y-1">
            <div><dt className="inline font-semibold text-slate-800">Hospital: </dt><dd className="inline">{doctor.hospital_name ?? hospital?.name ?? `#${doctor.hospital_id}`}</dd></div>
            {hospital?.city && <div><dt className="inline font-semibold text-slate-800">City: </dt><dd className="inline">{hospital.city}</dd></div>}
            {hospital?.address && <div><dt className="inline font-semibold text-slate-800">Address: </dt><dd className="inline">{hospital.address}</dd></div>}
            {hospital?.phone && <div><dt className="inline font-semibold text-slate-800">Phone: </dt><dd className="inline">{hospital.phone}</dd></div>}
            {hospital?.email && <div><dt className="inline font-semibold text-slate-800">Email: </dt><dd className="inline">{hospital.email}</dd></div>}
            {doctor.specialization_name && <div><dt className="inline font-semibold text-slate-800">Specialization: </dt><dd className="inline">{doctor.specialization_name}</dd></div>}
          </dl>
        </Card>
      </div>

      {(!role || role === "PATIENT") && (
      <Card className="p-6">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="font-bold text-lg">Available slots</h2>
          {(slots?.length ?? 0) > 6 && (
            <Link href={`/doctors/${id}/slots`} className="ml-auto text-sm font-semibold px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-700">
              See all slots ({slots?.length})
            </Link>
          )}
        </div>
        {slotsLoading ? <div className="mt-3 space-y-2"><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
        : !slots?.length ? <EmptyState title="No available slots" hint="Check back later or pick another doctor." />
        : <ul className="mt-3 grid sm:grid-cols-2 gap-2">
          {slots.slice(0, 6).map((s) => (
            <li key={s.slot_id} className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2.5 text-sm">
              <span className="font-medium">{fmtDateTime(s.start_time)}</span>
              <StatusPill status={s.consultation_mode} />
              <button disabled={book.isPending} onClick={() => book.mutate(s.slot_id)}
                className="ml-auto bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white text-sm font-semibold px-3 py-1.5 rounded-lg">Book</button>
            </li>
          ))}
        </ul>}
        {(slots?.length ?? 0) > 6 && (
          <Link href={`/doctors/${id}/slots`} className="mt-3 inline-block text-sm font-semibold text-teal-700 hover:underline">
            See all {slots?.length} slots →
          </Link>
        )}
        {bookErr && <p className="mt-3 text-sm text-rose-600" role="alert">{bookErr}</p>}
        {bookedId && <p className="mt-3 text-sm bg-emerald-50 border border-emerald-200 text-emerald-700 p-2.5 rounded-xl">Booked! Appointment #{bookedId} — see it under <Link href="/appointments" className="underline font-semibold">My visits</Link>.</p>}
      </Card>
      )}

      <Card className="p-6">
        <h2 className="font-bold text-lg">Patient reviews</h2>
        {!reviewData?.reviews.length ? (
          <p className="text-sm text-slate-500 mt-2">No reviews yet. Completed visits can be reviewed from My visits.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {reviewData.reviews.map((r) => (
              <li key={r.review_id} className="border border-slate-200 rounded-xl p-3 text-sm">
                <span className="font-semibold text-amber-500">{"★".repeat(r.rating)}</span>
                <span className="text-slate-400 ml-2">appointment #{r.appointment_id}</span>
                {r.comment && <p className="text-slate-600 mt-1">{r.comment}</p>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
