# Four Filters Scorecard

Scored 06.10.2026 at the Tuesday standup, after four real interviews. Shortlist of three from the [problem pool](problem-pool.md), all from the same world: patients with a regular doctor at a public clinic or hospital in Kutaisi. The pick is to **investigate**, not to build. The interviews can still kill it.

Each filter is scored 1 to 5. Evidence is a link to a log or a pool statement, never an opinion.

## The filters
1. **Observed.** Did we see it happen, and does it keep happening to the same people?
2. **Reachable.** Can we sit with five of these people this week, without going through an institution?
3. **Costly.** What does one occurrence cost them in time, money or risk, and how often does it occur?
4. **Testable.** Can a team of four students learn whether a solution helps within this semester?

## Shortlist

| Problem | Observed | Reachable | Costly | Testable | Total |
|---|---|---|---|---|---|
| A. Patients cannot get an answer from their own doctor between visits | 5 | 5 | 5 | 4 | **19** |
| B. Patients wait hours at the hospital before seeing their doctor | 4 | 3 | 3 | 2 | 12 |
| C. Older patients travel to the clinic every month for a repeat prescription that needs no examination | 3 | 2 | 3 | 2 | 10 |

### A. Answers between visits

- **Observed, 5.** Four of four interviews, each with a specific recent incident. [Luka's acquaintance](../01-discovery/interview-logs/2026-10-06-acquaintance-clinic-patient.md): 5 or 6 calls over 2 days for a question about a new medicine. [Gocha](../01-discovery/interview-logs/2026-10-05-gocha-heart-patient-ward.md): 2 calls, no call back, 4 days, one unplanned trip. [Zura](../01-discovery/interview-logs/2026-10-05-zura-diabetic-monthly-endocrinologist.md): 6 calls over 3 days, showed us the call log, one unplanned trip. [Beka's grandmother](../01-discovery/interview-logs/2026-10-05-beka-grandmother-blood-pressure-prescription.md): 1 call, no answer, waited 10 days.
- **Reachable, 5.** Every one of them came through a neighbour, a relative or a friend, with no clinic involved. Each interview produced at least one referral (see the [outreach tracker](../01-discovery/outreach-tracker.md)).
- **Costly, 5.** Zura: about 4 hours, 4 GEL transport and a lost shop morning for a 3 minute answer. Gocha: about 3 hours plus his daughter's half day off. The bigger cost is clinical: Gocha cut his tablet in half, Zura took half of an old tablet, Beka's grandmother stopped her pills for a weekend. Three of four changed their own dose while waiting.
- **Testable, 4.** The incident has a clear start (a call that goes unanswered) and a clear end (an answer), so time-to-answer and number of calls can be measured. The doctor's side is the unknown: we have not yet spoken to anyone at a clinic.

### B. Waiting at the hospital

- **Observed, 4.** Jumber's sister sees it daily on her ward (pool statement). Gocha waited about 1.5 hours in a corridor, Zura about 2 hours.
- **Reachable, 3.** Patients in the waiting area are there, but approaching them goes through the hospital, and Jumber's sister is an intern, not staff.
- **Costly, 3.** Hours, but the interviews say the long waits only happen when people come **without** an appointment. With one, the acquaintance waited 20 to 30 minutes, Zura 20 to 30, the grandmother 30 to 40, and all three called that normal. Gocha said the visits are fine, "they know me". The long wait looks like a consequence of problem A, not a separate pain.
- **Testable, 2.** Queueing is the hospital's process. Changing it needs the hospital, not the patient.

### C. The monthly prescription trip

- **Observed, 3.** One person so far, Beka's grandmother: every month in person, twice this year on a day the doctor was out. Half a day and a taxi each time. Nobody else in the four interviews mentioned it.
- **Reachable, 2.** Older patients on a standing prescription, reached through family. We have one, and Nino, the retired nurse next door, as a possible second.
- **Costly, 3.** Half a day and transport once a month, doubled when the doctor is out. Predictable, so people plan around it rather than suffer it.
- **Testable, 2.** Prescription renewal rules belong to the clinic and the pharmacy, and we do not yet know what a doctor is allowed to renew without seeing the patient.

## Pick and runner-up

**Pick: A, answers between visits.** Four of four interviews, numbers from every one, a call log shown, and three people who changed their own medication while waiting. Recorded as the first line of [DECISIONS.md](../DECISIONS.md).

**Runner-up: B, waiting at the hospital.** Same people and the same clinics, so it stays open at zero extra cost. We come back to it if the next interviews show that the between-visits problem is rare or that people get answers on the first call.

**Why C sits third.** Real for one person, but it is a predictable monthly chore rather than an urgent gap, and so far only one voice. It stays in the pool and in the script as question 7.

## The rest of the pool, not shortlisted

Listed so the choice is visible. One line each on why it did not make the shortlist.

| Problem (author) | Why not now |
|---|---|
| Nurses write vitals on paper and retype them at the end of the shift (Jumber) | Hospital world, but the customer is the hospital, not a person we can reach without permission. Keep it for later if we end up talking to clinic staff. |
| A friend has no way to picture a cosmetic change on his own face (Jumber) | Observed once, with one person. No evidence yet that it repeats or that others have it. |
| Project broke on deployment the night before demo day, no CI (Luka) | Real, but the people who have it are classmates, which the course rules out as interviewees. |
| Merge conflict wiped out part of a friend's work (Luka) | Same population as above, and existing tools already cover it. |
| Garage owner walks out to the yard to check if a car is ready (Beka) | One business, one owner. Reachable, but no second person has described it. |
| Group chat task list buried under memes, tasks done twice (Beka) | Groupmates are in the course or adjacent to it. Hard to interview without the "not in this course" rule biting. |
| Guest house bookings from three channels tracked in a paper notebook (Giorgi) | One household. Crowded market with known tools. |
| Exchange application bounced between registrar and department for a week (Giorgi) | University process, university owns the fix. |
| Furniture workshop underquotes one job in five (Giorgi) | One workshop, one owner. Plausible, but no second observation. |
