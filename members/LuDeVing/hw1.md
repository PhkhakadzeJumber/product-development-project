# Homework 1 · Luka Mikautadze (@LuDeVing) · Team product-development-project

**Individual. 5 points. Commit it from your own account, then upload the same file to the LMS.**

<!-- TODO before submitting (delete this block when done):
1. Week 4 is empty: write it after 02-design/prototype-plan.md exists.
2. Rewrite every entry in your own words. -->

## 1. My interview log

Every real interview you took part in. At least 2 where you were the **asker**.

| Log file (link) | My role (asked / logged / both) | What this interview changed, in one sentence |
|---|---|---|
| [07 · acquaintance, long-term clinic patient, 05.10](../../01-discovery/interview-logs/07-long-term-patient-clinic.md) | both (solo phone call) | The answer can come by phone after 4 calls over 2 days with no trip, so the between-visits problem is the calling, not always a trip, and "not urgent, so I wait" became Pattern 5. |
| [04 · polyclinic doctor, 06.10](../../01-discovery/interview-logs/04-polyclinic-doctor.md) | asked (Jumber and Giorgi logged) | The only interview from the doctor's side: walk-ins taken in the gaps make booked patients late, which explained the patients' long waits from the other side of the door. |
| [02 · Gocha, heart patient, 05.10](../../01-discovery/interview-logs/02-heart-patient-ward.md) | logged (with Beka) | His 1.5-hour wait for 5 minutes came only after 2 unanswered calls, which tied the long waits to failed phone contact. |
| [05 · Beka's father, back pain, 07.10](../../01-discovery/interview-logs/05-father-clinic.md) | logged (with Giorgi) | Getting an appointment can hurt with almost no corridor wait: 6 calls, a wasted booking trip and 2 weeks in pain, then 30 minutes in the corridor. |

**The quote I heard myself that mattered most, with its log number:**

> "The difficult part was just not knowing." (07)

**One moment I broke the Mom Test, and what I asked instead next time** (name the log):

In 07 I accepted "I think I called maybe five or six times over two days" without pushing for evidence, and the calls he walked me through add up to 4. Next time I ask "Can you show me the calls on your phone?", the way Giorgi got six exact dates from Zura's call log in 03.

## 2. Pattern journal, Weeks 1 to 4

### Week 1 · Act like an owner, not a role

My lane in the contract is code, CI and deployment. This week had no code to write, so I did the foundation work instead: my three problem statements in the pool (the Kutaisi to Tbilisi bus driver taking seat bookings on his phone while driving, my uncle who could not get through to his doctor, a neighbour's cake orders lost in her chats), my outreach target in the contract (Giorgi T, a classmate whose project broke on deployment), and the sign-off. The uncle statement was the one I had actually watched happen more than once, so I pushed for it to stay in the pool when it looked like we would end up with only hospital-waiting problems.

Links: [problem pool](../../00-foundation/problem-pool.md), [team contract](../../00-foundation/team-contract.md)

### Week 2 · Evidence over opinion

I drafted the problem pick, the ICP, the hypothesis v1, the script v1 and the log template in one evening so the team had something to argue with instead of a blank page. My first real interview was a solo phone call on 05.10 with an acquaintance who has seen the same doctor for years: 4 calls over 2 days to ask when to take a new medicine, and "The difficult part was just not knowing." ([log 07](../../01-discovery/interview-logs/07-long-term-patient-clinic.md)). The same day I was first logger for Gocha at the hospital café, who said his regular visits are booked ahead and fine, but after 2 unanswered calls he sat 1.5 hours for 5 minutes, and "waiting is the hard part" ([log 02](../../01-discovery/interview-logs/02-heart-patient-ward.md)). On 06.10 I interviewed my acquaintance who is a polyclinic doctor by phone, with Jumber and Giorgi logging, before the script had been audited, because an un-audited interview with real numbers beat a perfect script with none. It is one of our two interviews from the doctor's side: 22 booked patients and 9 more without an appointment on his last bad Monday, and about two hours past the end of his shift ([log 04](../../01-discovery/interview-logs/04-polyclinic-doctor.md)). I also filled the pool with the teammates' statements, set up the outreach tracker, filed the Gocha, Zura and grandmother logs, wrote the Four Filters scorecard and recorded the verdict. Beyond my lane: all of it is discovery, none of it is code.

Links: [problem hypothesis](../../01-discovery/problem-hypothesis.md), [outreach tracker](../../01-discovery/outreach-tracker.md), [Four Filters scorecard](../../00-foundation/four-filters-scorecard.md)

### Week 3 · Kill your favorite idea

My favorite idea was my own Step 1 belief: ill people cannot get a quick answer from their doctor between visits, so they keep calling or go back in person. It was our first pick, and on 06.10 I let it drop to runner-up when the script was rewritten around travel, appointments and waiting. I followed the pick myself: I swapped my bus driver statement in the pool and my outreach target in the contract for the polyclinic doctor. Then I tested my idea against every log instead of defending it. Verdict: confirmed, but narrowed. 3 of 3 patients with an urgent change kept calling (2, 6 and 4 calls), but only 2 of 3 then went in, only 3 of 5 patients had such a change at all, and questions that are not urgent just wait for the next visit. The "go back in person" half of my idea did not survive log 07. Beyond my lane: all of this is discovery, not code. The hack: my 05.10 interview had been deleted from the repo when the doctor log came in, so I restored it from git history (commit `0ee0125`) as log 07 in the v2 format, adding no new answers, instead of waiting for a new interview.

Links: [log 07](../../01-discovery/interview-logs/07-long-term-patient-clinic.md), [affinity map, Patterns 2 and 5](../../01-discovery/synthesis/affinity-map.md), [DECISIONS.md](../../DECISIONS.md)

### Week 4 · The prototype is the conversation

[TODO 4]

## 3. My DECISIONS.md citations

Each `DECISIONS.md` line you drove or supplied the evidence for. Copy the line exactly, then say what you did.

| The line, copied | What I did for it |
|---|---|
| Wk3 · Prediction "ill people can't get a quick answer between visits, so they keep calling or go in" verdict: confirmed, narrowed to urgent changes between visits; 3/3 patients with such a change kept calling (2, 6 and 4 calls), 2/3 then went in (1.5-2h wait for 3-5 min) and 1 got a callback on day 2; doctor confirms 2-min walk-ins; but only 3/5 patients had one, non-urgent questions wait for the visit, and the block is the phone line/reception, not the doctor · evidence: 01-discovery/interview-logs/02-heart-patient-ward.md, 01-discovery/interview-logs/03-diabetic-polyclinic.md, 01-discovery/interview-logs/07-long-term-patient-clinic.md, 01-discovery/interview-logs/04-polyclinic-doctor.md, 01-discovery/interview-logs/01-grandmother-district-clinic.md, 01-discovery/interview-logs/05-father-clinic.md · owner: Luka Mikautadze | My personal prediction trial: counted every log against my prediction, wrote the verdict and the evidence, and restored log 07, which is part of the evidence. |
| Wk3 · Hypothesis confirmed, with one caveat: all three patients waited 1.5 to 2 hours on their last difficult visit and lost about half a day to it, and the doctor took 31 patients in a day booked for 22 and left two hours late · evidence: [Gocha, 05.10](01-discovery/interview-logs/02-heart-patient-ward.md), [Zura, 05.10](01-discovery/interview-logs/03-diabetic-polyclinic.md), [Beka's grandmother, 05.10](01-discovery/interview-logs/01-grandmother-district-clinic.md), [Luka's acquaintance, a polyclinic doctor, 06.10](01-discovery/interview-logs/04-polyclinic-doctor.md), [scorecard](00-foundation/four-filters-scorecard.md) · owner: LM · caveat: Gocha and Zura only waited that long when they came without an appointment, after calls that went unanswered, so the runner-up stays open | Wrote the verdict line and the matching hypothesis verdict after the team agreed it, with links and numbers checked against the logs. |
| Wk3 · Luka's outreach target in the team contract changed from Giorgi T (a classmate whose project broke on deployment) to his acquaintance, a polyclinic doctor, once the pick moved to clinic visits; the bus driver statement in the pool was replaced by the doctor statement for the same reason · evidence: [team contract](00-foundation/team-contract.md), [problem pool](00-foundation/problem-pool.md), [polyclinic doctor, 06.10](01-discovery/interview-logs/04-polyclinic-doctor.md) · owner: LM | Followed the new pick myself: swapped my bus driver pool statement and my contract outreach target for the polyclinic doctor I then interviewed (log 04). |

---

**Before you upload, check**

- [ ] 2 or more rows say "asked" or "both", and each links a real log in `01-discovery/interview-logs/`.
- [ ] Four journal entries, each with a link. The commit history shows they were written across the weeks, not tonight.
- [ ] Every DECISIONS.md line is copied word for word, and the owner or evidence on it connects to you.
- [ ] Committed from your own GitHub account. Uploaded to the LMS before the deadline.
