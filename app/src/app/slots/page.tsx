"use client";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SlotApi, DoctorApi, AuthApi } from "@/lib/api";
import { ApiError } from "@/lib/api-client";
import { RoleGate } from "@/components/RoleGate";
import { Avatar } from "@/components/Avatar";
import { Card, StatusPill, EmptyState, ConfirmModal, inputCls } from "@/components/ui";
import { dayKey, fmtDay, timeKey } from "@/lib/format";

const ROWS = ["09:00", "09:30", "10:00", "10:30", "14:00", "14:30", "15:00", "15:30"];
const MIN_MINUTES = 30;

function toLocalInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function addMinutes(local: string, mins: number): string {
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return "";
  return toLocalInput(new Date(d.getTime() + mins * 60000));
}

function diffMinutes(start: string, end: string): number | null {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (!start || !end || Number.isNaN(s) || Number.isNaN(e)) return null;
  return (e - s) / 60000;
}

export default function AdminSlotsPage() {
  return <RoleGate allow={["HOSPITAL_ADMIN"]}><AdminSlotsInner /></RoleGate>;
}

function AdminSlotsInner() {
  const [doctorId, setDoctorId] = useState("");
  // Admins manage only their own hospital: the doctor picker is loaded
  // pre-filtered server-side, never the full cross-hospital directory.
  const { data: me, isLoading: meLoading, isError: meError } = useQuery({
    queryKey: ["my-profile"], queryFn: AuthApi.myProfile,
  });
  const hospitalId = me?.hospital_id ?? null;
  const { data: doctors } = useQuery({
    queryKey: ["doctors-own-hospital", hospitalId],
    queryFn: () => DoctorApi.list(hospitalId!),
    enabled: hospitalId != null,
  });
  const { data: slots } = useQuery({
    queryKey: ["admin-slots", doctorId], queryFn: () => SlotApi.list(doctorId ? Number(doctorId) : undefined),
    enabled: !!doctorId,
  });
  const [form, setForm] = useState({ start_time: "", end_time: "", consultation_mode: "IN_PERSON" });
  const [createErr, setCreateErr] = useState("");
  const [createdId, setCreatedId] = useState<number | null>(null);
  const qc = useQueryClient();
  const mins = diffMinutes(form.start_time, form.end_time);
  const tooShort = mins !== null && mins < MIN_MINUTES;
  const create = useMutation({
    mutationFn: (payload: { doctor_id: number; start_time: string; end_time: string; consultation_mode: string }) =>
      SlotApi.create(payload),
    onSuccess: (s) => {
      setCreateErr("");
      setCreatedId(s.slot_id);
      setForm((f) => ({ ...f, start_time: "", end_time: "" }));
      qc.invalidateQueries({ queryKey: ["admin-slots", doctorId] });
      qc.invalidateQueries({ queryKey: ["admin-slots"] });
    },
    onError: (e) => setCreateErr(e instanceof ApiError ? e.message : "Could not create slot"),
  });
  const canSubmit = !!doctorId && !!form.start_time && !!form.end_time && !tooShort && !create.isPending;
  const [delId, setDelId] = useState<number | null>(null);
  const remove = useMutation({
    mutationFn: (id: number) => SlotApi.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-slots"] }); setDelId(null); },
  });
  const doc = (doctors ?? []).find((d) => d.doctor_id === Number(doctorId));

  const { days, grid, offGrid } = useMemo(() => {
    const daySet = Array.from(new Set((slots ?? []).map((s) => dayKey(s.start_time)))).sort().slice(0, 7);
    const cell = new Map<string, NonNullable<typeof slots>[number][]>();
    const off: NonNullable<typeof slots>[number][] = [];
    for (const s of slots ?? []) {
      const dk = dayKey(s.start_time); const tk = timeKey(s.start_time);
      if (!daySet.includes(dk) || !ROWS.includes(tk)) { off.push(s); continue; }
      const k = `${dk}|${tk}`;
      if (!cell.has(k)) cell.set(k, []);
      cell.get(k)!.push(s);
    }
    return { days: daySet, grid: cell, offGrid: off };
  }, [slots]);

  return <div className="space-y-6">
    <div><h1 className="text-3xl font-bold">Slots manager</h1>
    <p className="text-slate-500 mt-1">Pick a doctor, see the Teams-style week grid, add or remove times.</p></div>
    {(meError || (!meLoading && hospitalId == null)) && (
      <Card><EmptyState title="Could not load your hospital"
        hint="Doctors stay hidden until your hospital is known. Try reloading the page." /></Card>
    )}
    <Card className="p-4">
      <div className="flex flex-wrap items-center gap-3">
        <select className={`${inputCls} !w-auto min-w-[240px]`} value={doctorId} onChange={(e) => setDoctorId(e.target.value)} aria-label="Doctor">
          <option value="">Select doctor…</option>
          {doctors?.map((d) => <option key={d.doctor_id} value={d.doctor_id}>{d.first_name} {d.last_name} (#{d.doctor_id})</option>)}
        </select>
        {doc && <span className="flex items-center gap-2 text-sm"><Avatar src={doc.photo_url} firstName={doc.first_name} lastName={doc.last_name} size={28} /><b>{doc.first_name} {doc.last_name}</b></span>}
      </div>
      {doctorId && <div className="mt-3 grid sm:grid-cols-4 gap-2 items-end">
        <label className="text-xs font-medium text-slate-500">Start<input className={inputCls} type="datetime-local" value={form.start_time} onChange={(e) => {
          const v = e.target.value;
          setForm((f) => {
            const next = { ...f, start_time: v };
            const curMins = diffMinutes(v, f.end_time);
            if (!f.end_time || curMins === null || curMins < MIN_MINUTES) {
              const auto = addMinutes(v, MIN_MINUTES);
              if (auto) next.end_time = auto;
            }
            return next;
          });
          setCreateErr(""); setCreatedId(null);
        }} /></label>
        <label className="text-xs font-medium text-slate-500">End (min +30m)<input className={inputCls} type="datetime-local" value={form.end_time} min={form.start_time || undefined} onChange={(e) => { setForm({ ...form, end_time: e.target.value }); setCreateErr(""); setCreatedId(null); }} /></label>
        <label className="text-xs font-medium text-slate-500">Mode
          <select className={inputCls} value={form.consultation_mode} onChange={(e) => setForm({ ...form, consultation_mode: e.target.value })}>
            <option>IN_PERSON</option><option>ONLINE</option>
          </select></label>
        <button disabled={!canSubmit} onClick={() => create.mutate({ doctor_id: Number(doctorId), ...form })}
          className="bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white font-semibold px-4 py-2.5 rounded-xl">+ Add slot</button>
      </div>}
      {doctorId && tooShort && <p className="mt-2 text-xs text-rose-600" role="alert">Slot must be at least 30 minutes long.</p>}
      {doctorId && createErr && <p className="mt-2 text-xs text-rose-600" role="alert">{createErr}</p>}
      {doctorId && createdId !== null && !createErr && <p className="mt-2 text-xs text-emerald-700">Slot #{createdId} created.</p>}
    </Card>
    {!doctorId ? <Card><EmptyState title="Select a doctor" hint="The week grid appears here." /></Card>
    : days.length === 0 ? <Card><EmptyState title="No slots yet" hint="Add the first time above." /></Card>
    : <Card className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm border-collapse">
        <thead><tr className="border-b border-slate-200 bg-slate-50/70">
          <th className="text-left font-semibold text-slate-500 p-3 w-20">Time</th>
          {days.map((d) => <th key={d} className="text-left font-semibold p-3">{fmtDay(d)}</th>)}
        </tr></thead>
        <tbody>{ROWS.map((t) => (
          <tr key={t} className="border-b border-slate-100 last:border-0 align-top">
            <td className="p-3 text-slate-400 font-medium whitespace-nowrap">{t}</td>
            {days.map((d) => {
              const items = grid.get(`${d}|${t}`) ?? [];
              return <td key={d} className="p-1.5 min-w-[150px]">
                {items.length === 0
                  ? <div className="h-9 rounded-lg bg-slate-50 border border-dashed border-slate-200" />
                  : <div className="space-y-1.5">{items.map((s) => (
                    <div key={s.slot_id} className={`rounded-xl border p-2 ${s.status === "AVAILABLE" ? "bg-emerald-50/60 border-emerald-200" : "bg-slate-50 border-slate-200"}`}>
                      <div className="flex items-center gap-1.5"><StatusPill status={s.status} /><StatusPill status={s.consultation_mode} /></div>
                      {s.status !== "BOOKED" && <button onClick={() => setDelId(s.slot_id)} className="mt-1.5 text-[11px] font-semibold text-rose-600 hover:underline">Remove</button>}
                    </div>))}</div>}
              </td>;
            })}
          </tr>))}
        </tbody>
      </table>
    </Card>}
    {offGrid.length > 0 && <Card className="p-4 text-sm text-slate-600">+ {offGrid.length} slot(s) outside the 09:00–15:30 grid.</Card>}
    <Card className="p-5">
      <h2 className="font-bold text-lg">Hospital visits</h2>
      <p className="text-sm text-slate-500 mt-2">
        Visits moved to their own page with doctor & patient cards.{" "}
        <a className="text-teal-700 font-semibold hover:underline" href="/visits">Open hospital visits →</a>
      </p>
    </Card>
    {delId !== null && <ConfirmModal title={`Remove slot #${delId}?`} body="Booked slots cannot be removed."
      confirmLabel="Remove" onClose={() => setDelId(null)} onConfirm={async () => { await remove.mutateAsync(delId); }} />}
  </div>;
}
