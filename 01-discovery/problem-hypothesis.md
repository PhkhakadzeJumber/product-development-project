# Problem Hypothesis v1

Commit it **before your first real interview**. The commit date is your proof.

## Step 1: What each of us believes (2 minutes, silently, then share)
| Teammate | What I believe the real problem is |
|---|---|
| Luka Mikautadze | Ill people cannot get a quick answer from their doctor between visits, so they keep calling or go back in person |
| Jumber Pkhakadze | Patients lose two to four hours waiting at the hospital before they can see their doctor |
| Beka Shekiladze | Older patients with a standing treatment have to show up at the clinic for things that need no examination, like a repeat prescription or a yes/no question, and often leave without it |
| Giorgi Phurtseladze | People with a chronic illness have no way to ask their own doctor a small question between visits, so a two-minute question turns into a trip to the clinic |

## Step 2: The hypothesis we test first
Revised 06.10.2026 together with the interview script, clarified 07.10.2026 with the financial cost of repeated visits. The first version tested getting an answer from the doctor between visits; that belief is now in Step 3.

> **We believe** people like Gela, 56, who have a long-running illness and one regular doctor at a public clinic far from home
> **struggle with** the time a single visit takes: getting an appointment, travelling to the clinic and waiting to be seen, while the doctor works through more patients than the day has room for, and because the same patients must keep coming back, repeated visits add up to real money as well: transport, missed work, and paying for each visit and tests
> **when** the day of the visit comes and they arrive to a corridor already full of patients
> **which costs them** half a day for a few minutes with the doctor, plus transport fare, lost earnings that morning, and sometimes a relative's working day too
> **Today they** go anyway and wait, come without an appointment when they cannot get one that fits, or leave without being seen
> **We are wrong if** patients generally get appointments easily, reach the hospital without significant difficulty, see their doctor without long waits, and do not feel that the process takes too much of their time and financial effort. We are also wrong if doctors generally do not experience large numbers of patients as stressful or disruptive to their work.

## Step 3: The beliefs we did not pick
Each one becomes at least one question in your interview script, so you still hear about it.
- The real pain is getting an answer from the doctor between visits, not the visit itself → script questions 2 and 6 (why they came without an appointment) and question 17
- The real pain is having to show up in person for something that needs no examination, like a repeat prescription → script questions 1 and 2

## Checks before you commit
- [x] No product words (app, platform, tool, AI, bot)
- [x] "When" is a moment, not "sometimes" or "when busy"
- [x] "We are wrong if" could be seen in a single interview log
- [x] The "we are wrong if" line is copied to the top of your script and your log template

## After interviews (fill in Week 3)
**Verdict:** confirmed, with one caveat (06.10.2026) · **Evidence:** four real interviews, three patients and one doctor. All three patients described a wait of 1.5 to 2 hours on their last difficult visit, and the doctor described the same day from the other side. [Gocha](interview-logs/02-heart-patient-ward.md): about 1.5 hours in the ward corridor for about 5 minutes with the doctor, about 3 hours in total, and his daughter took a half day off work. [Beka's grandmother](interview-logs/01-grandmother-district-clinic.md): several tries to find an appointment that fit, about an hour each way by bus, about two hours of waiting with an appointment, and she left without seeing the doctor. [Zura](interview-logs/03-diabetic-polyclinic.md): forty minutes by bus, about two hours in the corridor for three minutes with the doctor, about four hours door to door and a lost shop morning. [Luka's acquaintance, a polyclinic doctor](interview-logs/04-polyclinic-doctor.md): 22 booked patients and 9 more without an appointment on his last bad Monday, appointments cut from about 15 minutes to under 10, and he left about two hours late. The caveat: Gocha and Zura only waited that long because they came without an appointment, and both came that way because their calls went unanswered. With an appointment Zura waits twenty to thirty minutes and calls it normal, and Gocha says his regular visits are fine. Scored in the [Four Filters scorecard](../00-foundation/four-filters-scorecard.md). Recorded in `DECISIONS.md`.

**Update 07.10.2026, +2 interviews (six total):** [Beka's father](interview-logs/05-father-clinic.md) supports the appointment sub-problem without the wait: 6 calls over 3 days, 1 wasted in-person booking trip (closed the garage for an hour), 2 weeks waiting in pain, then 30 minutes in the corridor and 10 minutes with the doctor, slip shown. [Giorgi's aunt](interview-logs/06-aunt-hospital.md) supports the doctor-pressure sub-problem as staffing/exhaustion, distinct from the polyclinic volume-flow: last Saturday 2 doctors became 1 sick, 12 hours with one short tea break, 3 arrivals in 30 minutes at midnight, short-staffed at least one shift every week, wants to quit. Father proves S1 can hurt without S3; aunt proves S4 is understaffing, not just gaps between booked patients.

Week 3 verdict (Jumber Pkhakadze personal trial): weakened. Evidence: logs 01, 02, 03 hit ~1.5-2h; log 05 miss (30 min). See DECISIONS.md.

Week 3 verdict (Giorgi Phurtseladze personal trial): confirmed with boundary. Evidence: logs 02, 03 hit (2 calls / 6 calls -> trip for 5 min / 3 min); log 04 confirms 2-min question mechanism; logs 01, 05, 06 miss (different variants). See DECISIONS.md.

Week 3 verdict (Luka Mikautadze personal trial): confirmed, narrowed. Evidence: logs 02, 03, 07 hit (2 / 6 / 4 calls; 02 and 03 then went in); log 04 confirms from the doctor side; logs 01, 05 miss (no between-visit question). See DECISIONS.md.

Week 3 verdict (Beka Shekiladze personal trial): weakened, narrowed. Evidence: log 01 directly supports a repeat-prescription trip ending without the prescription; logs 02 and 03 support adjacent brief between-visit needs becoming walk-ins after failed calls; log 04 confirms the doctor-side two-minute-question pattern. "Often leave without it" is not established by one direct case. See DECISIONS.md.

**Log 08 (receptionist, 10.10.2026):** short, paraphrased phone call (asker Jumber, loggers Luka and Giorgi). She estimated booked patients wait about 10 minutes and patients without an appointment about 40 minutes to an hour or more, and described reception strain when the doctors are overloaded. She did not cover callbacks or call volume, so the reception-line half of Pattern 2 stays open and needs a follow-up.
