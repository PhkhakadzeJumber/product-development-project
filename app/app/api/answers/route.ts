import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

const MAX_LENGTH = 1000;

// S4 · The doctor answers: saves the answer on one of this doctor's own open questions.
export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const token = typeof payload?.token === "string" ? payload.token : "";
  const questionId = payload?.question_id != null ? String(payload.question_id) : "";
  const answer = typeof payload?.answer === "string" ? payload.answer.trim() : "";

  if (!answer) {
    return NextResponse.json({ error: "empty" }, { status: 400 });
  }
  if (answer.length > MAX_LENGTH) {
    return NextResponse.json({ error: "too_long" }, { status: 400 });
  }

  const [doctor] = await sql`select id from doctors where token = ${token}`;
  if (!doctor) {
    return NextResponse.json({ error: "invalid_link" }, { status: 404 });
  }

  // Only the doctor's own question, and only while it has no answer: a second send changes nothing.
  const [question] = await sql`
    update questions
    set answer = ${answer}, answered_at = now()
    where id::text = ${questionId} and doctor_id = ${doctor.id} and answer is null
    returning id, patient_id, doctor_id,
      floor(extract(epoch from answered_at - created_at) / 60)::int as minutes_since_question`;

  if (!question) {
    const [existing] = await sql`
      select id from questions where id::text = ${questionId} and doctor_id = ${doctor.id}`;
    return existing
      ? NextResponse.json({ error: "already_answered" }, { status: 409 })
      : NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({
    question_id: question.id,
    patient_id: question.patient_id,
    doctor_id: question.doctor_id,
    minutes_since_question: question.minutes_since_question,
  });
}
