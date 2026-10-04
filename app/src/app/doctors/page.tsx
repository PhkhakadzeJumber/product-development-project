"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CatalogApi, DoctorApi, SlotApi, AppointmentApi } from "@/lib/api";
import { ApiError } from "@/lib/api-client";
import { Avatar } from "@/components/Avatar";
import { Card, StatusPill, EmptyState, Skeleton, inputCls } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";

export default function DoctorsPage() {
  const [hospitalId, setHospitalId] = useState("");
  const [specId, setSpecId] = useState("");
  const [search, setSearch] = useState("");
  const { data: doctors, isLoading } = useQuery({
    queryKey: ["doctors", hospitalId, specId],
    queryFn: () => DoctorApi.list(
      hospitalId ? Number(hospitalId) : undefined,
      specId ? Number(specId) : undefined),
  });
  const { data: hospitals } = useQuery({ queryKey: ["hospitals"], queryFn: () => CatalogApi.hospitals() });
  const { data: specs } = useQuery({ queryKey: ["specs"], queryFn: () => CatalogApi.specializations() });
  const [selected, setSelected] = useState<number | null>(null);
  const { data: slots, isLoading: slotsLoading } = useQuery({
    queryKey: ["slots", selected],
    queryFn: () => SlotApi.list(selected!, "AVAILABLE", true),
    enabled: !!selected,
  });
  const qc = useQueryClient();
  const [bookErr, setBookErr] = useState("");
  const [bookedId, setBookedId] = useState<number | null>(null);
  const book = useMutation({
    mutationFn: (slot_id: number) => AppointmentApi.book(slot_id),
    onSuccess: (a) => { setBookedId(a.appointment_id); setBookErr(""); qc.invalidateQueries({ queryKey: ["slots"] }); },
    onError: (e) => setBookErr(e instanceof ApiError ? e.message : "Booking failed"),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return doctors ?? [];
    return (doctors ?? []).filter((d) => `${d.first_name} ${d.last_name}`.toLowerCase().includes(q));
  }, [doctors, search]);
  const selDoc = (doctors ?? []).find((d) => d.doctor_id === selected);

  return <div className="space-y-6">
    <div>
      <h1 className="text-3xl font-bold">Find doctors</h1>
      <p className="text-slate-500 mt-1">Search by name, filter by hospital or specialization, then pick a time.</p>
    </div>
    <Card className="p-4">
      <div className="grid sm:grid-cols-4 gap-3">
        <input className={inputCls} placeholder="Search name…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search doctors" />
        <select className={inputCls} value={hospitalId} onChange={(e) => setHospitalId(e.target.value)} aria-label="Hospital filter">
          <option value="">All hospitals</option>{hospitals?.map((h) => <option key={h.hospital_id} value={h.hospital_id}>{h.name}</option>)}
        </select>
        <select className={inputCls} value={specId} onChange={(e) => setSpecId(e.target.value)} aria-label="Specialization filter">
          <option value="">All specializations</option>{specs?.map((s) => <option key={s.specialization_id} value={s.specialization_id}>{s.name}</option>)}
        </select>
        <button onClick={() => { setHospitalId(""); setSpecId(""); setSearch(""); setSelected(null); setBookErr(""); setBookedId(null); }} className="text-sm font-semibold text-slate-500 hover:text-slate-800">Clear filters & selection</button>
      </div>
    </Card>
    {isLoading ? <div className="grid sm:grid-cols-2 gap-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-36" />)}</div>
    : filtered.length === 0 ? <Card><EmptyState title="No doctors found" hint="Try clearing filters." /></Card>
    : <div className="grid sm:grid-cols-2 gap-4">
      {filtered.map((d) => (
        <Card key={d.doctor_id} className={`p-5 flex gap-4 ${selected === d.doctor_id ? "ring-2 ring-teal-500" : ""}`}>
          <Avatar src={d.photo_url} firstName={d.first_name} lastName={d.last_name} size={64} />
          <div className="flex-1 min-w-0">
            <Link href={`/doctors/${d.doctor_id}`} className="font-bold text-lg leading-tight hover:text-teal-700 hover:underline">{d.first_name} {d.last_name}</Link>
            <p className="text-sm text-slate-500">{d.qualifications ?? "Doctor"}{d.years_of_experience ? ` · ${d.years_of_experience} yrs` : ""}{d.specialization_name ? ` · ${d.specialization_name}` : ""}{d.hospital_name ? ` · ${d.hospital_name}` : ""}</p>
            {d.bio && <p className="text-sm text-slate-600 mt-1 line-clamp-2">{d.bio}</p>}
            <div className="mt-3 flex gap-2 flex-wrap">
              <Link href={`/doctors/${d.doctor_id}`}
                className="text-sm font-semibold px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-700">
                View profile
              </Link>
              <button onClick={() => { setSelected(d.doctor_id); setBookedId(null); setBookErr(""); }}
                className={`text-sm font-semibold px-4 py-2 rounded-xl ${selected === d.doctor_id ? "bg-teal-600 text-white" : "bg-teal-50 text-teal-700 hover:bg-teal-100"}`}>
                {selected === d.doctor_id ? "Selected" : "View slots"}
              </button>
            </div>
          </div>
        </Card>
      ))}
    </div>}
    {selected && <Card className="p-5">
      <div className="flex items-center gap-3">
        <h2 className="font-bold text-lg">Available slots {selDoc ? `— ${selDoc.first_name} ${selDoc.last_name}` : ""}</h2>
        <button onClick={() => { setSelected(null); setBookErr(""); setBookedId(null); }} className="ml-auto text-sm font-semibold text-slate-500 hover:text-slate-800">Clear selection ✕</button>
      </div>
      {slotsLoading ? <div className="mt-3 space-y-2"><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
      : !slots?.length ? <EmptyState title="No available slots" hint="Pick another doctor." />
      : <ul className="mt-3 grid sm:grid-cols-2 gap-2">
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
      {bookedId && <p className="mt-3 text-sm bg-emerald-50 border border-emerald-200 text-emerald-700 p-2.5 rounded-xl">Booked! Appointment #{bookedId} — see it under My visits.</p>}
    </Card>}
  </div>;
}
