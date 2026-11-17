# Sprint 1

Sprint 1 runs from the Week 6 lab to the Week 7 lab and ends at the gate: deployed at a public URL, north star event firing in PostHog. Everything here is sized to the hours we actually have.

## Definition of done

A story is done when it is merged to `main`, deployed at the public URL, tested on a phone by a teammate who did not build it, and its events show in PostHog's Activity view.

## Real hours before the Week 7 lab

| Initials | Hours free | When, specifically |
|---|---|---|
| JP | 6 | Thursday 8PM to 10PM, Friday 7PM to 9PM, Saturday 3PM to 5PM |
| LM | 5 | Saturday and Sunday evenings, 2.5 hours each, hard stop |
| GP | 7 | Friday 8PM to 10PM, Saturday 7PM to 10PM, Sunday 8PM to 10PM |
| BS | 7 | Friday 7PM to 10PM, Saturday 8PM to 11PM, Sunday 8PM to 9PM |
| *Total* | *25* | |

Story hours below total 21 h, inside the 25 h we have, and each owner's stories fit inside their own hours (BS 7 of 7, GP 7 of 7, JP 4 of 6, LM 3 of 5). Reviewers are people free on Saturday or Sunday evening, after the first deploy.

## The board

GitHub Projects on the team repo: https://github.com/users/mr-irrational/projects/1/views/1. Four columns: next, doing, review, done. One card per story below. Merge to `main` every day anyone works.

## Stories

S1 is the north star step and comes first: it can be built on a seeded (test) answered question, then S2 to S5 fill in the real path to it.

### S1 · Gela confirms the answer solved it (north star step) · owner BS · reviewer LM · 4 h

*As* Gela, *I* tap "This solved it, no trip needed" *so that* a change between visits is settled without travelling in and waiting in the corridor.

*Acceptance criteria:*
- Given my link `/p/[token]` with one answered question, when I tap "This solved it, no trip needed", then the question shows Resolved and the button is gone
- And the `questions` row has `patient_confirmed_at` set; a second tap or a reload does not change it
- And `patient_confirms_remote_resolution` fires once, from the tap after the server returns OK, with `patient_id`, `doctor_id`, `resolution_type` `answer`, `days_since_request`, `is_first_resolution_for_patient`

*Smallest demo that proves it:* on a seeded answered question, tap twice and reload; show one `patient_confirmed_at` and one event.

### S2 · Gela opens his link and finds his doctor · owner GP · reviewer BS · 2 h

*As* Gela, *I* open the link my clinic gave me and see my own doctor *so that* I know where to send my question without calling reception.

*Acceptance criteria:*
- Given the link `/p/[token]?src=clinic_referral` on a phone browser, when it loads, then I see my first name, my doctor's name and specialty, and a button to ask a question, with no login
- And a wrong or missing token shows "This link is not valid", with no patient data
- And `patient_opens_doctor_list` fires once per load, with `patient_id` and `source`

*Smallest demo that proves it:* open the link on a phone, then a wrong token, show the event.

### S3 · Gela sends what changed · owner JP · reviewer LM · 4 h

*As* Gela, *I* write what changed and send it to my doctor *so that* she gets my question without six calls to reception.

*Acceptance criteria:*
- Given my link page, when I type "New tablet since Tuesday, dizzy, heart rate low" and tap Send, then I see "Sent to your doctor" with my question and the time
- And a `questions` row exists with `patient_id`, `doctor_id`, `body` and `created_at`; an empty question cannot be sent
- And `patient_sends_question` fires after the server returns OK, with `patient_id`, `doctor_id`, `question_id`, `char_count`, never the text

*Smallest demo that proves it:* send a question on a phone, show the row, show the event without the text.

### S4 · The doctor answers · owner GP · reviewer BS · 5 h

*As* Gela's doctor, *I* see the questions sent to me and answer one *so that* the patient does not have to come in for a two-minute answer.

*Acceptance criteria:*
- Given my link `/d/[token]` with one open question, when I type an answer and tap Send answer, then the question moves to Answered with my answer under it
- And the `questions` row has `answer` and `answered_at`; another doctor's token does not show this question
- And `doctor_answers_question` fires after the server returns OK, with `doctor_id`, `patient_id`, `question_id`, `minutes_since_question`

*Smallest demo that proves it:* answer on the doctor link, show the row, show the event.

### S5 · Gela reads the answer · owner BS · reviewer GP · 3 h

*As* Gela, *I* open my link and read my doctor's answer *so that* I know what to do without calling or travelling.

*Acceptance criteria:*
- Given my link after the doctor answered, when it loads, then I see the doctor's answer and the "This solved it, no trip needed" button
- And the first time the answer is shown, the row gets `patient_viewed_at`; later loads do not change it
- And `patient_views_answer` fires once, the first time, with `patient_id`, `doctor_id`, `question_id`, `minutes_since_answer`

*Smallest demo that proves it:* open the link twice after an answer; show one `patient_viewed_at` and one event.

### S6 · Deploy and instrument · owner LM · reviewer GP · 3 h

First, on LM's first free slot, Saturday evening, with Lab-6/setup/SHIP-STACK-SETUP.md. From Thursday to Saturday afternoon the other stories are built and merged to main; the first deploy puts them all live, and every story after it deploys the day it merges. Public URL in the README's Live product row, every journey event visible in PostHog's Activity view, the reconcile check from 03-build/analytics/event-schema.md written. The Week 7 lab adds the dashboard.

## Slip rule

Written now, obeyed later. If S4 is not done by the evening before the Week 7 lab, the doctor's list of all open questions moves to Sprint 2 and the doctor answers through a link that shows only the newest open question. The answer box, `answered_at` and `doctor_answers_question` stay in S4 no matter what, because without an answer the value does not land.

## The DECISIONS.md lines

The boundary line is in `03-build/mvp-boundary.md` and `DECISIONS.md`. We had a prototype and four test sessions before this lab (Track A), so no prototype-track line is needed.
