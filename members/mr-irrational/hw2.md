# Homework 2 · Giorgi Phurtseladze (@mr-irrational) · Team One

## 1. Ship report

| What I shipped | Story or rung | Commit link(s), from my account | Live at the production URL? | Walked or checked by |
|---|---|---|---|---|
| Patient home: Gela opens his link and finds his own doctor; fires `patient_opens_doctor_list` | S2 | [3a914df](https://github.com/PhkhakadzeJumber/product-development-project/commit/3a914df) | Yes, since 24.11 | JP and LM, phone walk on 24.11 |
| Doctor page and `/api/answers`: the doctor reads open questions and answers; fires `doctor_answers_question` | S4 | [3a914df](https://github.com/PhkhakadzeJumber/product-development-project/commit/3a914df) | Yes, since 24.11 | JP and LM, phone walk on 24.11 |
| Sprint 1 plan: done rule, five journey stories plus deploy, hours inside everyone's free time, slip rule | Sprint 1 | [f849f29](https://github.com/PhkhakadzeJumber/product-development-project/commit/f849f29), [affe0ed](https://github.com/PhkhakadzeJumber/product-development-project/commit/affe0ed) | n/a (plan) | Team; reviewed story by story in [sprint-2.md](../../03-build/sprints/sprint-2.md) |
| [Project board](https://github.com/users/mr-irrational/projects/1/views/1): one card per Sprint 1 story with owner, linked from the plan | Sprint 1 | [b905297](https://github.com/PhkhakadzeJumber/product-development-project/commit/b905297) | n/a (board) | Team |
| Wi-Fi-off walk of the whole journey on mobile data | R1, gate rung 1 | [25abaa2](https://github.com/PhkhakadzeJumber/product-development-project/commit/25abaa2) (committed by BS, who checked it) | Yes, walked on production on 27.11 | BS, each event in PostHog Activity; `Live` column in the [event schema](../../03-build/analytics/event-schema.md) |
| Gate line: open at rung 5 | Gate | [4a01f7d](https://github.com/PhkhakadzeJumber/product-development-project/commit/4a01f7d) | n/a | [DECISIONS.md](../../DECISIONS.md) |
| Mid-week look: counts read from the production database, one line written | F2 | [3e6b32b](https://github.com/PhkhakadzeJumber/product-development-project/commit/3e6b32b) | n/a | Neon, 27.11 at 18:46 |

**The piece I am least sure works for a real person, and how I will know by Lab 8:** the doctor page (S4). Only our team has answered on it; at the mid-week look Doctor-1 had 2 questions waiting and 0 answers. By Lab 8 I will look at Doctor-1's `doctor_answers_question` events and their `minutes_since_question`; our prediction is wrong if any question waits more than 24 hours.

**One thing I did that was not my assigned story:** before building S2 I fixed the Figma step 1 frame, which listed every doctor at the clinic while the [MVP boundary](../../03-build/mvp-boundary.md) says Gela sees his own. I changed it in my own copy and built from it ([3a914df](https://github.com/PhkhakadzeJumber/product-development-project/commit/3a914df)).

## 2. Pattern journal, Weeks 5 to 7

### Week 5 · One metric that matters

*Written in Week 7; I did not write it in its own week.* The metric I worked on was the event schema: I added `patient_selects_visit_type` and the visit-type properties so the funnel could show where a booking breaks before the north star, and when booking was cut in Week 6 those events stayed in the schema but out of Sprint 1, so `patient_confirms_remote_resolution` stayed the one number. Beyond my lane, I messaged and booked my two testers, Patient-1 (log 03) and Patient-5 (log 10), and logged both sessions; both booked alone. I also wrote the verdict on my own prediction and said the test did not measure it, because it counted bookings, not trips avoided. Hack: I booked both sessions on the same day, so both logs were written while the sessions were fresh.

### Week 6 · The smallest complete journey

*Written in Week 7; I did not write it in its own week.* I turned the five-step journey into the Sprint 1 plan: one story per step, the north star step first so it could be built on a seeded answer, and a slip rule that keeps the doctor's answer in no matter what, because without step 3 the journey is not complete. When the hours came in, Luka had 7 hours of stories with 5 free and I had 8 with 7, so S1 moved to Beka and S2 dropped to 2 hours: 21 hours inside 25, and inside each person's own. Hack: I wrote "story hours never exceed free hours" into the plan before anyone gave their hours, so cutting was a rule, not an argument.

### Week 7 · Ship to learn

I shipped S2 (Gela finds his own doctor) and S4 (the doctor answers) in one commit, live with the first deploy on 24.11, and on 27.11 walked the whole journey on production with Wi-Fi off while Beka checked every event in PostHog Activity. Beyond my lane, I wrote the gate line in DECISIONS.md, and at the mid-week look, with no dashboard built yet, I read the counts straight from the production database: two real questions from Patient-2 and Patient-3, zero answers. That number is what shipping taught us this week: patients ask within minutes of getting the link, and the slow step is the doctor, so Luka reminded Doctor-1 that two questions were waiting. Hack: before building I checked the real Neon tables with a read-only query instead of waiting for the schema to be written down, and ran both pages against the demo patient and doctor before pushing.

## 3. My DECISIONS.md lines

> Wk5 · Giorgi added `patient_selects_visit_type` (precursor: the patient picks the visit type before booking) and added visit_type and planned_minutes to `patient_confirms_repeat_booking`, matching the visit-type evidence · evidence: [event schema](03-build/analytics/event-schema.md), [prototype plan v2](02-design/prototype-plan-v2.md) · owner: GP

The evidence is the visit-type table in prototype plan v2; both events are rows in the event schema, now "no (booking is on the cut list)" in its `Live` column.

> Wk5 · Prototype test: keep going; 4 of 5 patient sessions run, 2 fails (session 1, Patient-2, stopped before pressing "Book this visit", the predicted first mistake, failure behavior 2; session 3, Patient-3, booked but could not tell it had succeeded, failure behavior 3) and 2 passes (sessions 2 and 4, Patient-1 and Patient-5, booked and pointed to the confirmation or the visit in "My visits" within 1:10), so the "3 or more of 5" rule is not triggered yet; Patient-4 decides it: a fail makes 3 of 5 and the booking flow is revised before testing again, a pass makes 2 of 5 and the flow stands · evidence: [usability findings](02-design/user-testing/usability-findings.md) (sessions 1 to 4), [test plan](02-design/user-testing/test-plan.md) · owner: GP

Sessions 2 and 4 are mine, logged in the usability findings ([f899c13](https://github.com/PhkhakadzeJumber/product-development-project/commit/f899c13)).

> Wk5 · Giorgi's prediction "a 2-minute question turns into a trip", verdict after the Week 5 test: still confirmed for chronic between-visit changes, now with two more logs; the prototype test did not test it (it measures whether a patient can book alone), but log 09 (a dizzy patient's dose question answered in under 2 minutes after 3 unanswered calls, a minibus trip and just under 2 hours in the corridor) and log 10 (a dose question answered in under a minute after an unanswered Viber message, 2 registry calls, a taxi trip and 1.5 hours in the corridor) repeat what 02 and 03 showed; boundary unchanged: booking-only pain (05) and ward understaffing (06) are separate · evidence: [log 09](01-discovery/interview-logs/09-receptionist-polyclinic-followup.md), [log 10](01-discovery/interview-logs/10-cardiac-patient-polyclinic.md), [usability findings](02-design/user-testing/usability-findings.md), Wk3 prediction line above · owner: GP

The evidence is logs 09 and 10, which repeat the trip pattern from 02 and 03 ([d9f53d6](https://github.com/PhkhakadzeJumber/product-development-project/commit/d9f53d6)).

> Wk7 · Gate open at rung 5: dashboard not built yet; rungs 1 to 4 reached (PostHog 2 = database 2), owners and times in sprint-2.md · evidence: 03-build/sprints/sprint-2.md · owner: GP

The evidence is the gate table in sprint-2.md: rungs 1 to 4 with their links and the reconcile count, rung 5 owned by LM by 28.11.

## 4. My person this week

**The field-week person I am responsible for:** Patient-1 (Zura), diabetic, sees the same cardiologist every month (log 03, test session 2) · **how and when the link reaches them:** in person on 28.11; I open his own private link on the production URL with him on his phone, and tell him a GP helping our project answers there, not his own doctor.
