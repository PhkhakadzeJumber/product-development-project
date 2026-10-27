# Event Schema

Your metric is only as good as your instrumentation. Every row here becomes one `capture()` call in Week 7 and one dashboard tile. Names are copied from this file, never retyped.

**North star:** Confirmed self-service bookings per active patient per month.

**North star event:** `patient_confirms_repeat_booking`

**How the north star is computed from events:** count of `patient_confirms_repeat_booking`, filtered to confirms with `time_to_book_seconds` ≤ 120 (the prototype plan's two-minute success bar for booking without help), per patient with at least one confirm in the window, per calendar month.

*Scope this week is two events, on purpose. The first-booking confirm and the rest of the funnel stay out of the schema until we instrument them, so nothing here is a name without a `capture()` behind it. An empty step is honest; an invented event is a lie we would delete later.*

## Events

| Step | Event (actor_verb_object) | Fired by | Properties | Owner |
|---|---|---|---|---|
| Acquisition | `patient_opens_doctor_list` | patient | patient_id, source (demo_invite, clinic_referral, other) | GP |
| Retention (north star) ★ | `patient_confirms_repeat_booking` | patient | patient_id, doctor_id, slot_id, appointment_id, time_to_book_seconds, days_since_last_confirm | GP |

Referral and Revenue are empty on purpose. There is nothing to refer and nothing to pay for before Week 12.

## Rules we are following

- One name per event, one spelling, lowercase with underscores.
- `patient_id` on every event. It is an id our app made up. No names, phone numbers, allergies, or message text anywhere in analytics — the question feature records `thread_id` and character counts, never the text, and a sugar reading like 3.4 is clinical data, not analytics.
- The north star event is fired by the patient, because the patient receives the value and the prototype plan's riskiest assumption ("book independently, without help") is about the patient.
- `patient_views_doctor_slots`, first-booking confirm and the failure-path event stay in the plan, not the schema: when confirms are low we will add them to see whether demand or the booking flow is the problem.

## Reconcile plan

**Event most likely to fail silently:** `patient_confirms_repeat_booking`
**How it would fail:** double fire; the confirm screen re-renders after the tap and the capture call is on the render, not the tap.
**The check that would catch it:** count `appointments` rows with `booked_at` in the same week in our own database and compare to the event count. If the event count is about double, it is the render.
**Who runs the check in Week 7:** GP, in the lab, before the gate is confirmed.
