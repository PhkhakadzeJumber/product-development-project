# Usability Findings

One block per session, written within an hour of running it, in the order we ran them. Same discipline as an interview log: behavior timed, quotes verbatim, verdict against the rule we wrote before.

**The rule we judge against** (frozen test, copied unchanged from `02-design/prototype-plan.md` §5 into `test-plan.md`):
- **Success:** within two minutes and without help, the tester selects a general practitioner, books one future available slot, and points to the booking confirmation or the visit in "My visits."
- **Failure behaviors:** 1. cannot find a general practitioner or available future time; 2. stops before pressing "Book"; 3. completes the booking but cannot tell whether it succeeded.
- **Decision rule (out of 5):** if 3 or more of 5 testers fail, do not treat the current booking flow as usable without help; identify the observed blocker and revise the flow before testing it again.
- **Predicted first mistake:** they will think selecting an available slot completes the booking and leave before pressing "Book."

The task is read in Georgian from one fixed translation, the same words in every session.

## Session 1 · Patient-2 · patient, about 60, heart check-ups every two weeks · their phone · ran BS, logged JP

**Booked:** 09.11.2026, 21:00
*Written up 10.11.2026 from the logger's notes taken during the session.*

**Task read:** "You need a routine follow-up appointment. You are already signed in as a patient in this demo. Find a general practitioner at the demo polyclinic in Kutaisi, choose a future available time, and show me when the visit is booked."

| Time | What they did | What they said (verbatim) | Note |
|---|---|---|---|
| 0:00 | task read | | |
| 0:14 | tapped on the "Doctors" list and scrolled | | |
| 0:28 | selected a GP and tapped the 11:00 slot for tomorrow | "Okay, tomorrow at eleven is good." | |
| 0:34 | placed the phone face-up on the table | "Finished. I will go tomorrow." | predicted first mistake: yes; failure behavior 2 |
| 0:45 | the runner asked him to show the booking confirmation; he looked confused | "Isn't it booked? I clicked the time and it turned green." | prompted by the runner (the verdict was already decided at 0:34) |
| 1:05 | picked phone back up, pressed the home screen button | "There is no confirmation here. Do I press something else?" | |

**Time to first tap:** 0:14
**Time to the one action, or did not complete:** Did not complete (stopped before pressing the final "Book this visit" button).
**Result vs rule:** FAIL, because they stopped before pressing "Book this visit" (failure behavior 2). 
**Surprise (something no interview told you):** They treat selecting a time block on a screen exactly like verbally agreeing to a time with a receptionist. To them, saying "I'll take 11:00" and tapping it feels like the entire transaction.
**Answer to "what were you expecting to happen?":** "I thought clicking the hour reserves it for me. Why would it ask me again?"

## Session 2 · Patient-1 · patient, diabetic 4-5 years (log 03) · their phone · ran LM, logged GP

**Booked:** 10.11.2026, 10:00
*Written up 10.11.2026, 10:30 from the logger's notes taken during the session.*

**Task read:** "You need a routine follow-up appointment. You are already signed in as a patient in this demo. Find a general practitioner at the demo polyclinic in Kutaisi, choose a future available time, and show me when the visit is booked."

| Time | What they did | What they said (verbatim) | Note |
|---|---|---|---|
| 0:00 | task read | | |
| 0:08 | tapped "Search", typed "terapevti" (therapist/GP) | | |
| 0:22 | tapped the first available doctor, then tapped the calendar date for Thursday | "Let's see Thursday." | |
| 0:35 | selected the 14:30 slot, saw the confirmation screen, and tapped "Book this visit" | | predicted first mistake: no |
| 0:42 | looked at the screen, then tapped "My visits" at the bottom | "It says confirmed." | unprompted |
| 0:50 | pointed to the Thursday 14:30 block in the "My visits" tab | "Here it is. I am booked." | |

**Time to first tap:** 0:08
**Time to the one action, or did not complete:** 0:35 to tap "Book this visit", 0:50 to point to the visit in "My visits".
**Result vs rule:** PASS.
**Surprise (something no interview told you):** None. The flow worked exactly as designed for a user familiar with basic app navigation.
**Answer to "what were you expecting to happen?":** "I expected it to show up in my scheduled visits, and it did."

## Session 3 · Patient-3 · patient, two-weekly ward check-ups · their phone · ran LM, logged JP

**Booked:** 10.11.2026, 11:00
*Written up 10.11.2026, 11:45 from the logger's notes taken during the session.*

**Task read:** "You need a routine follow-up appointment. You are already signed in as a patient in this demo. Find a general practitioner at the demo polyclinic in Kutaisi, choose a future available time, and show me when the visit is booked."

| Time | What they did | What they said (verbatim) | Note |
|---|---|---|---|
| 0:00 | task read | | |
| 0:12 | tapped the search bar, typed "dr" | | |
| 0:25 | selected the first GP, scrolled to the bottom of the calendar | "Let's find Friday." | |
| 0:40 | tapped a Friday slot, saw the next screen, and tapped "Book this visit" | | predicted first mistake: no |
| 0:48 | stared at the success screen, then immediately tapped the "Home" icon | "Did they get it? Where did it go?" | failure behavior 3 |
| 1:15 | scrolled up and down the home screen, ignoring the "My visits" tab | "I need a ticket number to show the guard at the door. Where is my slip?" | unprompted |

**Time to first tap:** 0:12
**Time to the one action, or did not complete:** 0:40 to tap "Book this visit", but did not complete the final requirement of the task (could not point to confirmation/visits).
**Result vs rule:** FAIL, because they completed the booking but could not tell whether it succeeded or find the record (failure behavior 3).
**Surprise (something no interview told you):** The patient was specifically looking for something that resembled a physical "slip" or "ticket" to show clinic security, which our standard digital confirmation screen did not look like. "My visits" tab was completely ignored as a place to find this proof.
**Answer to "what were you expecting to happen?":** "I expected a big number and a stamp, like when you pay the electricity bill at the TBC kiosk."

## Session 4 · Patient-5 · patient, sees the same cardiologist every month (log 10) · their phone · ran JP, logged GP

**Booked:** 10.11.2026, 12:00
*Written up 10.11.2026, 12:45 from the logger's notes taken during the session.*

**Task read:** "You need a routine follow-up appointment. You are already signed in as a patient in this demo. Find a general practitioner at the demo polyclinic in Kutaisi, choose a future available time, and show me when the visit is booked."

| Time | What they did | What they said (verbatim) | Note |
|---|---|---|---|
| 0:00 | task read | | |
| 0:15 | on the main page, tapped "Hospitals", then chose "Kutaisi Polyclinic" | "I know where my doctor is." | unprompted |
| 0:32 | found a GP on the clinic page, tapped their name | | |
| 0:45 | tapped the date for next Tuesday, then tapped the 10:00 slot | | |
| 0:58 | read the updated screen, then tapped "Book this visit" | "Done." | predicted first mistake: no |
| 1:10 | remained on the success screen and pointed to the green checkmark | "It says it is booked right here. Next Tuesday at ten." | |

**Time to first tap:** 0:15
**Time to the one action, or did not complete:** 0:58 to tap "Book this visit", 1:10 to point to the confirmation.
**Result vs rule:** PASS.
**Surprise (something no interview told you):** Instead of searching for a doctor directly, they navigated by the physical location (the clinic) first, replicating how they conceptualize going to their regular appointments.
**Answer to "what were you expecting to happen?":** "I expected it to tell me booked visit time was saved, which it did."

## After 3 sessions: apply the decision rule

**Sessions run:** 4 (Patient-1, Patient-2, Patient-3, Patient-5) · **Fails:** 2 (session 1, failure behavior 2; session 3, failure behavior 3) · **Rule says:** keep going. 2 fails is below the "3 or more of 5" threshold, so the rule is not triggered yet; Patient-4 decides it: a fail makes 3 of 5 and the flow is revised, a pass makes 2 of 5 and the flow stands.
