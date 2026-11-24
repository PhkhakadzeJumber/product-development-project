"use client";

import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { useState } from "react";

const MAX_LENGTH = 1000;

export default function AnswerForm({
  token,
  questionId,
  patientName,
}: {
  token: string;
  questionId: string;
  patientName: string;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const trimmed = text.trim();

  async function send() {
    if (!trimmed || sending) return;
    setSending(true);
    setError("");

    const res = await fetch("/api/answers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, question_id: questionId, answer: trimmed }),
    }).catch(() => null);

    if (!res || !res.ok) {
      const data = res ? await res.json().catch(() => null) : null;
      setSending(false);
      setError(
        data?.error === "already_answered"
          ? "This question already has an answer. Reload the page to see it."
          : "Could not send your answer. Check your connection and try again.",
      );
      return;
    }

    const data = await res.json();
    posthog.capture("doctor_answers_question", {
      doctor_id: data.doctor_id,
      patient_id: data.patient_id,
      question_id: data.question_id,
      minutes_since_question: data.minutes_since_question,
    });
    router.replace(`/d/${token}?q=${data.question_id}&sent=1`, { scroll: false });
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="mb-1.5 text-xs font-semibold tracking-wide text-slate-500">YOUR ANSWER</p>
        <div className="rounded-xl border-2 border-brand bg-white p-3">
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value.slice(0, MAX_LENGTH))}
            rows={5}
            placeholder={`Write your answer to ${patientName}.`}
            className="w-full resize-none bg-transparent outline-none"
            aria-label="Your answer"
          />
          <p className="text-right text-xs text-slate-400">
            {text.length} / {MAX_LENGTH}
          </p>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">
          {patientName} will read this on their link. You can&apos;t edit it after sending.
        </p>
        <button
          type="button"
          onClick={send}
          disabled={!trimmed || sending}
          className="rounded-xl bg-brand px-5 py-3 font-semibold text-white disabled:bg-brand-muted"
        >
          {sending ? "Sending…" : "Send answer"}
        </button>
      </div>
    </div>
  );
}
