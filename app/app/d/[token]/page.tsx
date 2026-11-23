import Link from "next/link";
import { sql } from "@/lib/db";
import { clockTime, initials, timeAgo } from "@/lib/format";
import AnswerForm from "./AnswerForm";

export const dynamic = "force-dynamic";

type Question = {
  id: string;
  body: string;
  created_at: string;
  answer: string | null;
  answered_at: string | null;
  patient_confirmed_at: string | null;
  first_name: string;
};

type Status = "waiting" | "answered" | "solved";

function statusOf(q: Question): Status {
  if (!q.answer) return "waiting";
  return q.patient_confirmed_at ? "solved" : "answered";
}

const BADGE: Record<Status, string> = {
  waiting: "border-orange-300 bg-orange-50 text-orange-700",
  answered: "border-blue-300 bg-blue-50 text-blue-700",
  solved: "border-brand-soft bg-brand-tint text-brand-dark",
};

function Badge({ status }: { status: Status }) {
  return (
    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-bold tracking-wide ${BADGE[status]}`}>
      {status.toUpperCase()}
    </span>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-600 text-sm font-semibold text-white">
      {initials(name)}
    </span>
  );
}

// S4 · The doctor answers (Figma frames "MVP 3a · Read and answer" and "MVP 3b · Answer sent").
export default async function DoctorPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ q?: string; sent?: string }>;
}) {
  const { token } = await params;
  const { q, sent } = await searchParams;

  const [doctor] = await sql`select id, display_name, specialty from doctors where token = ${token}`;
  if (!doctor) {
    return <p className="p-6 text-center text-slate-600">This link is not valid.</p>;
  }

  // Only this doctor's questions: another doctor's token never reaches them.
  const questions = (await sql`
    select q.id::text as id, q.body, q.created_at, q.answer, q.answered_at, q.patient_confirmed_at, p.first_name
    from questions q
    join patients p on p.id = q.patient_id
    where q.doctor_id = ${doctor.id}
    order by q.created_at desc`) as Question[];

  const waiting = questions.filter((question) => !question.answer).length;
  const selected =
    questions.find((question) => question.id === q) ??
    questions.find((question) => !question.answer) ??
    questions[0];

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4 md:px-8">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-xl font-bold leading-none text-white">
              +
            </span>
            <span className="text-lg font-bold text-brand-dark">MediBook</span>
          </div>
          <span className="rounded-lg bg-brand-tint px-3 py-1.5 text-sm font-semibold text-brand-dark">Questions</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold tracking-wide text-slate-500">
            DOCTOR · PRIVATE LINK
          </span>
          <span className="text-sm font-semibold">
            {doctor.display_name} · {doctor.specialty}
          </span>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-5 py-6 md:px-8">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Questions from your patients</h1>
          <p className="mt-1 text-sm text-slate-500">
            One question, one answer. The patient reads your answer on their own link.
          </p>
        </div>

        {questions.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-500">
            No questions yet. When a patient sends one, it shows here.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-[320px_1fr]">
            <section className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between px-1 py-1">
                <p className="text-sm font-semibold">{waiting} waiting</p>
                <p className="text-xs text-slate-500">Newest first</p>
              </div>
              {questions.map((question) => {
                const active = question.id === selected.id;
                return (
                  <Link
                    key={question.id}
                    href={`/d/${token}?q=${question.id}`}
                    scroll={false}
                    className={`flex flex-col gap-1.5 rounded-xl border p-3 ${
                      active ? "border-brand bg-brand-tint" : "border-transparent hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <Avatar name={question.first_name} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{question.first_name}</p>
                        <p className="text-xs text-slate-500">{timeAgo(question.created_at)}</p>
                      </div>
                      <Badge status={statusOf(question)} />
                    </div>
                    <p className="line-clamp-2 text-xs text-slate-600">{question.body}</p>
                  </Link>
                );
              })}
            </section>

            <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-start gap-3">
                <Avatar name={selected.first_name} />
                <div className="flex-1">
                  <p className="font-semibold">{selected.first_name}</p>
                  <p className="text-xs text-slate-500">
                    Your patient · asked {clockTime(selected.created_at)} · {timeAgo(selected.created_at)}
                  </p>
                </div>
                <Badge status={statusOf(selected)} />
              </div>

              <div>
                <p className="mb-1.5 text-xs font-semibold tracking-wide text-slate-500">QUESTION</p>
                <p className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-3">{selected.body}</p>
              </div>

              {selected.answer ? (
                <>
                  <div>
                    <p className="mb-1.5 text-xs font-semibold tracking-wide text-brand-dark">
                      YOUR ANSWER · {clockTime(selected.answered_at!)}
                    </p>
                    <p className="whitespace-pre-wrap rounded-xl border border-brand-soft bg-brand-tint p-3">
                      {selected.answer}
                    </p>
                  </div>
                  {sent === "1" && (
                    <p className="rounded-xl border border-brand-soft bg-brand-tint p-3 font-semibold text-brand-dark">
                      ✓ Answer sent. {selected.first_name} will see it when they open their link.
                    </p>
                  )}
                </>
              ) : (
                <AnswerForm key={selected.id} token={token} questionId={selected.id} patientName={selected.first_name} />
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
