import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

// S1 · Gela confirms that an answered question resolved it without a trip.
export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const token = typeof payload?.token === "string" ? payload.token : "";
  const questionId = payload?.question_id != null ? String(payload.question_id) : "";

  if (!questionId) {
    return NextResponse.json({ error: "missing_question" }, { status: 400 });
  }

  // Serialize confirmations for the same patient. Under READ COMMITTED, the
  // update takes its snapshot after acquiring the lock, so only one can be first.
  const [[patient], [question]] = await sql.transaction([
    sql`select id from patients where token = ${token} for no key update`,
    sql`
      with newly_confirmed as (
        update questions q
        set patient_confirmed_at = statement_timestamp()
        from patients p
        where p.token = ${token} and q.patient_id = p.id and q.id::text = ${questionId}
          and q.answer is not null and q.patient_confirmed_at is null
        returning q.id, q.patient_id, q.doctor_id, q.created_at
      )
      select n.id::text as question_id, n.patient_id::text as patient_id,
        n.doctor_id::text as doctor_id,
        floor(extract(epoch from (statement_timestamp() - n.created_at)) / 86400)::int as days_since_request,
        not exists (
          select 1 from questions q
          where q.patient_id = n.patient_id and q.patient_confirmed_at is not null
        ) as is_first_resolution_for_patient
      from newly_confirmed n`,
  ], { isolationLevel: "ReadCommitted" });

  if (!patient) {
    return NextResponse.json({ error: "invalid_link" }, { status: 404 });
  }

  if (!question) {
    const [existing] = await sql`
      select answer, patient_confirmed_at from questions
      where id::text = ${questionId} and patient_id = ${patient.id}`;
    if (!existing) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: existing.answer ? "already_confirmed" : "not_answered" },
      { status: 409 },
    );
  }

  return NextResponse.json({
    question_id: question.question_id,
    patient_id: question.patient_id,
    doctor_id: question.doctor_id,
    days_since_request: question.days_since_request,
    is_first_resolution_for_patient: question.is_first_resolution_for_patient,
  });
}
