import Link from "next/link";
import { sql } from "@/lib/db";
import { initials } from "@/lib/format";
import ConfirmResolutionButton from "../../ConfirmResolutionButton";
import ViewedAnswersEvent from "../../ViewedAnswersEvent";

export const dynamic = "force-dynamic";

// Figma calls her "Dr. Chkheidze" on the solved banner, so use the surname.
function doctorShortName(name: string) {
  const surname = name.trim().split(/\s+/).pop() ?? name;
  return `Dr. ${surname}`;
}

// Question and answer times are shown in Georgian time. Only a Tbilisi calendar
// match counts as "Today"; older dates get "24 Nov, HH:MM" in the same zone.
function displayTime(value: string | Date) {
  function partsFor(date: Date) {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Tbilisi",
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);
    const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
    return {
      year: get("year"),
      month: get("month"),
      day: get("day"),
      time: `${get("hour")}:${get("minute")}`,
    };
  }

  const shown = partsFor(value instanceof Date ? value : new Date(value));
  const today = partsFor(new Date());
  return shown.year === today.year && shown.month === today.month && shown.day === today.day
    ? `Today, ${shown.time}`
    : `${shown.day} ${shown.month}, ${shown.time}`;
}

// S5 and S1 · the full "MVP 4 · Read the answer" / "MVP 5 · Solved, no trip" frames.
export default async function AnswerPage({
  params,
}: {
  params: Promise<{ token: string; questionId: string }>;
}) {
  const { token, questionId } = await params;

  const [row] = await sql`
    select p.first_name, d.display_name as doctor_name, d.specialty,
      q.body, q.answer, q.created_at, q.answered_at, q.patient_confirmed_at, q.patient_viewed_at
    from patients p
    join doctors d on d.id = p.doctor_id
    join questions q on q.patient_id = p.id and q.id::text = ${questionId}
    where p.token = ${token}`;

  if (!row) {
    return <p className="p-6 text-center text-slate-600">This link is not valid.</p>;
  }

  const confirmed = Boolean(row.patient_confirmed_at);

  return (
    <div className="flex flex-1 flex-col bg-slate-100 px-5 pt-[51px]">
      {row.answer && !row.patient_viewed_at && (
        <ViewedAnswersEvent token={token} questionIds={[questionId]} />
      )}

      <Link
        href={`/p/${token}#my-questions`}
        className="flex w-fit items-center gap-1 text-[15px] font-semibold text-brand-dark"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="m15 18-6-6 6-6" />
        </svg>
        My questions
      </Link>

      <div className="mt-3 flex items-center justify-between gap-3">
        <h1 className="text-[20px] font-bold text-slate-900">Your question</h1>
        <span
          className={`rounded-full border px-3 py-1 text-[11px] font-bold tracking-wide ${
            confirmed
              ? "border-brand-soft bg-brand-tint text-brand-dark"
              : "border-blue-700/20 bg-blue-50 text-blue-700"
          }`}
        >
          {confirmed ? "SOLVED" : "ANSWERED"}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pink-600 text-sm font-semibold text-white">
          {initials(row.doctor_name)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-slate-900">{row.doctor_name}</p>
          <p className="truncate text-[13px] text-slate-500">{row.specialty}</p>
        </div>
      </div>

      <section className="mt-4">
        <div className="flex items-center justify-between text-[13px] text-slate-500">
          <span>You</span>
          <span>{displayTime(row.created_at)}</span>
        </div>
        <div className="mt-1.5 whitespace-pre-wrap rounded-[14px] bg-white p-3.5 text-[15px] leading-[21px] text-slate-900">
          {row.body}
        </div>
      </section>

      {row.answer ? (
        <section className="mt-4">
          <div className="flex items-center justify-between gap-3 text-[13px]">
            <span className="truncate font-semibold text-brand-dark">{row.doctor_name}</span>
            <span className="shrink-0 text-slate-500">{displayTime(row.answered_at!)}</span>
          </div>
          <div className="mt-1.5 whitespace-pre-wrap rounded-[14px] bg-brand-tint p-3.5 text-[15px] leading-[21px] text-slate-900">
            {row.answer}
          </div>
        </section>
      ) : (
        <section className="mt-4 rounded-[14px] bg-white p-4">
          <p className="text-[15px] font-semibold text-slate-900">Sent to your doctor</p>
          <p className="mt-1 text-sm text-slate-500">
            Your doctor sees your question on her own screen and answers here. Nothing else to do for now.
          </p>
        </section>
      )}

      {row.answer && (
        <div className={confirmed ? "pt-5" : "mt-auto pt-8"}>
          <ConfirmResolutionButton
            token={token}
            questionId={questionId}
            variant="frame"
            patientFirstName={row.first_name}
            doctorShortName={doctorShortName(row.doctor_name)}
            initiallyResolved={confirmed}
          />
        </div>
      )}

      {/* The shared patient nav is 57px; this white strip makes the tab bar the Figma 83px. */}
      <div className="-mx-5 h-[26px] shrink-0 bg-white" aria-hidden="true" />
    </div>
  );
}
