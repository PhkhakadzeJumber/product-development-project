"use client";

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm ${className}`}>{children}</div>;
}

const PILL: Record<string, string> = {
  SCHEDULED: "bg-blue-50 text-blue-700 border-blue-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-rose-50 text-rose-700 border-rose-200",
  NO_SHOW: "bg-amber-50 text-amber-700 border-amber-200",
  AVAILABLE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  BOOKED: "bg-blue-50 text-blue-700 border-blue-200",
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  DISCONTINUED: "bg-slate-100 text-slate-600 border-slate-200",
  IN_PERSON: "bg-violet-50 text-violet-700 border-violet-200",
  ONLINE: "bg-cyan-50 text-cyan-700 border-cyan-200",
};

export function StatusPill({ status }: { status: string }) {
  const cls = PILL[status] ?? "bg-slate-100 text-slate-600 border-slate-200";
  return <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full border ${cls}`}>{status.replace("_", " ")}</span>;
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return <div className="text-center py-10 text-slate-500">
    <div className="text-3xl mb-2">🩺</div>
    <p className="font-semibold text-slate-700">{title}</p>
    {hint && <p className="text-sm mt-1">{hint}</p>}
  </div>;
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200/70 rounded-xl ${className}`} />;
}

export function Field({ label, htmlFor, children, hint }: {
  label: string; htmlFor?: string; children: React.ReactNode; hint?: string;
}) {
  return <div>
    <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
    {children}
    {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
  </div>;
}

export const inputCls = "border border-slate-300 p-2.5 w-full rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500";

export function PrimaryButton({ children, disabled, loading }: {
  children: React.ReactNode; disabled?: boolean; loading?: boolean;
}) {
  return <button disabled={disabled}
    className="bg-teal-600 hover:bg-teal-700 text-white font-semibold px-5 py-2.5 rounded-xl disabled:opacity-40 transition w-full">
    {loading ? "Please wait…" : children}
  </button>;
}

export function Stars({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return <span className="inline-flex gap-0.5" role="radiogroup" aria-label="rating">
    {[1, 2, 3, 4, 5].map((s) => (
      <button key={s} type="button" role="radio" aria-checked={value === s} aria-label={`${s} star`}
        onClick={() => onChange(s)} className={`text-xl leading-none ${s <= value ? "text-amber-400" : "text-slate-300"}`}>★</button>
    ))}
  </span>;
}

export function ConfirmModal({ title, body, confirmLabel = "Confirm", onConfirm, onClose, error, pending, children }: {
  title: string; body?: string; confirmLabel?: string; onConfirm: () => void | Promise<void>; onClose: () => void; error?: string | null; pending?: boolean; children?: React.ReactNode;
}) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
    <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl space-y-4">
      <h3 className="font-bold text-lg">{title}</h3>
      {body && <p className="text-sm text-slate-600">{body}</p>}
      {children}
      {error && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-2.5" role="alert">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button onClick={onClose} disabled={pending} className="px-4 py-2 rounded-xl border border-slate-300 text-sm font-medium disabled:opacity-50">Keep visit</button>
        <button disabled={pending} onClick={() => { void onConfirm(); }}
          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold disabled:opacity-50">{pending ? "Cancelling…" : confirmLabel}</button>
      </div>
    </div>
  </div>;
}
