# Sprint 2: the field week

Sprint 2 runs from Lab 7 to Lab 8. Real people use the product this week, and Lab 8 opens by reading what they did.

## Sprint 1 review

Our definition of done: merged to `main`, deployed at the public URL, tested on a phone by a teammate who did not build it, events in PostHog's Activity view.

| Story | Owner | Done by our definition? | If not: which clause is missing, and what happened |
|---|---|---|---|
| S1 Gela confirms the answer solved it (north star) | BS | Yes | Walked on a phone at the live URL by JP and LM on 24.11; tapped "This solved it" twice and reloaded, one `patient_confirms_remote_resolution` event |
| S2 Gela opens his link and finds his doctor | GP | Yes | Walked by JP and LM on 24.11; `patient_opens_doctor_list` in Activity |
| S3 Gela sends what changed | JP | Yes | Walked by LM on 24.11; `patient_sends_question` in Activity |
| S4 The doctor answers | GP | Yes | Walked by JP and LM on 24.11; `doctor_answers_question` in Activity |
| S5 Gela reads the answer | BS | Yes | Walked by JP and LM on 24.11; `patient_views_answer` fired once per answer |
| S6 Deploy and instrument | LM | Yes | Deployed on Vercel with the functions in Frankfurt; all five events seen in Activity from production; first reconcile written in the schema file |

**Slip rule:** did not fire. S4 was done before the Week 7 lab, so the doctor's full list of open questions stayed in Sprint 1.

## The gate

| Rung | Reached? | Evidence: a link or a number | If not: owner, and by when |
|---|---|---|---|
| 1 Production URL loads on a phone | Yes | Live product row in README; team phone runs on 24.11 | The Wi-Fi-off walk is still to do: GP, by 28.11 |
| 2 Journey completes there | Yes | Team runs on 24.11: two questions sent, answered and confirmed on the test patient | |
| 3 North star event in Activity, from production | Yes | `patient_confirms_remote_resolution` from the live URL, `posthog-js` in the browser, seen by LM | |
| 4 Counts reconcile | Yes | PostHog 2 = database 2 on 26.11, after removing 4 test rows created before PostHog was wired | Gate reconcile block in the schema file: LM, by 28.11 |
| 5 Dashboard, linked in README | No | | LM, by 28.11 |

## Real hours before Lab 8

| Initials | Hours free | When, specifically |
|---|---|---|
| JP | 6 | Friday 3PM to 9PM |
| LM | 5 | Friday 4PM to 9PM |
| GP | 7 | Friday 2PM to 9PM |
| BS | 7 | Friday 2PM to 9PM |
| *Total* | *25* | |

## Stories this week

### R1 · The Wi-Fi-off walk and the Live column · owner GP · reviewer BS · 1 h

GP did not build the north star step, so GP walks the whole journey at the production URL on a phone with Wi-Fi off. BS reads each row in PostHog Activity aloud: the name matches the schema, every property is there, it fired once, from production. Done when the Events table in `03-build/analytics/event-schema.md` has a `Live` column with `yes` beside each of the five journey events they both saw.

### R4 · Gate reconcile block and internal filter · owner LM · reviewer JP · 1 h

Done when the gate reconcile block from `Lab-7/templates/gate-reconcile-block.md` is filled at the bottom of `03-build/analytics/event-schema.md` (both counts, same window, the exact query), and PostHog's internal filter hides our test patient and localhost, so our own clicks stop counting.

### R5 · Dashboard, three tiles · owner LM · reviewer GP · 2 h

Trends on `patient_confirms_remote_resolution`; the journey steps as step counts (the patient and the doctor do different steps, so not a funnel); Retention on `patient_confirms_remote_resolution`. Internal filter on each. Done when the dashboard opens from a public link without a login and the link is in the README's Analytics dashboard row.

### F1 · Field-week links · owner JP · reviewer LM · 2 h

One doctor row for Doctor-1 and one patient row per field-week patient in Neon, each with its own private link to Doctor-1. Done when every person in the table below has received their own production link, never a preview link, and LM has opened each patient link once on a phone before it was sent.

### F2 · Mid-week look · owner GP · 1 h

Sum: 7 hours. The rest is held for whatever the first real users break.

## Field week: who uses it

Our journey needs a doctor who answers, and we do not know the patients' own doctors. This week the answering doctor is Doctor-1, the GP from log 04, who agreed to a follow-up. He is not their own doctor, and we tell them so.

| Code name and role | Log or session they come from | How the link reaches them | Sent by, and by when | Opened? (fill in during the week) |
|---|---|---|---|---|
| Doctor-1, GP at the public polyclinic (answers) | Log 04 | Phone call, then his private doctor link by message | LM, 27.11 before 21:00 | |
| Patient-2, heart patient, two-weekly ward checks | Log 02, test session 1 | WhatsApp message with his private link | JP, 27.11 before 21:00 | Yes; sent a question at 18:31 on 27.11 |
| Patient-3, two-weekly ward checks | Referral via log 02, test session 3 | Message through Jumber's sister, then his link | JP, 27.11 before 21:00 | Yes; sent a question at 18:29 on 27.11 |
| Patient-1, diabetic, monthly cardiologist | Log 03, test session 2 | In person, opening the link with him on his phone | GP, 28.11 | |
| Patient-5, heart patient, monthly cardiologist | Log 10, test session 4 | Message with his private link | LM, 28.11 | |

**What we tell them:** Patients: "This is the link we showed you, now working. If something changes between your visits this week, write it here; a GP helping our student project answers on the same link. He is not your own doctor and it is not for emergencies (call 112). We count whether questions get answered and whether that saved you a trip, never your name or what you wrote." Doctor-1: "This is your private link. When a question arrives, answer it there in one message. We count answers and how long they took, never names or text."

## Prediction

Written in the lab, before the week starts. Never edited afterwards; Lab 8 reads it as written.

**By Lab 8:** 1 `patient_confirms_remote_resolution` event from real people, not our team. Also: 2 `patient_sends_question` from real people.

**We are wrong if:** 0 `patient_sends_question` from real people, or a question waits more than 24 hours without an answer from Doctor-1.

**Mid-week look:** GP opens the dashboard on 27.11 from 18:00 to 20:00 (planned for 21:00 to 23:00, moved because GP realized this morning that he is not available then), right after the first field-week links went out, and writes one line here: what the counts are and one thing we change because of them, or nothing.

27.11, 18:46: 3 people have links (Doctor-1, Patient-2, Patient-3); Patient-2 and Patient-3 each sent a question (18:31, 18:29); 0 answered by Doctor-1 yet. Change: Luka reminded Doctor-1 that two questions are waiting on his link.

## The DECISIONS.md line

`Wk7 · Gate open at rung 5: dashboard not built yet; rungs 1 to 4 reached (PostHog 2 = database 2), owners and times in sprint-2.md · evidence: 03-build/sprints/sprint-2.md · owner: GP`
