"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DelayApi, WaitlistApi } from "@/lib/api";
import { ApiError } from "@/lib/api-client";
import { Card, StatusPill, inputCls } from "@/components/ui";
import { dayKey, fmtDateTime, fmtTime } from "@/lib/format";
import type { WaitlistEntry } from "@/types/api";

function errText(e: unknown, fallback: string) {
  return e instanceof ApiError ? e.message : fallback;
}

export function isToday(iso?: string | null) {
  return !!iso && dayKey(iso) === dayKey(new Date().toISOString());
}

// --- running late + check-in --------------------------------------------------

/** Patient-side notice for a visit today: how late the doctor runs and when to expect the start. */
export function DelayBanner({ a }: {
  a: { status: string; start_time?: string | null; delay_minutes?: number; expected_start?: string | null; checked_in_at?: string | null };
}) {
  if (a.status !== "SCHEDULED" || !isToday(a.start_time)) return null;
  const late = (a.delay_minutes ?? 0) > 0 && a.expected_start;
  return (
    <div className="mt-2 space-y-1.5">
      {late ? (
        <p className="text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-3 py-2" role="status">
          <span className="font-semibold">Running about {a.delay_minutes} min late.</span>{" "}
          Expected start around <span className="font-semibold">{fmtTime(a.expected_start!)}</span>
          {a.start_time ? ` (booked ${fmtTime(a.start_time)})` : ""}. Your place in the queue does not change.
        </p>
      ) : (
        <p className="text-sm text-emerald-700">On schedule today{a.start_time ? ` · ${fmtTime(a.start_time)}` : ""}.</p>
      )}
      {a.checked_in_at && <p className="text-sm font-semibold text-emerald-700">✓ Checked in at {fmtTime(a.checked_in_at)}</p>}
    </div>
  );
}

/** "I'm here" button, shown only on the day of a scheduled visit. */
export function CheckInButton({ a, label = "I'm here — check in", onDone }: {
  a: { appointment_id: number; status: string; start_time?: string | null; checked_in_at?: string | null };
  label?: string;
  onDone?: () => void;
}) {
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: () => DelayApi.checkIn(a.appointment_id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-appointments"] });
      qc.invalidateQueries({ queryKey: ["appointment", a.appointment_id] });
      qc.invalidateQueries({ queryKey: ["doctor-appointments"] });
      qc.invalidateQueries({ queryKey: ["admin-visits"] });
      onDone?.();
    },
  });
  if (a.status !== "SCHEDULED" || !isToday(a.start_time) || a.checked_in_at) return null;
  return (
    <span className="inline-flex items-center gap-2">
      <button onClick={() => m.mutate()} disabled={m.isPending}
        className="text-sm font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50">
        {m.isPending ? "Checking in…" : label}
      </button>
      {m.isError && <span className="text-sm text-rose-600" role="alert">{errText(m.error, "Could not check in.")}</span>}
    </span>
  );
}

const QUICK = [0, 15, 30, 45, 60, 90];

/** Doctor / reception control: post today's delay. Patients booked today are told by SMS/email. */
export function DelayControl({ doctorId, title = "Running late today?" }: { doctorId: number; title?: string }) {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["delay", doctorId], queryFn: () => DelayApi.get(doctorId), refetchInterval: 60_000 });
  const [minutes, setMinutes] = useState(0);
  const [note, setNote] = useState("");
  const [result, setResult] = useState<string | null>(null);
  useEffect(() => {
    if (data) { setMinutes(data.delay_minutes); setNote(data.note ?? ""); }
  }, [data]);
  const save = useMutation({
    mutationFn: (m: number) => DelayApi.set(doctorId, m, note.trim() || undefined),
    onSuccess: (d) => {
      qc.setQueryData(["delay", doctorId], d);
      qc.invalidateQueries({ queryKey: ["doctor-appointments"] });
      qc.invalidateQueries({ queryKey: ["admin-visits"] });
      const told = d.patients_notified ?? 0;
      setResult(d.delay_minutes === 0
        ? `Marked on schedule${told ? ` · ${told} patient${told === 1 ? "" : "s"} told` : ""}.`
        : `Delay set to ${d.delay_minutes} min${told ? ` · ${told} patient${told === 1 ? "" : "s"} told by SMS/email` : " · no new message sent (change too small or no visits left today)"}.`);
    },
  });
  const current = data?.delay_minutes ?? 0;
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 flex-wrap">
        <h2 className="font-bold">{title}</h2>
        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${current > 0 ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
          {current > 0 ? `${current} min late` : "On schedule"}
        </span>
        {data?.updated_at && <span className="text-xs text-slate-400">updated {fmtTime(data.updated_at)}</span>}
      </div>
      <p className="text-sm text-slate-500 mt-1">Patients booked for later today see the expected start time. From 15 minutes they also get a text.</p>
      <div className="mt-3 flex flex-wrap gap-2 items-center">
        {QUICK.map((m) => (
          <button key={m} type="button" onClick={() => setMinutes(m)}
            className={`text-sm font-semibold px-3 py-1.5 rounded-lg border ${minutes === m ? "bg-slate-900 text-white border-slate-900" : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"}`}>
            {m === 0 ? "On time" : `${m} min`}
          </button>
        ))}
        <input type="number" min={0} max={240} value={minutes} aria-label="Delay in minutes"
          onChange={(e) => setMinutes(Math.max(0, Math.min(240, Number(e.target.value) || 0)))}
          className={`${inputCls} w-24`} />
      </div>
      <div className="mt-2 flex gap-2 flex-wrap">
        <input className={`${inputCls} flex-1 min-w-[200px]`} maxLength={200} placeholder="Note for reception (optional), e.g. emergency on the ward"
          value={note} onChange={(e) => setNote(e.target.value)} aria-label="Delay note" />
        <button onClick={() => save.mutate(minutes)} disabled={save.isPending}
          className="text-sm font-semibold px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-50">
          {save.isPending ? "Saving…" : "Update"}
        </button>
      </div>
      {result && !save.isError && <p className="mt-2 text-sm text-emerald-700" role="status">{result}</p>}
      {save.isError && <p className="mt-2 text-sm text-rose-600" role="alert">{errText(save.error, "Could not update the delay.")}</p>}
    </Card>
  );
}

// --- waitlist ---------------------------------------------------------------------

function doctorLabel(e: WaitlistEntry) {
  return e.doctor_first_name ? `Dr. ${e.doctor_first_name} ${e.doctor_last_name ?? ""}`.trim() : `Doctor #${e.doctor_id}`;
}

/** Patient's waitlist entries: accept/decline a held slot, or leave the list. */
export function MyWaitlist() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["my-waitlist"], queryFn: () => WaitlistApi.mine(), refetchInterval: 60_000 });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["my-waitlist"] });
    qc.invalidateQueries({ queryKey: ["my-appointments"] });
    qc.invalidateQueries({ queryKey: ["slots"] });
  };
  const act = useMutation({
    mutationFn: ({ id, kind }: { id: number; kind: "accept" | "decline" | "leave" }) =>
      kind === "accept" ? WaitlistApi.accept(id) : kind === "decline" ? WaitlistApi.decline(id) : WaitlistApi.leave(id),
    onSettled: refresh,
  });
  if (!data?.length) return null;
  return (
    <Card className="p-4">
      <h2 className="font-bold">Waiting for an earlier visit</h2>
      <ul className="mt-2 space-y-2">
        {data.map((e) => (
          <li key={e.entry_id} className={`rounded-xl border p-3 text-sm ${e.status === "OFFERED" ? "border-amber-300 bg-amber-50" : "border-slate-200"}`}>
            <div className="flex items-center gap-2 flex-wrap">
              <Link href={`/doctors/${e.doctor_id}`} className="font-semibold hover:text-teal-700 hover:underline">{doctorLabel(e)}</Link>
              <StatusPill status={e.status} />
              {e.status === "WAITING" && e.position != null && <span className="text-slate-500">#{e.position} in line</span>}
              {e.wanted_before && <span className="text-slate-500">· before {e.wanted_before}</span>}
            </div>
            {e.status === "OFFERED" && e.offered_start && (
              <p className="mt-1.5 text-amber-900">
                <span className="font-semibold">{fmtDateTime(e.offered_start)}</span> is free and held for you
                {e.offer_expires_at ? ` until ${fmtTime(e.offer_expires_at)}` : ""}.
              </p>
            )}
            <div className="mt-2 flex gap-2 flex-wrap">
              {e.status === "OFFERED" && <>
                <button disabled={act.isPending} onClick={() => act.mutate({ id: e.entry_id, kind: "accept" })}
                  className="font-semibold px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-50">Take this time</button>
                <button disabled={act.isPending} onClick={() => act.mutate({ id: e.entry_id, kind: "decline" })}
                  className="font-semibold px-3 py-1.5 rounded-lg border border-slate-300 bg-white disabled:opacity-50">Doesn't fit, keep waiting</button>
              </>}
              <button disabled={act.isPending} onClick={() => act.mutate({ id: e.entry_id, kind: "leave" })}
                className="font-semibold px-3 py-1.5 text-rose-600 hover:underline disabled:opacity-50">Leave waitlist</button>
            </div>
          </li>
        ))}
      </ul>
      {act.isError && <p className="mt-2 text-sm text-rose-600" role="alert">{errText(act.error, "That did not work. Refresh and try again.")}</p>}
    </Card>
  );
}

/** Join a doctor's waitlist from the booking page. */
export function JoinWaitlist({ doctorId, noSlots }: { doctorId: number; noSlots: boolean }) {
  const qc = useQueryClient();
  const { data: mine } = useQuery({ queryKey: ["my-waitlist"], queryFn: () => WaitlistApi.mine() });
  const [before, setBefore] = useState("");
  const [note, setNote] = useState("");
  const join = useMutation({
    mutationFn: () => WaitlistApi.join(doctorId, before || null, note.trim() || undefined),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-waitlist"] }),
  });
  const existing = (mine ?? []).find((e) => e.doctor_id === doctorId);
  if (existing) {
    return (
      <Card className="p-4 text-sm">
        <p><span className="font-semibold">You are on this doctor's waitlist</span>
          {existing.position != null ? ` (#${existing.position} in line)` : ""}. We will text you when an earlier time opens.</p>
        <Link href="/appointments" className="mt-1 inline-block font-semibold text-teal-700 hover:underline">See it under My visits →</Link>
      </Card>
    );
  }
  const today = new Date().toISOString().slice(0, 10);
  return (
    <Card className="p-4">
      <h2 className="font-bold">{noSlots ? "No free times? Join the waitlist" : "Need an earlier time than these?"}</h2>
      <p className="text-sm text-slate-500 mt-1">When someone cancels or a new time opens, it is held for the first patient in line and we send you a text.</p>
      <div className="mt-3 grid sm:grid-cols-3 gap-2">
        <label className="text-sm text-slate-600">Only times before (optional)
          <input type="date" min={today} className={`${inputCls} mt-1`} value={before} onChange={(e) => setBefore(e.target.value)} />
        </label>
        <label className="text-sm text-slate-600 sm:col-span-2">Reason (optional)
          <input className={`${inputCls} mt-1`} maxLength={500} placeholder="e.g. back pain, cannot lift at work" value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
      </div>
      <button onClick={() => join.mutate()} disabled={join.isPending}
        className="mt-3 text-sm font-semibold px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-700 text-white disabled:opacity-50">
        {join.isPending ? "Joining…" : "Join waitlist"}
      </button>
      {join.isError && <p className="mt-2 text-sm text-rose-600" role="alert">{errText(join.error, "Could not join the waitlist.")}</p>}
    </Card>
  );
}
