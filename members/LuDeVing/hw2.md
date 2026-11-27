# Homework 2 · Luka Mikautadze (@LuDeVing) · Team One

## 1. Ship report

Production: [MediBook](https://product-development-project.vercel.app/). My Sprint 1 story was S6, deploy and instrument.

| What I shipped | Story or rung | Commit link(s), from my account | Live at the production URL? | Walked or checked by |
|---|---|---|---|---|
| Architecture: Next.js, Vercel, Neon, PostHog; five-step journey | Lab 6 / S6 | [e3b4686](https://github.com/PhkhakadzeJumber/product-development-project/commit/e3b4686), [53681de](https://github.com/PhkhakadzeJumber/product-development-project/commit/53681de) | n/a (plan) | No separate review recorded |
| Five journey events, ingestion and tracking fixes | S6; rung 3 | [be7c1fa](https://github.com/PhkhakadzeJumber/product-development-project/commit/be7c1fa), [0e9e832](https://github.com/PhkhakadzeJumber/product-development-project/commit/0e9e832) | Yes | GP walked; BS checked Activity, 27.11 |
| Deployment/PostHog notes and production URL | S6 | [047a199](https://github.com/PhkhakadzeJumber/product-development-project/commit/047a199) | App yes; notes in repo | Team's production phone walks |
| First reconcile and double-tap/reload phone-test record | S6 / S1 review | [e247065](https://github.com/PhkhakadzeJumber/product-development-project/commit/e247065) | Yes | LM; separate teammate phone run |
| Gate reconcile, 3 = 3; demo/localhost exclusions | R4 | [7dd6587](https://github.com/PhkhakadzeJumber/product-development-project/commit/7dd6587) | Yes, production events | Reviewed by JP, 27.11 |
| Public three-tile dashboard and gate-passed record | R5 | [bf32388](https://github.com/PhkhakadzeJumber/product-development-project/commit/bf32388) | Yes, [public dashboard](https://eu.posthog.com/shared/wVkOOfkt-AVqHEnKUs6w1O7gshNQpg) | LM, signed-out Chrome; GP review pending |

**The piece I am least sure works for a real person, and how I will know by Lab 8:** whether Doctor-1 uses the answer page without reminders. At the [mid-week look](../../03-build/sprints/sprint-2.md#prediction), two real questions had no answers. I will check `doctor_answers_question`, `minutes_since_question` and unanswered question rows; a wait over 24 hours misses our prediction.

**One thing I did that was not my assigned story:** I fixed S5 marking an answer viewed during prefetch, before the patient saw it ([0e9e832](https://github.com/PhkhakadzeJumber/product-development-project/commit/0e9e832)). That could consume the first-view event; Beka still owns the original screen.

## 2. Pattern journal, Weeks 5 to 7

### Week 5 · One metric that matters

I did not write this entry in its own week; I am writing it on 27.11. I made remote resolution the schema's one north star and added my doctor events: a booking still leaves a trip ([a73232d](https://github.com/PhkhakadzeJumber/product-development-project/commit/a73232d)). I added planned and actual visit lengths to check the timing assumption ([83a37e2](https://github.com/PhkhakadzeJumber/product-development-project/commit/83a37e2)). Outside coding, I asked interview 10 with Giorgi logging and updated the synthesis ([d15053f](https://github.com/PhkhakadzeJumber/product-development-project/commit/d15053f), [c70d6c7](https://github.com/PhkhakadzeJumber/product-development-project/commit/c70d6c7)). My shortcut was checking the message and calls on the participant's phone, not only their memory.

### Week 6 · The smallest complete journey

I did not write this entry in its own week; I am writing it on 27.11. I designed the stack for the question journey, with private links and no separate backend ([e3b4686](https://github.com/PhkhakadzeJumber/product-development-project/commit/e3b4686)). I wired five events, fixed `/ingest` and Georgian times, and documented deployment ([be7c1fa](https://github.com/PhkhakadzeJumber/product-development-project/commit/be7c1fa), [0e9e832](https://github.com/PhkhakadzeJumber/product-development-project/commit/0e9e832), [047a199](https://github.com/PhkhakadzeJumber/product-development-project/commit/047a199)). Beyond deployment, I fixed S5's premature answer-view tracking. My shortcut was a live walk and manual one-event/one-row reconcile before the dashboard, plus a separate double-tap/reload phone run ([e247065](https://github.com/PhkhakadzeJumber/product-development-project/commit/e247065)).

### Week 7 · Ship to learn

I reconciled 3 = 3 and excluded demo/localhost traffic; those confirmations were tests, not real successes ([7dd6587](https://github.com/PhkhakadzeJumber/product-development-project/commit/7dd6587)). I published the north star trend, journey counts and weekly retention dashboard, then recorded the gate as passed ([bf32388](https://github.com/PhkhakadzeJumber/product-development-project/commit/bf32388)). Beyond analytics, I reminded Doctor-1 about two unanswered questions: the [mid-week look](../../03-build/sprints/sprint-2.md#prediction) showed the doctor was the slow step. My shortcut was checking the public dashboard in signed-out Chrome instead of assuming its sharing setting worked.

## 3. My DECISIONS.md lines

Copied exactly; paths inside the quotations are relative to the repo root.

```text
Wk5 · Luka added three events to the event schema: `doctor_marks_visit_seen` and `doctor_marks_visit_no_show`, the doctor actions in the prototype plan v2 doctor walkthrough, and `patient_confirms_remote_resolution` as the north star; added a short section on why the north star beats confirmed bookings and doctor-marked visits, and removed the "scope this week is two events" note, which no longer held · evidence: [event schema](03-build/analytics/event-schema.md), [prototype plan v2](02-design/prototype-plan-v2.md) · owner: LM
```

The [schema](../../03-build/analytics/event-schema.md) records the three events and why a patient-confirmed resolution matters more than a booking.

```text
Wk5 · Luka added visit_type, planned_minutes and actual_minutes to `doctor_marks_visit_seen`, so each finished visit records its planned and real length and the ±5-minute target for the visit-type table in prototype plan v2 can be checked; actual_minutes runs from the later of the booked start and the previous patient's Seen tap to this Seen tap, so a late doctor does not make every visit look too long. `doctor_marks_visit_no_show` is unchanged: a no-show has no visit length to measure · evidence: [event schema](03-build/analytics/event-schema.md), [prototype plan v2](02-design/prototype-plan-v2.md) · owner: LM
```

The properties are in the [schema](../../03-build/analytics/event-schema.md); the timing rule is in [prototype plan v2](../../02-design/prototype-plan-v2.md), not shipped booking code.

```text
Wk5 · Log 10, Dato, heart patient seen monthly by one cardiologist at a public polyclinic (09.11, in person, asker Luka, logger Giorgi), folded into the synthesis: it is the fourth patient behind Pattern 2 and the problem statement, and the first with a direct line to the doctor, which still failed (Viber message to the doctor's personal number marked "Seen" and never answered, 2 registry calls, then a trip: 1.5 hours in the corridor for an answer of under a minute, 16 GEL in taxis, about 3.5 hours of work; message and calls shown on his phone); so Pattern 2's root cause now names the doctor's lack of any gap during the shift alongside the reception line, the "doctors do not give out a direct number" line (03, 04, 07) gets its exception, Pattern 5 gets a third log (a question carried in his wallet for three weeks), and the problem statement gets a second open question, whether a direct line helps at all; caveat: the doctor's reason ("forgot to type back") is second-hand; it does not meet our "we are wrong if" · evidence: [log 10](01-discovery/interview-logs/10-cardiac-patient-polyclinic.md), [affinity map](01-discovery/synthesis/affinity-map.md), [patterns analysis](01-discovery/synthesis/patterns-analysis.md), [problem statement](01-discovery/problem-statement.md) · owner: Luka
```

[Log 10](../../01-discovery/interview-logs/10-cardiac-patient-polyclinic.md) contains the phone check and raw notes; the explanation attributed to the doctor is second-hand.

```text
Wk7 · Gate passed on 27.11.2026: all five rungs reached; GP's mobile-data walk and five Live events, PostHog 3 = database 3, and a [public dashboard](https://eu.posthog.com/shared/wVkOOfkt-AVqHEnKUs6w1O7gshNQpg) with north star trend, journey step counts and weekly retention, internal traffic excluded on each; dashboard linked in README and checked in signed-out Chrome. Supersedes the [gate-open line](https://github.com/PhkhakadzeJumber/product-development-project/blob/7dd6587/DECISIONS.md?plain=1#L93). The three confirmations are demo runs, not field-week success; Teams link submission is still pending · evidence: [event schema](03-build/analytics/event-schema.md#gate-reconcile-lab-7), [Sprint 2](03-build/sprints/sprint-2.md#r5--dashboard-three-tiles--owner-lm--reviewer-gp--2-h), [README](README.md) · owner: LM
```

The [reconcile block](../../03-build/analytics/event-schema.md#gate-reconcile-lab-7) records both counts and filters; [Sprint 2](../../03-build/sprints/sprint-2.md#r5--dashboard-three-tiles--owner-lm--reviewer-gp--2-h) records the public-dashboard check.

## 4. My person this week

From [Sprint 2](../../03-build/sprints/sprint-2.md#field-week-who-uses-it):

- **Doctor-1, GP from log 04:** phone call, then the private doctor link by message on 27.11; delivery is recorded, and I reminded them about the waiting questions.
- **Patient-5, monthly cardiology patient from log 10:** I will send their private production link by message on 28.11, after checking it on a phone, and record when they open it; this is planned, not yet recorded as sent.
