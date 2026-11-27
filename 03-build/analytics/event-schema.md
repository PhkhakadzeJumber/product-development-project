# Event Schema

Your metric is only as good as your instrumentation. Every row here becomes one `capture()` call in Week 7 and one dashboard tile. Names are copied from this file, never retyped.

**North star:** Patient-confirmed remote resolutions of routine needs per active patient per month.

**North star event:** `patient_confirms_remote_resolution`

**How the north star is computed from events:** count of `patient_confirms_remote_resolution`, per patient with at least one `patient_opens_doctor_list` in the window, per calendar month.

## Events

| Step | Event (actor_verb_object) | Fired by | Properties | Owner | Live |
|---|---|---|---|---|---|
| Acquisition | patient_opens_doctor_list | patient | patient_id, source (demo_invite, clinic_referral, other) | GP | yes |
| Activation (precursor) | patient_selects_visit_type | patient | patient_id, doctor_id, visit_type (renewal, check_up, new_or_changed), planned_minutes, has_description | GP | no (booking is on the cut list) |
| Retention | patient_confirms_repeat_booking | patient | patient_id, doctor_id, slot_id, appointment_id, visit_type (renewal, check_up, new_or_changed), planned_minutes, time_to_book_seconds, days_since_last_confirm | GP | no (booking is on the cut list) |
| Activation | doctor_marks_visit_seen | doctor | doctor_id, patient_id, appointment_id, slot_id, visit_type (renewal, check_up, new_or_changed), planned_minutes, actual_minutes | LM | no (booking is on the cut list) |
| Activation | doctor_marks_visit_no_show | doctor | doctor_id, patient_id, appointment_id, slot_id | LM | no (booking is on the cut list) |
| Activation (north star) ★ | patient_confirms_remote_resolution | patient | patient_id, doctor_id, resolution_type (renewal, answer), days_since_request, is_first_resolution_for_patient | LM | yes |
| Activation | receptionist_books_appointment | receptionist | receptionist_id, patient_id, doctor_id, slot_id, appointment_id, visit_type (renewal, check_up, new_or_changed), planned_minutes, routing_basis (patient_preference, specialty_match, closest_available, receptionist_recommendation), time_to_book_seconds, is_new_patient | JP | no (booking is on the cut list) |
| Activation | receptionist_adds_ad_hoc_block | receptionist | receptionist_id, doctor_id, slot_id, visit_type (renewal, check_up, new_or_changed), duration_minutes, doctor_agreed | JP | no (booking is on the cut list) |
| Activation (precursor) | patient_sends_question | patient | patient_id, doctor_id, question_id, char_count (never the text) | JP | yes |
| Activation (precursor) | doctor_answers_question | doctor | doctor_id, patient_id, question_id, minutes_since_question | JP | yes |
| Activation (precursor) | patient_views_answer | patient | patient_id, doctor_id, question_id, minutes_since_answer | JP | yes |

Referral and Revenue are empty on purpose. There is nothing to refer and nothing to pay for before Week 12.

## Why this north star beats the other candidates

- **Confirmed bookings** is only the step before the value: the patient still travels and waits, so the half-day cost stays (logs 01, 02, 03, 05). A remote resolution removes the trip.
- **Visits marked Seen by the doctor** is fired by the doctor, not the patient the problem statement is about.

## Rules we are following

- One name per event, one spelling, lowercase with underscores.
- `patient_id` on every patient-facing event. Staff-only schedule events carry `receptionist_id`, `doctor_id` and `slot_id` instead. It is an id our app made up. No names, phone numbers, allergies, or message text anywhere in analytics — the question feature records `thread_id` and character counts, never the text, and a sugar reading like 3.4 is clinical data, not analytics.
- The patient's brief description of the visit reason never goes into analytics; events carry only `has_description` (true/false) and `visit_type`.
- The north star event is fired by the patient, because the patient receives the value and the prototype plan's riskiest assumption ("book independently, without help") is about the patient.
- `patient_views_doctor_slots`, first-booking confirm and the failure-path event stay in the plan, not the schema: when confirms are low we will add them to see whether demand or the booking flow is the problem.

## Reconcile plan

**Event most likely to fail silently:** `patient_confirms_remote_resolution`
**How it would fail:** double fire; the confirm screen re-renders after the tap and the capture call is on the render, not the tap.
**The check that would catch it:** count the question rows with `patient_confirmed_at` set in our own database for the same week and compare to the event count. If the event count is about double, it is the render.
**Who runs the check in Week 7:** LM, in the lab, before the gate is confirmed.

*`patient_confirmed_at` is written on the question row when the patient taps "This solved it, no trip needed" (step 5 of `03-build/mvp-boundary.md`), so the field ships in Sprint 1 with the north star step and the check can run in the Week 7 lab. Renewals are on the cut list; when they come back, their row gets the same field.*

*First reconcile, 2026-11-24:* After reloading on the live URL, PostHog Activity still showed 1 `patient_confirms_remote_resolution` event, matching 1 Neon question row with `patient_confirmed_at` set. Reloading did not fire a second confirmation event.

*Teammate follow-up:* A teammate completed a separate run on a phone using the live URL, tapped “This solved it” twice, and reloaded. PostHog Activity showed all five journey events and exactly 1 `patient_confirms_remote_resolution` event for that run. The two confirmation events visible in Activity came from two separate runs.
