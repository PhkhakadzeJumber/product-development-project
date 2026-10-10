"use client";
import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DoctorApi, SlotApi, AppointmentApi } from "@/lib/api";
import { ApiError } from "@/lib/api-client";
import { Avatar } from "@/components/Avatar";
import { Card, StatusPill, EmptyState, Skeleton } from "@/components/ui";
import { RoleGate } from "@/components/RoleGate";
import { fmtDateTime } from "@/lib/format";

export default function DoctorSlotsPage() {
  return <RoleGate allow={["PATIENT"]}><DoctorSlotsInner /></RoleGate>;
}

function DoctorSlotsInner() {
  const params = useParams();
  const id = Number(params.id);
  const qc = useQueryClient();
  const { data: doctor } = useQuery({
    queryKey: ["doctor", id],
    queryFn: () => DoctorApi.get(id),
    enabled: Number.isFinite(id),
  });
  const { data: slots, isLoading } = useQuery({
    queryKey: ["slots", id, "all"],
    queryFn: () => SlotApi.list(id, "AVAILABLE", true),
    enabled: Number.isFinite(id),
  });
  const [bookErr, setBookErr] = useState("");
  const [bookedId, setBookedId] = useState<number | null>(null);
  const book = useMutation({
    mutationFn: (slot_id: number) => AppointmentApi.book(slot_id),
    onSuccess: (a) => {
      setBookedId(a.appointment_id);
      setBookErr("");
      qc.invalidateQueries({ queryKey: ["slots"] });
      qc.invalidateQueries({ queryKey: ["my-appointments"] });
    },
    onError: (e) => setBookErr(e instanceof ApiError ? e.message : "Booking failed"),
  });

  return (
    <div className="space-y-6">
      <Link href={`/doctors/${id}`} className="text-sm font-semibold text-slate-500 hover:text-slate-800">← Back to profile</Link>
      <div className="flex items-center gap-3 flex-wrap">
        {doctor && <Avatar src={doctor.photo_url} firstName={doctor.first_name} lastName={doctor.last_name} size={48} />}
        <div>
          <h1 className="text-3xl font-bold">{doctor ? `${doctor.first_name} ${doctor.last_name}` : `Doctor #${id}`} — slots</h1>
          <p className="text-slate-500 mt-1">Future available times only. Past times are hidden.</p>
        </div>
      </div>
      <Card className="p-6">
        {isLoading ? <div className="space-y-2"><Skeleton className="h-10" /><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
        : !slots?.length ? <EmptyState title="No available slots" hint="Check back later or pick another doctor." />
        : <ul className="grid sm:grid-cols-2 gap-2">
          {slots.map((s) => (
            <li key={s.slot_id} className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2.5 text-sm">
              <span className="font-medium">{fmtDateTime(s.start_time)}</span>
              <StatusPill status={s.consultation_mode} />
              <button disabled={book.isPending} onClick={() => book.mutate(s.slot_id)}
                className="ml-auto bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white text-sm font-semibold px-3 py-1.5 rounded-lg">Book</button>
            </li>
          ))}
        </ul>}
        {bookErr && <p className="mt-3 text-sm text-rose-600" role="alert">{bookErr}</p>}
        {bookedId && <p className="mt-3 text-sm bg-emerald-50 border border-emerald-200 text-emerald-700 p-2.5 rounded-xl">Booked! Appointment #{bookedId} — see it under <Link href="/appointments" className="underline font-semibold">My visits</Link>.</p>}
      </Card>
    </div>
  );
}
