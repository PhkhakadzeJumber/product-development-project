"use client";

import posthog from "posthog-js";
import { useEffect, useRef } from "react";

// S2 · fires patient_opens_doctor_list once per page load (the ref stops React's dev double-run).
export default function OpensDoctorListEvent({ patientId, source }: { patientId: string; source: string }) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    posthog.capture("patient_opens_doctor_list", { patient_id: patientId, source });
  }, [patientId, source]);

  return null;
}
