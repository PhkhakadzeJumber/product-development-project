# Homework 2 · Beka Shekiladze (@beka-169) · Team One

## 1. Ship report

| What I shipped | Story | Commit | Live? | Checked by |
|---|---|---|---|---|
| S1 "This solved it" + /api/confirm + the north star event | S1 | [135937f5ed56b28f4f08129e75ac66cf246284ab](https://github.com/PhkhakadzeJumber/product-development-project/commit/135937f5ed56b28f4f08129e75ac66cf246284ab) | Yes | JP and LM, phone walk 24.11 |
| S5 My questions + patient_viewed_at + patient_views_answer | S5 | [135937f5ed56b28f4f08129e75ac66cf246284ab](https://github.com/PhkhakadzeJumber/product-development-project/commit/135937f5ed56b28f4f08129e75ac66cf246284ab) | Yes | JP and LM, phone walk 24.11 |
| Fixes: real dates, brand colours, neutral wording | S5/S1 | [472fda9118a50878c0f26ad5ca2bde19adf354f0](https://github.com/PhkhakadzeJumber/product-development-project/commit/472fda9118a50878c0f26ad5ca2bde19adf354f0) | Yes | Team |
| PostHog check of the walk + Live column | R1 | [25abaa24d5068681befee75bdb474b5f3ea1761c](https://github.com/PhkhakadzeJumber/product-development-project/commit/25abaa24d5068681befee75bdb474b5f3ea1761c) | Yes | GP walked, I checked |

**The piece I am least sure works for a real person:** the "This solved it" button. Real patients have asked questions but none has been answered yet, so by Lab 8 I will check whether any real `patient_confirms_remote_resolution` arrives.

**One thing that wasn't my story:** Giorgi did the Wi-Fi-off walk itself in R1; my part was reading the events in PostHog Activity and writing the Live column.

## 2. Pattern journal, Weeks 5 to 7

### Week 5 · One metric that matters

I did not write this entry in its own week; I am writing it on 27.11. The one metric that mattered that week was not a page view but whether a patient could finish the booking alone, so I ran test session 1 with Patient-2 against the frozen rule and the predicted first mistake. He picked the 11:00 slot and stopped before pressing "Book this visit" (failure behavior 2), exactly the mistake the plan predicted, and I logged it in usability-findings.md. Beyond my build lane I also added Receptionist-1 to the test plan (3bcc278), because the reception fallback was part of prototype plan v2 even though the patient test had to stay frozen. Hack: I wrote the verdict against the rule we had frozen before the session, so my own expectation of a fail could not turn into the evidence.

### Week 6 · The smallest complete journey

I did not write this entry in its own week; I am writing it on 27.11. The smallest complete journey in the MVP boundary was the five-step question path, and my pieces were S1, the north star step, and S5, Gela reading the answer. In 135937f I built the "This solved it" button with /api/confirm, guarded so a second tap or reload cannot confirm twice, and captured `patient_confirms_remote_resolution` in the tap handler after the server returns OK, never on render. For S5 I built My questions and the full answer page, with `patient_viewed_at` stamped once by a conditional SQL update and `patient_views_answer` fired only for that first view. Hack: I used a seeded answered question to prove S1 before S2 to S5 existed, so the north star step could be tested on its own.

### Week 7 · Ship to learn

Ship to learn was the week I stopped treating my own code as the evidence: I fixed the S5/S1 dates, brand colours and wording in 472fda9, then checked the shipped journey on production. During Giorgi's Wi-Fi-off walk I read every event in PostHog Activity with him — name against the schema, every property present, fired once, from production — and wrote the Live column in 25abaa2. That put yes beside the five journey events and "no (booking is on the cut list)" beside the booking rows, which is a clearer statement of what we learned than a green build. Beyond my own stories this meant reading events JP, LM and Giorgi produced, not just the two screens I built. Hack: I used the schema table itself as the checklist so the next person can see shipped versus cut at a glance.

## 3. My DECISIONS.md lines

I own no DECISIONS.md line since Week 5; my owner lines stop at Week 4.

> Wk5 · Prototype test: keep going; 4 of 5 patient sessions run, 2 fails (session 1, Patient-2, stopped before pressing "Book this visit", the predicted first mistake, failure behavior 2; session 3, Patient-3, booked but could not tell it had succeeded, failure behavior 3) and 2 passes (sessions 2 and 4, Patient-1 and Patient-5, booked and pointed to the confirmation or the visit in "My visits" within 1:10), so the "3 or more of 5" rule is not triggered yet; Patient-4 decides it: a fail makes 3 of 5 and the booking flow is revised before testing again, a pass makes 2 of 5 and the flow stands · evidence: [usability findings](02-design/user-testing/usability-findings.md) (sessions 1 to 4), [test plan](02-design/user-testing/test-plan.md) · owner: GP

I ran session 1, logged in usability-findings.md.

## 4. My person this week

None assigned in sprint-2.md; my part of the field week was checking the live events in PostHog for the R1 walk.
