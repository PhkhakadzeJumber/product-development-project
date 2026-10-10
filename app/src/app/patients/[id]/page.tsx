"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AppointmentApi, ClinicalApi, ProfileApi, DoctorApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Avatar } from "@/components/Avatar";
import { Card, StatusPill, EmptyState, Skeleton } from "@/components/ui";
import { MessageButton } from "@/components/VisitCard";
import { fmtDateTime } from "@/lib/format";

export default function PatientProfilePage() {
  const params = useParams();
  const id = Number(params.id);
  const { role, userId } = useAuth();
  const enabled = Number.isFinite(id);

  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ["patient-page", id],
    queryFn: () => ProfileApi.patient(id),
    enabled,
  });
  const { data: doctorList } = useQuery({
    queryKey: ["doctors-all"], queryFn: () => DoctorApi.list(), enabled: role === "PATIENT",
  });
  // Doctor/admin: visits with this patient (detailed gives names + contacts).
  const { data: visits } = useQuery({
    queryKey: ["patient-visits", id],
    queryFn: AppointmentApi.mineDetailed,
    enabled: enabled && role !== "PATIENT",
    select: (all) => all.filter((v) => v.patient_id === id),
  });
  // Patient self: own cases + visits.
  const { data: myCases } = useQuery({
    queryKey: ["my-cases"], queryFn: ClinicalApi.myCases, enabled: role === "PATIENT" && userId === id,
  });
  const { data: myVisits } = useQuery({
    queryKey: ["my-appointments"], queryFn: AppointmentApi.mine, enabled: role === "PATIENT" && userId === id,
  });

  if (isLoading) return <div className="space-y-3"><Skeleton className="h-40" /><Skeleton className="h-40" /></div>;
  if (isError || !profile) return <Card><EmptyState title="Patient not found" hint={role === "HOSPITAL_ADMIN" ? "They may not be in your hospital." : "They may not share visits with you."} /></Card>;

  const fullName = `${profile.first_name} ${profile.last_name}`;
  const backHref = role === "DOCTOR" ? "/my-patients" : role === "HOSPITAL_ADMIN" ? "/visits" : "/appointments";
  const backLabel = role === "DOCTOR" ? "All patients" : role === "HOSPITAL_ADMIN" ? "All visits" : "My visits";

  return (
    <div className="space-y-6">
      <Link href={backHref} className="text-sm font-semibold text-slate-500 hover:text-slate-800">← {backLabel}</Link>
      <Card className="p-6 flex gap-5 flex-wrap sm:flex-nowrap items-start">
        <Avatar src={profile.avatar_url} firstName={profile.first_name} lastName={profile.last_name} size={96} />
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold">{fullName}</h1>
          <p className="text-slate-500 mt-1 text-sm">
            {[profile.city, profile.gender, profile.date_of_birth].filter(Boolean).join(" · ") || `Patient #${profile.patient_id}`}
          </p>
          <div className="mt-2 flex gap-2 flex-wrap text-sm text-slate-600">
            {profile.email && <span className="bg-slate-100 border border-slate-200 rounded-lg px-2 py-1">{profile.email}</span>}
            {profile.phone && <span className="bg-slate-100 border border-slate-200 rounded-lg px-2 py-1">{profile.phone}</span>}
          </div>
          {role === "DOCTOR" && (
            <div className="mt-4 flex gap-2 flex-wrap">
              <MessageButton />
            </div>
          )}
        </div>
      </Card>

      {role !== "PATIENT" && (
        <Card className="p-6">
          <h2 className="font-bold text-lg">Visits with you ({visits?.length ?? 0})</h2>
          {!visits?.length ? <p className="text-sm text-slate-500 mt-2">No visits with this patient yet.</p>
          : <ul className="mt-3 space-y-2">
              {visits.map((v) => (
                <li key={v.appointment_id} className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2.5 text-sm flex-wrap">
                  <Link href={`/appointments/${v.appointment_id}`} className="font-semibold hover:text-teal-700 hover:underline">
                    Visit #{v.appointment_id}
                  </Link>
                  {v.start_time && <span className="text-slate-500">{fmtDateTime(v.start_time)}</span>}
                  <span className="ml-auto"><StatusPill status={v.status} /></span>
                </li>
              ))}
            </ul>}
        </Card>
      )}

      {role === "PATIENT" && userId === id && (
        <>
          {!!myVisits?.length && (
            <Card className="p-6">
              <h2 className="font-bold text-lg">My visits ({myVisits.length})</h2>
              <ul className="mt-3 space-y-2">
                {myVisits.slice(0, 10).map((a) => {
                  const d = (doctorList ?? []).find((x) => x.doctor_id === a.doctor_id);
                  return <li key={a.appointment_id} className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2.5 text-sm flex-wrap">
                    <Link href={`/appointments/${a.appointment_id}`} className="font-semibold hover:text-teal-700 hover:underline">Visit #{a.appointment_id}</Link>
                    {d && <Link href={`/doctors/${d.doctor_id}`} className="text-slate-500 hover:text-teal-700 hover:underline">{d.first_name} {d.last_name}</Link>}
                    {a.start_time && <span className="text-slate-500">{fmtDateTime(a.start_time)}</span>}
                    <span className="ml-auto"><StatusPill status={a.status} /></span>
                  </li>;
                })}
              </ul>
              <Link href="/appointments" className="mt-3 inline-block text-sm font-semibold text-teal-700 hover:underline">See all visits →</Link>
            </Card>
          )}
          {!!myCases?.length && (
            <Card className="p-6">
              <h2 className="font-bold text-lg">My treatment tracking</h2>
              <ul className="mt-2 grid sm:grid-cols-2 gap-2">
                {myCases.map((c) => (
                  <li key={c.treatment_id} className="border border-slate-200 rounded-xl p-3 text-sm">
                    <Link className="font-semibold text-teal-700 hover:underline" href={`/cases/${c.treatment_id}`}>#{c.treatment_id} {c.title}</Link>
                    <span className="ml-2"><StatusPill status={c.status} /></span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
