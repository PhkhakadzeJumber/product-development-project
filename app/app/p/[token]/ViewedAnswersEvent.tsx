"use client";

import { useEffect, useRef } from "react";

export type ViewedAnswer = {
  question_id: string;
  patient_id: string;
  doctor_id: string;
  minutes_since_answer: number;
};

// S5 · fires patient_views_answer once for each answer the server marked as newly viewed.
// The ref stops React's dev double-run from firing the same event twice.
export default function ViewedAnswersEvent({ events }: { events: ViewedAnswer[] }) {
  const fired = useRef<Set<string>>(new Set());

  useEffect(() => {
    for (const event of events) {
      if (fired.current.has(event.question_id)) continue;
      fired.current.add(event.question_id);
      // TODO (S6, when PostHog is wired): fire the event here, once, when patient_viewed_at was empty.
      // posthog.capture("patient_views_answer", {
      //   patient_id: event.patient_id,
      //   doctor_id: event.doctor_id,
      //   question_id: event.question_id,
      //   minutes_since_answer: event.minutes_since_answer,
      // });
    }
  }, [events]);

  return null;
}
