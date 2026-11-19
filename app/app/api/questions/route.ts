import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

const MAX_LENGTH = 500;

// S3 · Gela sends what changed: saves the question for the patient's own doctor.
export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const token = typeof payload?.token === "string" ? payload.token : "";
  const body = typeof payload?.body === "string" ? payload.body.trim() : "";

  if (!body) {
    return NextResponse.json({ error: "empty" }, { status: 400 });
  }
  if (body.length > MAX_LENGTH) {
    return NextResponse.json({ error: "too_long" }, { status: 400 });
  }

  const [patient] = await sql`select id, doctor_id from patients where token = ${token}`;
  if (!patient) {
    return NextResponse.json({ error: "invalid_link" }, { status: 404 });
  }

  const [question] = await sql`
    insert into questions (patient_id, doctor_id, body)
    values (${patient.id}, ${patient.doctor_id}, ${body})
    returning id, created_at`;

  return NextResponse.json({
    question_id: question.id,
    patient_id: patient.id,
    doctor_id: patient.doctor_id,
    created_at: question.created_at,
    char_count: body.length,
  });
}
