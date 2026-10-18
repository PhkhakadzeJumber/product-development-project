# Homework 1 · Jumber Pkhakadze (@PhkhakadzeJumber) · Team One

**Save this file as:** `members/<your-github-username>/hw1.md`
**Filled-in example:** `Lab-4/examples/hw1.md` (Luka, Sakhli team)
**Individual. 5 points. Commit it from your own account, then upload the same file to the LMS.**

Everything below must link to files in your team repo. A claim with no link counts as not there.

## 1. My interview log

Every real interview you took part in. At least 2 where you were the **asker**.

| Log file (link) | My role (asked / logged / both) | What this interview changed, in one sentence |
|---|---|---|
| [02-heart-patient-ward.md](../../01-discovery/interview-logs/02-heart-patient-ward.md) | asked | Gocha's regular booked visits were fine; the 1.5-hour wait came only after two unanswered calls forced an unplanned visit, showing the pain is between-visit contact, not the appointment itself. |
| [03-diabetic-polyclinic.md](../../01-discovery/interview-logs/03-diabetic-polyclinic.md) | logged | Zura's six unanswered calls and unplanned trip confirmed the between-visit contact problem, while his normal booked wait proved it is separate from routine appointment delay. |
| [04-polyclinic-doctor.md](../../01-discovery/interview-logs/04-polyclinic-doctor.md) | logged | The doctor's 31 patients in a day booked for 22, leaving two hours late, confirmed doctor overload and walk-ins filling the gaps between booked patients. |

**The quote I heard myself that mattered most, with its log number:**

> "I sat an hour and a half for five minutes." (02)

**One moment I broke the Mom Test, and what I asked instead next time** (name the log):

In log 03, as second logger for Zura, I heard Giorgi ask, "Would it help if you could just message her when something like the tablet happens?" and Zura say "of course" — a hypothetical answer, not evidence. Next time I asked about the last real event: what he actually did, how many times he called, and what happened next, which produced the exact six call dates in log 03.

## 2. Pattern journal, Weeks 1 to 4

Copy your entries from `members/<your-github-username>/pattern-journal.md`. Each week answers the same prompt: Where did you apply this pattern this week, where did you exercise agency beyond your assigned lane, and what did you hack together to test something faster than the plan allowed? Each entry links at least one file or commit.

### Week 1 · Act like an owner, not a role

My lane is build: the repo and the code. I created the repo and the semester folder structure on 29.09, drafted the first team contract and the outreach tracker, and fixed the merge conflicts when three of us edited the contract at once. Two of my three statements came from my sister's internship at the hospital in Kutaisi: patients waiting hours for their doctor, and nurses retyping paper notes at the end of the shift. The third is a close friend's mother, who pays around 150 GEL for each three-weekly visit. The waiting statement became the problem we picked. Owner, not role: the repo was my job, but the hospital contacts came from me too, and that is where two of our interviews came from.

Links: [team contract](../../00-foundation/team-contract.md), [outreach tracker](../../01-discovery/outreach-tracker.md), [problem pool](../../00-foundation/problem-pool.md)

### Week 2 · Evidence over opinion

I asked in one interview and logged two. I interviewed Gocha on 05.10 in the hospital café after his check-up, introduced through my sister, with Luka and Beka logging. Going in I believed the problem was the hours of waiting. Gocha said the two-weekly visits are fine and the hard part is getting help in between: he called the ward twice, nobody called back, so he came in without an appointment and waited an hour and a half for five minutes with the doctor. That is partly against my own statement, and it is in the log as it was said. I was second logger for Zura at his flat and counted the silence before Giorgi spoke after the half-tablet came out. On 06.10 I logged Luka's phone interview with a polyclinic doctor, together with Giorgi. My sister is passing a message to Gocha's neighbour on check-up days for the next interview.

Links: [Gocha log](../../01-discovery/interview-logs/02-heart-patient-ward.md), [Zura log](../../01-discovery/interview-logs/03-diabetic-polyclinic.md), [polyclinic doctor log](../../01-discovery/interview-logs/04-polyclinic-doctor.md)

DECISIONS.md lines I drove: the problem we picked, hospital waiting, is my statement, and I rewrote the interview script around it. The Gocha log is one of the four pieces of evidence behind the Week 3 verdict.

### Week 3 · Kill your favorite idea

My favorite idea was my own Step 1 belief: patients lose two to four hours waiting at the hospital before they can see their doctor. It was our first pick, and on 06.10 I kept it as the pick but narrowed it: the long wait is real, but it clusters on patients who come without an appointment after their calls go unanswered — with an appointment, Zura waits 20–30 minutes and calls it normal, and Gocha says his regular visits are fine. I tested my belief against every log instead of defending it. Logs 01 (grandmother), 02 (Gocha) and 03 (Zura) all hit a 1.5–2 hour wait on a difficult visit; log 05 (Beka's father) missed at 30 minutes, his pain being three days of calling, a wasted booking trip and a two-week wait for the slot. Verdict: weakened — the wait is real, but it is a walk-in/failed-contact problem more than an every-visit problem. Beyond my lane: all of this is discovery, not build. The hack: I converted the Gocha interview log and the interview script to the v2 layout, and filled the problem pool and hypothesis parts, in one evening so the team had one consistent format to score against instead of mixed drafts.

Links: [grandmother log](../../01-discovery/interview-logs/01-grandmother-district-clinic.md), [Gocha log](../../01-discovery/interview-logs/02-heart-patient-ward.md), [Zura log](../../01-discovery/interview-logs/03-diabetic-polyclinic.md), [father log](../../01-discovery/interview-logs/05-father-clinic.md), [Four Filters scorecard](../../00-foundation/four-filters-scorecard.md), [affinity map, Patterns 2 and 5](../../01-discovery/synthesis/affinity-map.md), [DECISIONS.md](../../DECISIONS.md)

DECISIONS.md lines I drove: the problem we picked, hospital waiting, is my statement, and I rewrote the interview script around it. The Gocha log is one of the four pieces of evidence behind the Week 3 verdict. My Week 3 verdict: weakened — 3 of 4 patients hit the ~1.5–2 h wait (grandmother, Gocha, Zura), 1 missed (father, 30 min), with the caveat that long waits cluster on walk-ins after unanswered calls.

### Week 4 · The prototype is the conversation

I own two of the five testers in the plan: Gocha from my own interview (log 02), and a new ward neighbour introduced through my sister. Neither is contacted yet, and Gocha's condition for coming back is that we bring something to show him. My part of the plan is the booking side: the riskiest assumption that a patient can find a doctor and book a future slot without help, plus the example doctors and slots the test needs. Hack: I checked the plan's booking action against logs 02, 03 and 05 first, so I know what that test cannot tell us — that Gocha and Zura book ahead fine and the pain is only reaching the doctor when something changes. `02-design/prototype-plan.md`

## 3. My DECISIONS.md citations

Each `DECISIONS.md` line you drove or supplied the evidence for. Copy the line exactly, then say what you did.

| The line, copied | What I did for it |
|---|---|
| `Wk3 · Prediction "patients lose 2-4h waiting" verdict: weakened to ~1.5-2h wait driven by walk-ins after failed phone contact; 3/4 patients hit it, 1 miss (30 min, booking was pain) · evidence: 01-discovery/interview-logs/01-grandmother-district-clinic.md, 01-discovery/interview-logs/02-heart-patient-ward.md, 01-discovery/interview-logs/03-diabetic-polyclinic.md, 01-discovery/interview-logs/04-polyclinic-doctor.md, 01-discovery/interview-logs/05-father-clinic.md · owner: Jumber Pkhakadze` | Tested my own belief that patients lose 2–4 hours waiting against every log, narrowed it to walk-ins after unanswered calls, and recorded the weakened verdict with the father log as the miss. |
| `Wk4 · Jumber took the booking side of the first prototype plan — the riskiest assumption that a patient can find a doctor and book a future slot without help, with seeded demo doctors, slots and demo patient accounts · evidence: [prototype plan](02-design/prototype-plan.md), [ER model](er_model.md) · owner: Jumber Phkhakadze` | Took the booking side of the prototype plan — the riskiest assumption (patient books alone) with example doctors and slots. |
| `Wk4 · Jumber owns two of the five testers in the prototype plan — Gocha (evidence log 02) and a new ward neighbour introduced through his sister; neither contacted yet · evidence: [prototype plan](02-design/prototype-plan.md) · owner: Jumber Phkhakadze` | Owns two of the five prototype plan testers: Gocha from my interview (log 02) and a new ward neighbour through my sister. |

