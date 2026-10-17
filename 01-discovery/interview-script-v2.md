# Interview Script v2

Updated 17.10.2026 from v1 and all 7 interview logs.

## What we are testing

**Current problem:** Patients with a regular doctor lose time and money getting care: reaching the clinic or securing an appointment, travelling, and waiting, while doctors handle more demand than the day or staffing can absorb.

**Week 3 learning:** Long waits are not universal: they were about 1.5–2 hours in three patient cases, while one patient waited 30 minutes. The long waits in two cases followed failed calls and unplanned visits. Separately, two patients with urgent changes between visits made repeated calls; both went in, while a third patient got a callback on day two. A doctor also reported two-minute walk-in questions from patients who could not reach him. Keep testing this between-visit problem without assuming every call fails or every patient needs a trip.

## What happened to the v1 questions

| v1 question | Decision | Reason |
|---|---|---|
| 1. How often do you visit? | Keep | Establishes the person's care cadence and context. |
| 2. Walk through the last visit. | Keep | Grounds the conversation in a recent, specific event. |
| 3. How long was the trip? | Keep | Travel time is part of the repeated time and cost burden. |
| 4. How long did you wait? | Keep, sharpen | Waiting varied substantially; ask against appointment time or arrival and include cases where they left unseen. |
| 5. Last long wait? | Cut | Duplicates the last-visit walkthrough and wait-duration question. |
| 6. Last difficulty getting an appointment? | Keep, sharpen | Captures the distinct booking problem documented in the father's case. |
| 7. What did you do while waiting? | Cut | Usually adds little beyond the visit walkthrough, wait, and cost questions. |
| 8. What did the visit cost in time or things given up? | Keep, sharpen | Four logs show repeated travel, lost work, fare, or caregiver time; ask for concrete amounts. |
| 9. Busiest hospital day? | Cut | Generic and overlaps the specific visit and wait questions. |
| 10. How do you feel about your job? (doctors) | Cut | General opinion is less useful than a specific high-demand day and its effects. |
| 11. Last particularly busy day? (doctors) | Keep | Gets concrete patient counts, timing, and hours from the doctor's own experience. |
| 12. Last time patient numbers affected work? (doctors) | Keep | Tests the predicted effects on care and workload with a specific example. |
| 13. Average number of patients daily? (doctors) | Cut | A general estimate is weaker than counts tied to a specific day; collect counts in Q11. |
| 14. What usually happens when more patients arrive? (doctors) | Cut, replace | Generic; the new question asks about a specific walk-in and what happened to the people waiting. |
| 15. Hardest part of work with many patients? (doctors) | Keep, anchor | Captures the distinct human and task impact; anchor it to the day already described. |
| 16. Last time many arrived together? (doctors) | Cut | Duplicates the busy-day walkthrough in Q11. |
| 17. Anything important I didn't ask? | Keep, anchor | Leave room for an important concrete event missed by the structured questions. |
| 18. Who else should we talk to? | Keep | Supports follow-up with relevant patients and staff. |
| 19. Could we come back with something to show you? | Cut | Not evidence about the problem and can invite premature feedback on a solution. |

## New questions: repeated surprises

Each addition comes from a pattern present in at least two different logs. Log numbers follow the [affinity map](synthesis/affinity-map.md).

| New question | Repeated surprise it investigates | Logs |
|---|---|---|
| Patients: “Since your last planned visit, tell me about the most recent time something changed or you had a question for your doctor. What did you do to reach them, how many attempts did you make, and what happened?” | Between-visit contact sometimes takes repeated calls, leads to an in-person visit, or ends in a callback; it is not always a trip. | 02, 03, 04, 07 |
| Patients: “Tell me about the most recent question you chose to save for a routine visit. What happened while you waited, and what did you do when you finally got an answer?” | Some patients defer non-urgent questions rather than spend days trying to reach the doctor. | 03, 07 |
| Patients: “On the last visit when you had an appointment, when were you actually seen? If you came without an appointment, walk me through what happened before you were seen.” | The appointment or walk-in route changes the wait; walk-ins taken between booked patients can also push booked visits late. | 01, 02, 03, 04 |
| Doctors: “Tell me about the most recent walk-in you could not see right away. What happened to that patient and to the other patients waiting?” | Walk-ins and other patients share limited capacity, but what happens when the doctor cannot fit a walk-in is not yet clear. | 04, 06 |

The short-visit costs already have a useful v1 question (Q8), so they do not need a duplicate new question. The repeat-prescription case appears in only one log; do not treat it as a repeated surprise yet.

## The script to read

Use the patient questions with patients and the doctor questions with doctors. Skip a question if the event did not happen; record “Not discussed” rather than suggesting an answer. Ask for the most recent real example and exact numbers where possible.

### Opening

“I'm [name], a student at KIU, and this is my teammate [name]. We're doing a university project about how people get care and how doctors experience their work. We're not selling anything and have nothing to show you. We want to hear what actually happened, so there are no wrong answers. Is it okay if my teammate takes notes? We won't use your name.”

### Patients

1. How often do you usually need to visit a doctor or hospital?
2. Walk me through the most recent time you needed care, from deciding to get help until you left or got an answer. What was the reason for it?
3. How long did it take to get to the clinic or hospital that time? How did you travel?
4. If you had an appointment, when were you actually seen compared with the scheduled time? If you had no appointment, how long did you wait after arriving? Did you leave without being seen or getting what you came for?
5. Since your last planned visit, tell me about the most recent time something changed or you had a question for your doctor. What did you do to reach them, how many attempts did you make, and what happened?
6. Tell me about the most recent question you chose to save for a routine visit. What happened while you waited, and what did you do when you finally got an answer?
7. Tell me about the last time you needed an appointment. How did you get it, and how long was it from first trying to book until the visit?
8. What did that episode cost in travel, waiting, money, work or other things you had to give up? Please walk me through the time and amounts.
9. Thinking of the events we discussed, is there another specific moment about getting care that we should understand?

### Doctors

1. Walk me through the most recent day when you had more patients than usual, from the start of the shift to the end. About how many were booked and how many came without appointments?
2. What changed in your work or in patient care on that day? What happened to appointment lengths, breaks, notes, or unfinished work?
3. What part of the work was hardest on that day? What is the most recent specific example?
4. Tell me about the most recent walk-in you could not see right away. What happened to that patient and to the other patients waiting?
5. Thinking of the day we discussed, is there another specific moment about handling patient demand that we should understand?

### Close

- Who else should we talk to about this, and who could introduce us?
- Thank you for your time.

### Follow-up prompts

- What happened next?
- When was that?
- How many times did that happen?
- How long did each part take?
- What did you do next?
- What did you have to give up or pay?
- Can you show me the appointment slip, call history, messages, or other record?

**Interview notes:** Keep the person's wording and distinguish what they observed from what they inferred. Do not suggest that a call failed, a visit was too long, or a solution would help; ask what happened and record exceptions as carefully as confirming cases.
