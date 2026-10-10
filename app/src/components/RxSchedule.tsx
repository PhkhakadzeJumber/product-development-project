"use client";

function fmtDate(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/** Human schedule line: "Twice a day · since Mar 4 · for about a month · Ongoing". */
export function scheduleText(p: {
  frequency?: string | null; duration_note?: string | null;
  start_date?: string | null; end_date?: string | null; status?: string | null;
}) {
  const parts: string[] = [];
  if (p.frequency) parts.push(p.frequency);
  if (p.start_date) parts.push(`since ${fmtDate(p.start_date)}`);
  if (p.duration_note) parts.push(p.duration_note);
  if (p.end_date) parts.push(`until ${fmtDate(p.end_date)}`);
  else if (p.status === "ACTIVE") parts.push("ongoing");
  return parts.join(" · ") || "As directed";
}

export function ScheduleLine({ rx, status }: {
  rx: { frequency?: string | null; duration_note?: string | null; start_date?: string | null; end_date?: string | null };
  status?: string | null;
}) {
  return (
    <p className="text-sm text-slate-600 mt-1">
      <span aria-hidden>🗓️</span> {scheduleText({ ...rx, status })}
      {status && status !== "ACTIVE" && (
        <span className="ml-2 text-xs font-semibold text-slate-500">· {status}</span>
      )}
    </p>
  );
}
