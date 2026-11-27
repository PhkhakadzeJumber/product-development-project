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

## Gate reconcile (Lab 7)

**Production URL walked:** https://product-development-project.vercel.app/ · **walked by:** GP, who did not build the north star step · on a phone, mobile data: yes, 27.11.2026; BS checked the five journey events in Activity ([R1 evidence](https://github.com/PhkhakadzeJumber/product-development-project/commit/25abaa24d5068681befee75bdb474b5f3ea1761c)).

**Window:** `2026-11-24 00:00:00 UTC <= timestamp < 2026-11-28 00:00:00 UTC` (24–27 November UTC). Snapshot checked on 27.11 at 15:31 UTC; later activity can change the count. This comparison includes demo traffic to check instrumentation, not real-user outcomes.

| Source | Count | Window | Exactly how it was counted |
|---|---|---|---|
| PostHog | 3 | UTC window above | Project 366802 (UTC), Trends API query: total count of `patient_confirms_remote_resolution`, `$current_url` contains `https://product-development-project.vercel.app/`, `filterTestAccounts: false`. Daily counts: 2, 0, 0, 1. |
| Database | 3 | UTC window above | Read-only Neon query below; all three rows have `patient_id = 'pt-demo'` and `doctor_id = 'dr-demo'`. |

```sql
SELECT COUNT(*) AS confirmed_count
FROM questions
WHERE patient_confirmed_at >= TIMESTAMPTZ '2026-11-24 00:00:00+00'
  AND patient_confirmed_at < TIMESTAMPTZ '2026-11-28 00:00:00+00';
```

**Match:** yes — PostHog 3 = database 3. PostHog was checked at 15:31:54 UTC and Neon at 15:31:58 UTC. The Trends query used `math: total`, `date_from: 2026-11-24T00:00:00+00:00` and `date_to: 2026-11-27T23:59:59.999999+00:00` via `POST /api/projects/366802/query/`.

**Earlier discrepancy:** on 26.11 the team removed four test rows created before PostHog was wired, then recorded PostHog 2 = database 2 in Sprint 2. Before the cleanup the pair was PostHog 2, database 4: the two extra confirmed rows were demo confirmations created before PostHog was wired, so they had no events. No cleanup commit exists because the rows were removed in Neon only. No database rows or PostHog events were changed or deleted for this check.

**Silent failure we predicted in Lab 5:** double fire; the confirm screen re-renders after the tap and the capture call is on the render, not the tap. · **Did it happen?** No double fire was observed in the recorded double-tap/reload checks above; today's three events also match three confirmed rows.

**Internal filter set in PostHog:** saved and read back on 27.11 at 15:31:44 UTC. All conditions below are combined with **AND** when internal traffic is excluded:

- Event property `patient_id` **is not** `pt-demo` (`is_not`).
- Event property `doctor_id` **is not** `dr-demo` (`is_not`).
- Event property `$current_url` **does not contain** `localhost` (`not_icontains`, case-insensitive).
- Person **is not in** the existing **Internal / Test users** cohort (347791); this prior exclusion was preserved.

**Exclude internal/test users by default:** enabled (`test_account_filters_default_checked: true`). Existing saved insights that explicitly disable it still need it switched on; R5 must enable it on all three dashboard tiles. The app sends the sanitized `$current_url`, not `$host`, so the localhost condition uses the URL property.

**Our test records are:** patient `pt-demo`, doctor `dr-demo`. Verified with the same production Trends query: exclusions off = **3** confirmations; exclusions on = **0**. Neon also returns **0** with the query above plus `AND patient_id::text <> 'pt-demo' AND doctor_id::text <> 'dr-demo'`. The three demo confirmations do not count as field-week success.

**Field-event check:** after exclusion, PostHog still counts 16 `patient_opens_doctor_list` events and 2 `patient_sends_question` events in this window (unfiltered: 28 and 5). The filter does not discard doctor-list events merely because they lack `doctor_id`.

**Checked by:** LM, using PostHog's API and a read-only Neon query; reviewed by JP on 27.11. · **Events still not Live:** none in the five-step Sprint 1 journey. The six booking/scheduling events remain on the cut list: two owned by GP, two by LM and two by JP, as listed in the Events table; no delivery date is committed for those out-of-scope events.
