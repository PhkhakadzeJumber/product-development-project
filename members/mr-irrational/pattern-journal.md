# Pattern journal · Giorgi Phurtseladze (@mr-irrational)

## Week 1 · Act like an owner, not a role

My lane in the contract is planning, code and management. I signed it on 05.10 and wrote three statements from things I had watched myself: my neighbour Nani not knowing when a specialist would visit Baghdati and not being able to travel to Tbilisi for it, my friend Ana's week going between the registrar and the department, and my aunt covering a ward alone at Kutaisi Central Hospital. Nani's and Ana's did not make the shortlist and I am fine with that; my aunt's statement is one of the evidence strands in the problem we picked. Owner, not role: outreach was nobody's job, so I put my own neighbour Zura on the third floor into the contract as my target, and he became the interview that produced my prediction.

Links: [problem pool](../../00-foundation/problem-pool.md), [team contract](../../00-foundation/team-contract.md), [Four Filters scorecard](../../00-foundation/four-filters-scorecard.md)

## Week 2 · Evidence over opinion

I asked in two interviews and logged four across Weeks 2 and 3. On 05.10 I interviewed Zura at his flat (log 03), with Beka and Jumber logging. The best thing I did was ask to see his phone: "many calls" became six exact dates in the call log, which is stronger than anything he said. The worst thing I did was ask "would it help if you could message her", which got "of course" and went into the log as red. I logged Beka's grandmother (log 01) and watched for places where Beka answered for her, co-logged Luka's phone interview with the polyclinic doctor (log 04) with Jumber on 06.10, logged Beka's father's booking pain (log 05) on 07.10, and asked my aunt on the ward myself that evening (log 06). On 10.10 I co-logged Jumber's call to the polyclinic receptionist (log 08), the short call that left the callbacks question open. Beyond my lane: all of that is discovery, not planning or code. Hack: I logged the Georgian wording the same night, before translating, so what she actually said survived into the file.

Links: [Zura log](../../01-discovery/interview-logs/03-diabetic-polyclinic.md), [grandmother log](../../01-discovery/interview-logs/01-grandmother-district-clinic.md), [polyclinic doctor log](../../01-discovery/interview-logs/04-polyclinic-doctor.md), [father log](../../01-discovery/interview-logs/05-father-clinic.md), [aunt log](../../01-discovery/interview-logs/06-aunt-hospital.md), [receptionist log](../../01-discovery/interview-logs/08-receptionist-polyclinic.md)

DECISIONS.md line I drove: the [`Wk3 · Prediction "2-min question turns into trip"` verdict](../../DECISIONS.md), which is mine.

## Week 3 · Kill your favorite idea
The two-minute-question idea was mine: a chronic patient cannot reach their own doctor between visits, so a small question turns into a trip. I counted the six logs that existed then (the eighth-log answers arrived after) and wrote the verdict myself instead of defending it — confirmed, but narrowed: logs 02 and 03 hit after 2 and 6 failed calls, log 04 confirms the mechanism from the doctor's side, and 01, 05 and 06 are separate problems. So it survives only for an urgent change, and the block is the reception line, not the doctor. Hack: I tallied the logs before the lab, so the verdict reached the file with the log numbers already on it.

Links: [DECISIONS.md](../../DECISIONS.md), [problem hypothesis](../../01-discovery/problem-hypothesis.md), [Four Filters scorecard](../../00-foundation/four-filters-scorecard.md)

## Week 4 · The prototype is the conversation
I own two of the five testers in the plan: Zura from my own interview, and Dato, the referral he gave me on the same cardiologist. Neither is contacted yet, and Zura's condition for coming back is that we bring something to show him. Outside my lane: I wrote my prediction verdict into [DECISIONS.md](../../DECISIONS.md) and the [problem hypothesis](../../01-discovery/problem-hypothesis.md) before any tester saw anything, so next week can contradict something I wrote down. Hack: I checked the plan's booking action against logs 02, 03 and 05 first, so I know what that test cannot tell us.

Links: [prototype plan](../../02-design/prototype-plan.md), [problem hypothesis](../../01-discovery/problem-hypothesis.md), [DECISIONS.md](../../DECISIONS.md)

## Week 5 · One metric that matters
*Written in Week 7; I did not write it in its own week.* The metric I worked on was the event schema: I added `patient_selects_visit_type` and the visit-type properties so the funnel could show where a booking breaks before the north star, and when booking was cut in Week 6 those events stayed in the schema but out of Sprint 1, so `patient_confirms_remote_resolution` stayed the one number. Beyond my lane, I messaged and booked my two testers, Patient-1 (log 03) and Patient-5 (log 10), and logged both sessions; both booked alone. I also wrote the verdict on my own prediction and said the test did not measure it, because it counted bookings, not trips avoided. Hack: I booked both sessions on the same day, so both logs were written while the sessions were fresh.

Links: [event schema](../../03-build/analytics/event-schema.md), [usability findings](../../02-design/user-testing/usability-findings.md), [DECISIONS.md](../../DECISIONS.md)

## Week 6 · The smallest complete journey
*Written in Week 7; I did not write it in its own week.* I turned the five-step journey into the Sprint 1 plan: one story per step, the north star step first so it could be built on a seeded answer, and a slip rule that keeps the doctor's answer in no matter what, because without step 3 the journey is not complete. When the hours came in, Luka had 7 hours of stories with 5 free and I had 8 with 7, so S1 moved to Beka and S2 dropped to 2 hours: 21 hours inside 25, and inside each person's own. Hack: I wrote "story hours never exceed free hours" into the plan before anyone gave their hours, so cutting was a rule, not an argument.

Links: [Sprint 1](../../03-build/sprints/sprint-1.md), [MVP boundary](../../03-build/mvp-boundary.md)


## Week 7 · Ship to learn
I shipped S2 (Gela finds his own doctor) and S4 (the doctor answers) in one commit, live with the first deploy on 24.11, and on 27.11 walked the whole journey on production with Wi-Fi off while Beka checked every event in PostHog Activity. Beyond my lane, I wrote the gate line in DECISIONS.md, and at the mid-week look, with no dashboard built yet, I read the counts straight from the production database: two real questions from Patient-2 and Patient-3, zero answers. That number is what shipping taught us this week: patients ask within minutes of getting the link, and the slow step is the doctor, so Luka reminded Doctor-1 that two questions were waiting. Hack: before building I checked the real Neon tables with a read-only query instead of waiting for the schema to be written down, and ran both pages against the demo patient and doctor before pushing.

Links: [S2 and S4 commit](https://github.com/PhkhakadzeJumber/product-development-project/commit/3a914df), [Sprint 2](../../03-build/sprints/sprint-2.md), [event schema](../../03-build/analytics/event-schema.md)
