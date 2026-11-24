"use client";

import posthog from "posthog-js";
import { useState } from "react";

// S1 · Gela confirms the answer settled it. The event is captured in this tap
// handler only after the server returns OK, never on render.
export default function ConfirmResolutionButton({
  token,
  questionId,
  variant = "card",
  patientFirstName = "Gela",
  doctorShortName = "your doctor",
  initiallyResolved = false,
}: {
  token: string;
  questionId: string;
  variant?: "card" | "frame";
  patientFirstName?: string;
  doctorShortName?: string;
  initiallyResolved?: boolean;
}) {
  const [resolved, setResolved] = useState(initiallyResolved);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function confirm() {
    if (sending || resolved) return;
    setSending(true);
    setError("");

    const res = await fetch("/api/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, question_id: questionId }),
    }).catch(() => null);

    if (!res || !res.ok) {
      const data = res ? await res.json().catch(() => null) : null;
      setSending(false);
      // A second tap (or a reload after another tap) is already settled: show
      // Resolved, but do not fire the north star event a second time.
      if (data?.error === "already_confirmed") {
        setResolved(true);
        return;
      }
      setError(
        data?.error === "not_answered"
          ? "Your doctor has not answered this yet."
          : "Could not confirm. Check your connection and try again.",
      );
      return;
    }

    setResolved(true);
    setSending(false);

    const data = await res.json().catch(() => null);
    if (!data) return;

    posthog.capture("patient_confirms_remote_resolution", {
      patient_id: data.patient_id,
      doctor_id: data.doctor_id,
      resolution_type: "answer",
      days_since_request: data.days_since_request,
      is_first_resolution_for_patient: data.is_first_resolution_for_patient,
    });
  }

  // The full-screen frame (Figma step 5) replaces the action bar with the
  // solved banner as soon as the tap succeeds.
  if (resolved && variant === "frame") {
    return (
      <div className="-mx-5 bg-slate-100 px-5 pb-4">
        <div className="flex gap-3 rounded-[14px] bg-brand-tint p-3">
          <span className="mt-0.5 shrink-0 text-brand-dark" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="12" cy="12" r="10" />
              <path d="m8 12 2.6 2.6L16 9" />
            </svg>
          </span>
          <div>
            <p className="text-[15px] font-semibold text-brand-dark">Solved — no trip needed</p>
            <p className="mt-0.5 text-[13px] leading-5 text-brand-dark">
              Thank you, {patientFirstName}. {doctorShortName} can see that the answer solved it.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (resolved) {
    return <span className="text-sm font-semibold text-brand-dark">Resolved</span>;
  }

  if (variant === "frame") {
    return (
      <div className="sticky bottom-[82px] -mx-5 border-t border-slate-200 bg-white px-5 py-3">
        <p className="mb-2 text-[15px] font-semibold text-slate-900">Did this answer solve it?</p>
        <button
          type="button"
          onClick={confirm}
          disabled={sending}
          className="h-[43px] w-full rounded-[10px] bg-brand text-[15px] font-semibold text-white disabled:bg-brand-muted"
        >
          {sending ? "Confirming…" : "This solved it, no trip needed"}
        </button>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={confirm}
        disabled={sending}
        className="rounded-xl bg-brand py-2.5 text-sm font-semibold text-white disabled:bg-brand-muted"
      >
        {sending ? "Confirming…" : "This solved it, no trip needed"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
