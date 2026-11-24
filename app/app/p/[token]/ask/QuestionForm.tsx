"use client";

import Link from "next/link";
import posthog from "posthog-js";
import { useState } from "react";

const MAX_LENGTH = 500;
const HINTS = ["Since when", "Medicine name", "Readings or numbers", "What changed"];

type Sent = { body: string; createdAt: string };

export default function QuestionForm({ token, doctorName }: { token: string; doctorName: string }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState<Sent | null>(null);

  const trimmed = text.trim();

  function addHint(hint: string) {
    setText((current) => {
      const prefix = current && !current.endsWith("\n") ? `${current}\n` : current;
      return `${prefix}${hint}: `.slice(0, MAX_LENGTH);
    });
  }

  async function send() {
    if (!trimmed || sending) return;
    setSending(true);
    setError("");

    const res = await fetch("/api/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, body: trimmed }),
    }).catch(() => null);

    if (!res || !res.ok) {
      setSending(false);
      setError("Could not send your question. Check your connection and try again.");
      return;
    }

    const data = await res.json();
    posthog.capture("patient_sends_question", {
      patient_id: data.patient_id,
      doctor_id: data.doctor_id,
      question_id: data.question_id,
      char_count: data.char_count,
    });
    setSent({ body: trimmed, createdAt: data.created_at });
    setSending(false);
  }

  if (sent) {
    const time = new Date(sent.createdAt).toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl border border-brand-soft bg-brand-tint p-4">
          <p className="font-semibold text-brand-dark">✓ Sent to {doctorName}</p>
          <p className="mt-1 text-sm text-brand-dark/80">
            Your doctor answers here, and you read it on this link.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="whitespace-pre-wrap text-slate-800">{sent.body}</p>
          <p className="mt-3 text-xs text-slate-500">Sent {time}</p>
        </div>
        <Link
          href={`/p/${token}`}
          className="rounded-xl border border-slate-200 bg-white py-3 text-center font-semibold text-brand-dark"
        >
          Back to my doctor
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold leading-tight">What changed since your last visit?</h1>
        <p className="mt-2 text-sm text-slate-500">
          Write it in your own words. Your doctor answers here, and you read it on this link.
        </p>
      </div>

      <div className="rounded-2xl border-2 border-brand bg-white p-3">
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value.slice(0, MAX_LENGTH))}
          rows={6}
          placeholder="For example: new tablet since Tuesday, I feel dizzy and my heart rate is low."
          className="w-full resize-none bg-transparent text-base outline-none"
          aria-label="Your question"
        />
        <p className="text-right text-xs text-slate-400">
          {text.length} / {MAX_LENGTH}
        </p>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500">YOU COULD MENTION</p>
        <div className="flex flex-wrap gap-2">
          {HINTS.map((hint) => (
            <button
              key={hint}
              type="button"
              onClick={() => addHint(hint)}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium"
            >
              + {hint}
            </button>
          ))}
        </div>
      </div>

      <p className="rounded-xl border border-slate-200 bg-slate-100 p-3 text-sm text-slate-500">
        ⓘ Not for emergencies. If you feel very unwell, call 112.
      </p>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="button"
        onClick={send}
        disabled={!trimmed || sending}
        className="rounded-xl bg-brand py-3.5 font-semibold text-white disabled:bg-brand-muted"
      >
        {sending ? "Sending…" : `Send to ${doctorName}`}
      </button>
    </div>
  );
}
