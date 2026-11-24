import Link from "next/link";
import { sql } from "@/lib/db";
import { clockTime, initials, timeAgo } from "@/lib/format";
import OpensDoctorListEvent from "./OpensDoctorListEvent";
import ConfirmResolutionButton from "./ConfirmResolutionButton";
import ViewedAnswersEvent from "./ViewedAnswersEvent";

export const dynamic = "force-dynamic";

const SOURCES = ["demo_invite", "clinic_referral"];

type Question = {
  id: string;
  body: string;
  created_at: string;
  answer: string | null;
  answered_at: string | null;
  patient_confirmed_at: string | null;
};

type ViewedAnswer = {
  question_id: string;
  patient_id: string;
  doctor_id: string;
  minutes_since_answer: number;
};

// S2 · Gela opens his link and finds his doctor (Figma frame "MVP 1 · Your doctor").
export default async function PatientHome({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ src?: string }>;
}) {
  const { token } = await params;
  const { src } = await searchParams;

  const [row] = await sql`
    select p.id as patient_id, p.first_name, d.id as doctor_id, d.display_name, d.specialty
    from patients p
    join doctors d on d.id = p.doctor_id
    where p.token = ${token}`;

  if (!row) {
    return <p className="p-6 text-center text-slate-600">This link is not valid.</p>;
  }

  const doctorName: string = row.display_name;
  const source = src && SOURCES.includes(src) ? src : "other";

  // S5 · Stamping the answer on first display happens here, on the server: the
  // where clause makes later loads (and double renders) leave the value alone.
  const newlyViewed = (await sql`
    update questions
    set patient_viewed_at = now()
    where patient_id = ${row.patient_id} and answer is not null and patient_viewed_at is null
    returning id::text as question_id, patient_id::text as patient_id, doctor_id::text as doctor_id,
      floor(extract(epoch from (now() - answered_at)) / 60)::int as minutes_since_answer`) as ViewedAnswer[];

  const questions = (await sql`
    select id::text as id, body, created_at, answer, answered_at, patient_confirmed_at
    from questions
    where patient_id = ${row.patient_id}
    order by created_at desc, id desc`) as Question[];

  return (
    <div className="flex flex-col gap-4 px-5 py-5">
      <OpensDoctorListEvent patientId={row.patient_id} source={source} />

      <span className="flex w-fit items-center gap-1.5 rounded-full bg-brand-tint px-3 py-1.5 text-sm font-semibold text-brand-dark">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
          <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
        </svg>
        Opened from your clinic&apos;s link
      </span>

      <div>
        <h1 className="text-3xl font-bold leading-tight">Hello, {row.first_name}</h1>
        <p className="mt-1 text-slate-500">
          This is your own doctor. Ask what changed since your last visit — no trip needed.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-pink-600 font-semibold text-white">
            {initials(doctorName)}
          </span>
          <div>
            <p className="font-semibold">{doctorName}</p>
            <p className="text-sm text-slate-500">{row.specialty}</p>
          </div>
        </div>
        <Link
          href={`/p/${token}/ask`}
          className="rounded-xl bg-brand-tint py-3 text-center font-semibold text-brand-dark"
        >
          Ask a question
        </Link>
      </div>

      <ViewedAnswersEvent events={newlyViewed} />

      {/* S5 and S1 · Gela reads the answer, then confirms it (Figma MVP frames for "My questions" and "Resolved"). */}
      <section id="my-questions" className="flex scroll-mt-4 flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">My questions</h2>
          <span className="rounded-full bg-brand-tint px-3 py-1 text-xs font-semibold text-brand-dark">
            {questions.length} {questions.length === 1 ? "question" : "questions"}
          </span>
        </div>

        {questions.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-white p-5 text-center text-sm text-slate-500">
            No questions yet. Ask your doctor when something changes.
          </p>
        ) : (
          questions.map((question) => (
            <article
              key={question.id}
              className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="whitespace-pre-wrap text-sm text-slate-800">{question.body}</p>
                <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                  {clockTime(question.created_at)}
                </span>
              </div>
              <p className="text-xs text-slate-500">Asked {timeAgo(question.created_at)}</p>

              {question.answer ? (
                <div className="flex flex-col gap-3 rounded-xl border border-brand-soft bg-brand-tint p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold tracking-wide text-brand-dark">
                      YOUR DOCTOR&apos;S ANSWER · {clockTime(question.answered_at!)}
                    </p>
                    {question.patient_confirmed_at && (
                      <span className="rounded-full bg-brand px-2.5 py-1 text-[11px] font-bold text-white">
                        Resolved
                      </span>
                    )}
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-brand-dark">{question.answer}</p>
                  <Link
                    href={`/p/${token}/questions/${question.id}`}
                    className="w-fit text-xs font-semibold text-brand-dark"
                  >
                    {question.patient_confirmed_at ? "View answer" : "Read answer"} →
                  </Link>
                  {!question.patient_confirmed_at && (
                    <ConfirmResolutionButton token={token} questionId={question.id} />
                  )}
                </div>
              ) : (
                <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
                  Waiting for your doctor
                </p>
              )}
            </article>
          ))
        )}
      </section>
    </div>
  );
}
