import posthog from "posthog-js";

// Sprint 1 properties from 03-build/analytics/event-schema.md.
const eventProperties: Record<string, readonly string[]> = {
  $pageview: [],
  patient_opens_doctor_list: ["patient_id", "source"],
  patient_sends_question: ["patient_id", "doctor_id", "question_id", "char_count"],
  doctor_answers_question: ["doctor_id", "patient_id", "question_id", "minutes_since_question"],
  patient_views_answer: ["patient_id", "doctor_id", "question_id", "minutes_since_answer"],
  patient_confirms_remote_resolution: [
    "patient_id",
    "doctor_id",
    "resolution_type",
    "days_since_request",
    "is_first_resolution_for_patient",
  ],
};

const sdkProperties = [
  "distinct_id", "$device_id", "$session_id", "$window_id", "$lib", "$lib_version",
  "$process_person_profile", "$geoip_disable", "token",
];

function analyticsPath(pathname: string) {
  if (pathname === "/") return "/";
  if (/^\/p\/[^/]+\/ask\/?$/.test(pathname)) return "/p/[token]/ask";
  if (/^\/p\/[^/]+\/questions\/[^/]+\/?$/.test(pathname)) return "/p/[token]/questions/[questionId]";
  if (/^\/p\/[^/]+\/?$/.test(pathname)) return "/p/[token]";
  if (/^\/d\/[^/]+\/?$/.test(pathname)) return "/d/[token]";
  return "/other";
}

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || "/ingest";
// The SDK forwards these to fetch, but its config type only declares cache options.
const transportOptions = { cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer" } satisfies RequestInit;
if (key && key !== "phc_...") {
  posthog.init(key, {
    api_host: host,
    ui_host: "https://eu.posthog.com",
    defaults: "2026-08-30",
    capture_pageview: "history_change",
    fetch_options: transportOptions,
    capture_pageleave: false,
    autocapture: false,
    disable_session_recording: true,
    advanced_disable_flags: true,
    disable_external_dependency_loading: true,
    persistence: "localStorage",
    person_profiles: "never",
    before_send({ uuid, event, timestamp, properties }) {
      if (!Object.hasOwn(eventProperties, event)) return null;
      const allowed = new Set([...sdkProperties, ...eventProperties[event]]);
      const filtered = Object.fromEntries(
        Object.entries(properties).filter(([name]) => allowed.has(name)),
      );
      // Some queries return native numeric IDs and others explicitly cast to text.
      for (const name of ["patient_id", "doctor_id", "question_id"]) {
        if (typeof filtered[name] === "number") filtered[name] = String(filtered[name]);
      }
      // Send route templates, not private links, query parameters, or referrers.
      const pathname = analyticsPath(window.location.pathname);
      return {
        uuid,
        event,
        timestamp,
        properties: {
          ...filtered,
          $pathname: pathname,
          $current_url: `${window.location.origin}${pathname}`,
        },
      };
    },
  });
}
