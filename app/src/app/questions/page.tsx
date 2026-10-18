"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QuestionApi } from "@/lib/api";
import { ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth";
import { RoleGate } from "@/components/RoleGate";
import { Card, EmptyState, Skeleton, StatusPill, inputCls } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";
import type { Question, QuestionUrgency } from "@/types/api";

function errText(e: unknown, fallback: string) {
  return e instanceof ApiError ? e.message : fallback;
}

function hoursLabel(h: number) {
  return h % 24 === 0 ? `${h / 24} day${h === 24 ? "" : "s"}` : `${h} hours`;
}

export default function QuestionsPage() {
  const { role } = useAuth();
  return (
    <RoleGate allow={["PATIENT", "DOCTOR"]}>
      <Suspense fallback={<Skeleton className="h-64" />}>
        {role === "DOCTOR" ? <DoctorInbox /> : <PatientQuestions />}
      </Suspense>
    </RoleGate>
  );
}

// --- patient ------------------------------------------------------------------------

function PatientQuestions() {
  const qc = useQueryClient();
  const params = useSearchParams();
  const { data: doctors, isLoading: loadingDoctors } = useQuery({ queryKey: ["askable-doctors"], queryFn: QuestionApi.askableDoctors });
  const { data: questions, isLoading } = useQuery({ queryKey: ["my-questions"], queryFn: () => QuestionApi.list(), refetchInterval: 30_000 });
  const [doctorId, setDoctorId] = useState<number | null>(null);
  const [body, setBody] = useState("");
  const [urgency, setUrgency] = useState<QuestionUrgency>("ROUTINE");

  useEffect(() => {
    if (doctorId !== null || !doctors?.length) return;
    const wanted = Number(params.get("doctor"));
    setDoctorId(doctors.some((d) => d.doctor_id === wanted) ? wanted : doctors[0].doctor_id);
  }, [doctors, doctorId, params]);

  // Reading an answer counts as "seen" (clears the badge in the menu).
  useEffect(() => {
    const unseen = (questions ?? []).filter((q) => q.status === "ANSWERED" && !q.patient_seen_at);
    if (!unseen.length) return;
    Promise.all(unseen.map((q) => QuestionApi.seen(q.question_id))).then(() => {
      qc.invalidateQueries({ queryKey: ["question-summary"] });
    }).catch(() => undefined);
  }, [questions, qc]);

  const selected = doctors?.find((d) => d.doctor_id === doctorId) ?? null;
  const ask = useMutation({
    mutationFn: () => QuestionApi.ask(doctorId!, body.trim(), urgency),
    onSuccess: () => {
      setBody("");
      setUrgency("ROUTINE");
      qc.invalidateQueries({ queryKey: ["my-questions"] });
      qc.invalidateQueries({ queryKey: ["question-summary"] });
    },
  });
  const close = useMutation({
    mutationFn: (id: number) => QuestionApi.close(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-questions"] }),
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold">Questions for your doctor</h1>
        <p className="text-slate-500 mt-1">A short question between visits, instead of calling the clinic again and again.</p>
      </div>

      <Card className="p-5">
        {loadingDoctors ? <Skeleton className="h-32" />
        : !doctors?.length ? <EmptyState title="No doctor to ask yet" hint="You can ask a doctor you have booked a visit with." />
        : <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (doctorId && body.trim().length >= 3) ask.mutate(); }}>
          <p className="text-sm bg-rose-50 border border-rose-200 text-rose-800 rounded-xl px-3 py-2">
            Chest pain, trouble breathing, fainting or another emergency? <span className="font-semibold">Call 112</span>, do not wait for an answer here.
          </p>
          <label className="block text-sm font-medium text-slate-700">Doctor
            <select className={`${inputCls} mt-1`} value={doctorId ?? ""} onChange={(e) => setDoctorId(Number(e.target.value))}>
              {doctors.map((d) => <option key={d.doctor_id} value={d.doctor_id}>Dr. {d.first_name} {d.last_name}</option>)}
            </select>
          </label>
          {selected && (
            <p className={`text-sm ${selected.questions_open ? "text-slate-600" : "text-amber-800"}`}>
              {selected.questions_open
                ? <>Usually answers within <span className="font-semibold">{hoursLabel(selected.reply_within_hours)}</span>{selected.reply_note ? ` · ${selected.reply_note}` : ""}.</>
                : <>Dr. {selected.last_name} is not taking questions right now{selected.reply_note ? ` (${selected.reply_note})` : ""}. Call the clinic or book a visit.</>}
            </p>
          )}
          <label className="block text-sm font-medium text-slate-700">Your question
            <textarea className={`${inputCls} mt-1`} rows={4} maxLength={1000} value={body} onChange={(e) => setBody(e.target.value)}
              placeholder="e.g. I started the new tablet on Monday and my sugar was 3.4 this morning. Should I keep the same dose?" />
          </label>
          <fieldset className="flex flex-wrap gap-3 text-sm">
            <legend className="sr-only">How soon do you need an answer?</legend>
            {([["ROUTINE", "It can wait a couple of days"], ["SOON", "Something changed, I need an answer soon"]] as const).map(([v, label]) => (
              <label key={v} className={`flex items-center gap-2 border rounded-xl px-3 py-2 cursor-pointer ${urgency === v ? "border-teal-500 bg-teal-50" : "border-slate-300"}`}>
                <input type="radio" name="urgency" checked={urgency === v} onChange={() => setUrgency(v)} /> {label}
              </label>
            ))}
          </fieldset>
          <div className="flex items-center gap-3">
            <button disabled={ask.isPending || !doctorId || body.trim().length < 3 || (selected ? !selected.questions_open : false)}
              className="bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white font-semibold px-5 py-2.5 rounded-xl">
              {ask.isPending ? "Sending…" : "Send question"}
            </button>
            <span className="text-xs text-slate-400">{body.length}/1000</span>
          </div>
          {ask.isError && <p className="text-sm text-rose-600" role="alert">{errText(ask.error, "Could not send your question.")}</p>}
          {ask.isSuccess && <p className="text-sm text-emerald-700" role="status">Sent. You will get a text when the doctor answers.</p>}
        </form>}
      </Card>

      <h2 className="text-xl font-bold">Your questions</h2>
      {isLoading ? <Skeleton className="h-24" />
      : !questions?.length ? <Card><EmptyState title="No questions yet" /></Card>
      : <div className="space-y-3">{questions.map((q) => (
        <Card key={q.question_id} className="p-4">
          <div className="flex items-center gap-2 flex-wrap text-sm">
            <span className="font-semibold">Dr. {q.doctor_first_name} {q.doctor_last_name}</span>
            <StatusPill status={q.status} />
            {q.urgency === "SOON" && <StatusPill status="SOON" />}
            <span className="ml-auto text-xs text-slate-400">{q.created_at ? fmtDateTime(q.created_at) : ""}</span>
          </div>
          <p className="mt-2 text-slate-800 whitespace-pre-wrap">{q.body}</p>
          {q.status === "OPEN" && (
            <p className="mt-2 text-xs text-slate-500">
              {q.doctor_seen_at ? `✓ Seen by the doctor ${fmtDateTime(q.doctor_seen_at)}` : "Not opened yet"}
              {q.due_by ? ` · answer expected by ${fmtDateTime(q.due_by)}` : ""}
            </p>
          )}
          {q.answer && (
            <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
              <p className="text-xs font-semibold text-emerald-700">Answer{q.answered_at ? ` · ${fmtDateTime(q.answered_at)}` : ""}</p>
              <p className="mt-1 text-slate-800 whitespace-pre-wrap">{q.answer}</p>
            </div>
          )}
          {q.status !== "CLOSED" && (
            <button onClick={() => close.mutate(q.question_id)} disabled={close.isPending}
              className="mt-2 text-sm font-semibold text-slate-500 hover:text-slate-800">
              {q.status === "ANSWERED" ? "Done, close it" : "Close without an answer"}
            </button>
          )}
        </Card>
      ))}</div>}
    </div>
  );
}

// --- doctor ---------------------------------------------------------------------------

function DoctorInbox() {
  const qc = useQueryClient();
  const { userId } = useAuth();
  const { data: questions, isLoading } = useQuery({ queryKey: ["doctor-questions"], queryFn: () => QuestionApi.list(), refetchInterval: 30_000 });
  const [tab, setTab] = useState<"OPEN" | "DONE">("OPEN");
  const rows = useMemo(() => (questions ?? []).filter((q) => (tab === "OPEN" ? q.status === "OPEN" : q.status !== "OPEN")), [questions, tab]);
  const openCount = (questions ?? []).filter((q) => q.status === "OPEN").length;

  return (
    <div className="space-y-5">
      <div className="flex items-end gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Patient questions</h1>
          <p className="text-slate-500 mt-1">Short questions from your patients between visits. Urgent ones ("something changed") come first.</p>
        </div>
        <div className="ml-auto flex bg-white border border-slate-200 rounded-xl p-1 text-sm font-semibold">
          {(["OPEN", "DONE"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 rounded-lg ${tab === t ? "bg-slate-900 text-white" : "text-slate-500"}`}>
              {t === "OPEN" ? `Open (${openCount})` : "Answered"}
            </button>
          ))}
        </div>
      </div>
      {userId && <ReplySettings doctorId={userId} />}
      {isLoading ? <Skeleton className="h-40" />
      : !rows.length ? <Card><EmptyState title={tab === "OPEN" ? "No open questions" : "Nothing answered yet"} /></Card>
      : <div className="space-y-3">{rows.map((q) => <DoctorQuestionCard key={q.question_id} q={q} onChange={() => {
          qc.invalidateQueries({ queryKey: ["doctor-questions"] });
          qc.invalidateQueries({ queryKey: ["question-summary"] });
        }} />)}</div>}
    </div>
  );
}

const TEMPLATES = [
  "Please book a visit so I can examine you.",
  "Keep taking it as prescribed; we will review it at your next visit.",
];

function DoctorQuestionCard({ q, onChange }: { q: Question; onChange: () => void }) {
  const [open, setOpen] = useState(false);
  const [answer, setAnswer] = useState("");
  const seen = useMutation({ mutationFn: () => QuestionApi.seen(q.question_id), onSuccess: onChange });
  const send = useMutation({ mutationFn: () => QuestionApi.answer(q.question_id, answer.trim()), onSuccess: () => { setAnswer(""); onChange(); } });
  const close = useMutation({ mutationFn: () => QuestionApi.close(q.question_id), onSuccess: onChange });
  const patient = q.patient_first_name ? `${q.patient_first_name} ${q.patient_last_name ?? ""}`.trim() : `Patient #${q.patient_id}`;

  function expand() {
    setOpen(true);
    if (!q.doctor_seen_at && !seen.isPending) seen.mutate();
  }

  return (
    <Card className={`p-4 ${q.overdue ? "border-rose-300" : q.urgency === "SOON" && q.status === "OPEN" ? "border-amber-300" : ""}`}>
      <div className="flex items-center gap-2 flex-wrap text-sm">
        <Link href={`/patients/${q.patient_id}`} className="font-semibold hover:text-teal-700 hover:underline">{patient}</Link>
        <StatusPill status={q.status} />
        <StatusPill status={q.urgency} />
        {q.status === "OPEN" && !q.doctor_seen_at && <span className="text-xs font-bold text-blue-700">NEW</span>}
        {q.overdue && <span className="text-xs font-bold text-rose-700">Past your reply window</span>}
        {q.treatment_id && <Link href={`/cases/${q.treatment_id}`} className="text-xs font-semibold text-teal-700 hover:underline">Case #{q.treatment_id}</Link>}
        <span className="ml-auto text-xs text-slate-400">{q.created_at ? fmtDateTime(q.created_at) : ""}</span>
      </div>
      {!open && q.status === "OPEN"
        ? <button onClick={expand} className="mt-2 text-left w-full text-slate-700 line-clamp-2 hover:text-slate-900">{q.body}</button>
        : <p className="mt-2 text-slate-800 whitespace-pre-wrap">{q.body}</p>}
      {q.answer && (
        <div className="mt-3 bg-slate-50 border border-slate-200 rounded-xl p-3">
          <p className="text-xs font-semibold text-slate-500">Your answer{q.answered_at ? ` · ${fmtDateTime(q.answered_at)}` : ""}</p>
          <p className="mt-1 whitespace-pre-wrap">{q.answer}</p>
        </div>
      )}
      {q.status === "OPEN" && (open ? (
        <div className="mt-3 space-y-2">
          <div className="flex gap-2 flex-wrap">
            {TEMPLATES.map((t) => (
              <button key={t} type="button" onClick={() => setAnswer(t)} className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-300 hover:bg-slate-50">{t}</button>
            ))}
          </div>
          <textarea className={inputCls} rows={3} maxLength={2000} value={answer} onChange={(e) => setAnswer(e.target.value)}
            placeholder="Your answer. The patient gets a text that you answered; the text itself stays in MediBook." aria-label="Answer" />
          <div className="flex gap-2">
            <button onClick={() => send.mutate()} disabled={send.isPending || !answer.trim()}
              className="text-sm font-semibold px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-40">
              {send.isPending ? "Sending…" : "Send answer"}
            </button>
            <button onClick={() => close.mutate()} disabled={close.isPending}
              className="text-sm font-semibold px-4 py-2 rounded-xl border border-slate-300">Close without answer</button>
          </div>
          {(send.isError || close.isError) && <p className="text-sm text-rose-600" role="alert">{errText(send.error ?? close.error, "Could not save.")}</p>}
        </div>
      ) : (
        <button onClick={expand} className="mt-2 text-sm font-semibold text-teal-700 hover:underline">Open and answer →</button>
      ))}
    </Card>
  );
}

function ReplySettings({ doctorId }: { doctorId: number }) {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["question-settings", doctorId], queryFn: () => QuestionApi.settings(doctorId) });
  const [note, setNote] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: QuestionApi.updateSettings,
    onSuccess: (d) => { qc.setQueryData(["question-settings", doctorId], d); setNote(null); },
  });
  if (!data) return null;
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3 flex-wrap text-sm">
        <h2 className="font-bold text-base">Your reply window</h2>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={data.questions_open} onChange={(e) => save.mutate({ questions_open: e.target.checked })} />
          Taking questions
        </label>
        <label className="flex items-center gap-2">Answer within
          <select className={`${inputCls} w-auto py-1.5`} value={data.reply_within_hours}
            onChange={(e) => save.mutate({ reply_within_hours: Number(e.target.value) })}>
            {[24, 48, 72, 120].map((h) => <option key={h} value={h}>{hoursLabel(h)}</option>)}
          </select>
        </label>
      </div>
      <div className="mt-2 flex gap-2 flex-wrap">
        <input className={`${inputCls} flex-1 min-w-[220px]`} maxLength={200}
          placeholder="Shown to patients, e.g. I answer on weekdays before 17:00"
          value={note ?? data.reply_note ?? ""} onChange={(e) => setNote(e.target.value)} aria-label="Reply note" />
        {note !== null && note !== (data.reply_note ?? "") && (
          <button onClick={() => save.mutate({ reply_note: note })} disabled={save.isPending}
            className="text-sm font-semibold px-4 py-2 rounded-xl bg-slate-900 text-white disabled:opacity-50">Save note</button>
        )}
      </div>
      <p className="mt-2 text-xs text-slate-500">No texts or calls reach your phone: questions wait here, and patients see when you have opened them.</p>
      {save.isError && <p className="mt-1 text-sm text-rose-600" role="alert">{errText(save.error, "Could not save.")}</p>}
    </Card>
  );
}
