# MVP Boundary

The smallest complete user journey that tests whether the product creates value. Complete: the person gets the value, start to finish. Smallest: nothing that is not on that path is in Sprint 1.

**Value hypothesis under test:** A patient like Gela, whose medicine or result changes between visits, who can send the question to his own doctor and read the answer on screen, will get it resolved without a trip, instead of 2 to 6 calls over up to three days and 1.5 to 2 hours in the corridor for an answer of a few minutes (problem statement v2, sentences 2, 3 and 5; logs 02, 03, 09, 10).

**The one person walking this journey:** Gela, 56, a long-running illness and one regular doctor at a public clinic, 20 bus stops away (`00-foundation/icp.md`).

## The journey

1. Gela opens MediBook from the link his clinic gave him and finds his doctor
2. Gela writes what changed (for example "new tablet since Tuesday, dizzy, heart rate low") and sends it to his doctor
3. His doctor opens her private doctor link, reads the question, and writes an answer
4. Gela opens his link and reads the answer
5. Gela taps "This solved it, no trip needed"

**Why this is complete:** After step 5 Gela has his doctor's answer and has confirmed he does not need to travel in for it, which is what cost Dato 16 GEL and about 3.5 hours of work (log 10) and Zura about four hours and a shop morning (log 03).

**Why this is smallest:** We considered ending at step 4, once the answer is on screen. Log 10's Viber message to the doctor was marked "Seen" and he still made the trip; an answer that is read is not a trip avoided, so step 5 stays.

## Cut list

| Feature | Reason (cite the log, session, or hypothesis) | Comes back when |
|---|---|---|
| Booking a visit, with visit types and their built-in lengths | Not on the between-visit journey; booking was easy for 02, 03, 07 and 10; the 30-minute length was never timed. The Figma prototype tested booking and 2 of 4 sessions failed on it (sessions 1 and 3), which is a finding for its own round | Sprint 2, after the Week 7 gate, once the Doctor-1 walkthrough and the next interviews have timed real visits |
| The brief description as a booking field | It becomes step 2 instead: the question itself, which is what Dato's Viber message (10) and reception's paper notes (09) were trying to carry | With booking, Sprint 2 |
| Hospitals list and clinic page | Gela has one regular doctor at one clinic (ICP); only one session used it (session 4) | With booking, Sprint 2 |
| Doctor's week timetable, Seen and No-show | Tools for booked visits, not for questions between visits; the doctor walkthrough has not run yet | With booking, Sprint 2 |
| Reception desk (routing, ad-hoc visits) | The question goes to the doctor directly, around the reception line that misses calls and passes paper notes (09, 03) | With booking, if a Receptionist-1 walkthrough supports it |
| Prescription renewal requests | One direct case only (01), and we do not yet know what a doctor may renew without seeing the patient (Pattern 3, open guess) | After a doctor interview answers what a remote renewal needs |
| SMS, email or Viber notice that an answer is waiting | The hypothesis is testable with the answer on screen; Gela checks his link | Sprint 2, if `patient_views_answer` shows answers sitting unread for days |
| Login and accounts | A private patient link and a private doctor link reach every step; Beka's grandmother asks Beka to call for her (01) | Sprint 3, if a link is ever shared by mistake |
| Payment | 0 of 10 logs asked to pay through an app; the hypothesis is testable without money moving | After a pricing test, Week 12 |
| AI: suggesting a visit type, triage, drafting the doctor's answer | Triage and automated diagnosis are excluded in the prototype plan; there are no real questions yet to learn from | Weeks 10 to 13, evaluated on real question data |
| Chat, back-and-forth conversation | One question and one answer is what the logs ask for (02, 03, 10); Viber already exists and the doctor still did not reply (10) | Only if doctors ask for follow-ups |
| Delay banner, walk-in queue, waitlist | Pattern 1 (booked patients going in late), the runner-up, not the pick | If Pattern 1 becomes the pick |

## Step to event

| Step | Event (actor_verb_object) | In the schema? |
|---|---|---|
| 1 | `patient_opens_doctor_list` | yes |
| 2 | `patient_sends_question` | added today (fired by patient; patient_id, doctor_id, question_id, char_count, never the text; owner JP) |
| 3 | `doctor_answers_question` | added today (fired by doctor; doctor_id, patient_id, question_id, minutes_since_question; owner JP) |
| 4 | `patient_views_answer` | added today (fired by patient; patient_id, doctor_id, question_id, minutes_since_answer; owner JP) |
| 5 | `patient_confirms_remote_resolution` (resolution_type answer) | yes |

**North star step:** 5

## The DECISIONS.md line

`Wk6 · MVP boundary: 5-step journey (Gela opens his doctor's link to Gela confirms the question was resolved without a trip); cut booking with visit types, prescription renewals, SMS notices, login and payment · evidence: 03-build/mvp-boundary.md, logs 01, 02, 03, 09, 10, sessions 1 to 4 · owner: JP`
