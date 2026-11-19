import Link from "next/link";
import { sql } from "@/lib/db";
import QuestionForm from "./QuestionForm";

export const dynamic = "force-dynamic";

function initials(name: string) {
  return name
    .replace(/^Dr\.?\s+/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

// S3 · Gela writes what changed (Figma frame "MVP 2 · Write your question").
export default async function AskPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [row] = await sql`
    select d.display_name, d.specialty
    from patients p
    join doctors d on d.id = p.doctor_id
    where p.token = ${token}`;

  if (!row) {
    return <p className="p-6 text-center text-slate-600">This link is not valid.</p>;
  }

  const doctorName: string = row.display_name;

  return (
    <div className="flex flex-col gap-5 px-5 py-5">
      <Link href={`/p/${token}`} className="text-sm font-semibold text-brand-dark">
        ‹ All doctors
      </Link>

      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-pink-600 text-sm font-semibold text-white">
          {initials(doctorName)}
        </span>
        <div>
          <p className="font-semibold">{doctorName}</p>
          <p className="text-sm text-slate-500">{row.specialty}</p>
        </div>
      </div>

      <QuestionForm token={token} doctorName={doctorName} />
    </div>
  );
}
