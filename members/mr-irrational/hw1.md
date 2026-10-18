# Homework 1 · Giorgi Phurtseladze (@mr-irrational) · Team One

## 1. My interview log

| Log file | My role | What this interview changed |
|---|---|---|
| `01-discovery/interview-logs/03-diabetic-polyclinic.md` | asked | Six calls over three days, a half-tablet correction and three minutes with the doctor made a two-minute question cost a whole morning. It is also where my Week 3 prediction came from. |
| `01-discovery/interview-logs/06-aunt-hospital.md` | asked | Her 12 hours alone on a short-staffed night shift, at least one such shift a week, showed that the doctor-overload half of our problem is staffing and exhaustion, not queue flow. |
| `01-discovery/interview-logs/01-grandmother-district-clinic.md` | logged | Watched Beka answer for his grandmother; her "I had an appointment, but what does that mean? I still waited" is the sentence Pattern 1 was written from. |
| `01-discovery/interview-logs/04-polyclinic-doctor.md` | logged | He gives out no mobile number and takes walk-ins in the gaps, so the patient's Pattern 2 had a mechanism on the other side of the same door. |
| `01-discovery/interview-logs/05-father-clinic.md` | logged | Six calls over three days and an hour with the garage shut to book showed that booking, not waiting, can be the entire pain. That is the boundary of my own prediction. |

**The quote I heard myself that mattered most:**

> "I know you shouldn't do that. But what do I do, sit and shake?" (03)

**One moment I broke the Mom Test:** In log 03 I asked "Would it help if you could just message her when something like the tablet happens?" and he said "of course it would help, who wouldn't want that", which the log records in red as unusable. What I asked instead was "Can you show me the calls on your phone?", and that turned his "many" into six calls on the 18th, 18th, 19th, 19th, 19th and 20th.

## 2. Pattern journal, Weeks 1 to 4

### Week 1 · Act like an owner, not a role

My lane in the contract is planning, code and management. I signed it on 05.10 and wrote three statements from things I had watched myself: my neighbour Nani not knowing when a specialist would visit Baghdati and not being able to travel to Tbilisi for it, my friend Ana's week going between the registrar and the department, and my aunt covering a ward alone at Kutaisi Central Hospital. Nani's and Ana's did not make the shortlist and I am fine with that; my aunt's statement is one of the evidence strands in the problem we picked. Owner, not role: outreach was nobody's job, so I put my own neighbour Zura on the third floor into the contract as my target, and he became the interview that produced my prediction. `00-foundation/problem-pool.md`, `00-foundation/team-contract.md`

### Week 2 · Evidence over opinion

I asked in one interview and logged two. On 05.10 I interviewed Zura at his flat, with Beka and Jumber logging. The best thing I did was ask to see his phone: "many calls" became six exact dates, which is stronger than anything he said. The worst thing I did was ask whether it would help if he could message the clinic, which got "of course" and went into the log as red. I was the logger for Beka's grandmother and watched for places where Beka answered for her. On 06.10 I co-logged Luka's phone interview with a polyclinic doctor with Jumber. Beyond my lane: all of that is discovery, not planning or code. Hack: I logged the Georgian wording the same night, before translating, so what she actually said survived into the file. `01-discovery/interview-logs/03-diabetic-polyclinic.md`

### Week 3 · Kill your favorite idea

The two-minute-question idea was mine: a chronic patient cannot reach their own doctor between visits, so a small question turns into a trip. I counted all six logs and wrote the verdict myself instead of defending it — confirmed, but narrowed: logs 02 and 03 hit after 2 and 6 failed calls, log 04 confirms the mechanism from the doctor's side, and 01, 05 and 06 are separate problems. So it survives only for an urgent change, and the block is the reception line, not the doctor. Hack: I tallied the logs before the lab, so the verdict reached the file with the log numbers already on it. `DECISIONS.md` line 19, `01-discovery/prediction-trial.md`

### Week 4 · The prototype is the conversation

I own two of the five testers in the plan: Zura from my own interview, and Dato, the referral he gave me on the same cardiologist. Neither is contacted yet, and Zura's condition for coming back is that we bring something to show him. Outside my lane: I wrote my prediction verdict into `DECISIONS.md` and `01-discovery/problem-hypothesis.md` before any tester saw anything, so next week can contradict something I wrote down. Hack: I checked the plan's booking action against logs 02, 03 and 05 first, so I know what that test cannot tell us. `02-design/prototype-plan.md`

## 3. My DECISIONS.md citations

| The line, copied | What I did for it |
|---|---|
| `Wk3 · Prediction "2-min question turns into trip" verdict: confirmed for chronic between-visit changes (2/2 chronic changes hit after 2+6 failed calls, doctor confirms 2-min walk-ins); boundary: repeat prescription (01), booking-only pain (05), ward understaffing (06) are separate · evidence: 01-discovery/interview-logs/02-heart-patient-ward.md, 01-discovery/interview-logs/03-diabetic-polyclinic.md, 01-discovery/interview-logs/04-polyclinic-doctor.md, 01-discovery/interview-logs/01-grandmother-district-clinic.md, 01-discovery/interview-logs/05-father-clinic.md, 01-discovery/interview-logs/06-aunt-hospital.md · owner: Giorgi Phurtseladze` | Wrote the prediction trial worksheet, counted all six logs against my own belief, and wrote this verdict and the matching line in the problem hypothesis. The evidence paths on this line were stale after the logs were renamed in Week 3, so I corrected them to the current filenames in `01-discovery/prediction-trial.md`. |
| `**Problem we chose (06.10.2026, clarified 07.10.2026):** Patients with a regular doctor at a public clinic or hospital, especially those who live far from it, lose hours on a single visit: getting an appointment, travelling there and waiting to be seen, while their doctors work through more patients than the day has room for. Because the same patients must keep coming back, repeated visits add up to real money as well: transport, missed work, and paying for each visit and tests. Therefore, doctors are under huge pressure as well, having to treat so many patients, work tirelessly all day. Evidence: [problem pool](00-foundation/problem-pool.md), the statements about the hospital where Jumber's sister interns (patients wait hours — long wait) + Luka's acquaintance at a polyclinic (booked appointments start late because walk-ins fill the gaps — long wait from doctor's side), Beka's father (difficulty getting an appointment — updated 07.10, replaces his garage story), Giorgi's neighbour Nani / Beka's grandmother (long travel), Giorgi's aunt + Luka's acquaintance at a polyclinic (doctor overload/stress) and Jumber's friend's mother + Beka's grandmother (financial cost of repeated visits).` | Two of the evidence strands in it are mine: Nani's travel statement and my aunt's doctor-overload statement, both written into the pool in Week 1. I also interviewed both sides of the doctor half of it — my aunt at the ward (06) and Zura as the patient who pays for it (03). |
| `Wk4 · Giorgi locked his Week 3 prediction trial verdict into DECISIONS.md and the problem hypothesis before any tester session, so Week 5 can contradict something already written down, and he owns two of the five testers in the prototype plan: Zura (log 03) and Dato, the referral Zura passed on; neither contacted yet · evidence: [problem hypothesis](01-discovery/problem-hypothesis.md), [prototype plan](02-design/prototype-plan.md), [log 03](01-discovery/interview-logs/03-diabetic-polyclinic.md) · owner: Giorgi Phurtseladze` | Wrote the prediction verdict into the problem hypothesis and DECISIONS.md before any tester saw the prototype, and hold two of the five tester relationships in the prototype plan: Zura from log 03 and Dato, the referral he gave me. Neither is contacted yet. |