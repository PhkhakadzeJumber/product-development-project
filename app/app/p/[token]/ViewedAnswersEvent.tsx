"use client";

import posthog from "posthog-js";
import { useEffect, useRef } from "react";

type ViewedAnswer = {
  question_id: string;
  patient_id: string;
  doctor_id: string;
  minutes_since_answer: number;
};

// Prefetches never run this effect. The server returns only newly viewed answers.
export default function ViewedAnswersEvent({ token, questionIds }: { token: string; questionIds: string[] }) {
  const requested = useRef(new Set<string>());

  useEffect(() => {
    const ids = questionIds.filter((id) => !requested.current.has(id));
    if (!ids.length) return;
    for (const id of ids) requested.current.add(id);

    async function acknowledge() {
      const res = await fetch("/api/answers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, question_ids: ids }),
      });
      if (!res.ok) throw new Error("Could not acknowledge viewed answers");

      const { events }: { events: ViewedAnswer[] } = await res.json();
      for (const event of events) posthog.capture("patient_views_answer", event);
    }

    void acknowledge().catch(() => {
      for (const id of ids) requested.current.delete(id);
    });
  }, [token, questionIds]);

  return null;
}
