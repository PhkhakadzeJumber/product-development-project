# Prototype Plan v2

**Prototype in scope:** The prototype is a clickable design prototype of the MediBook booking flow, drawn in Figma for the Week 5 test using invented example data. It covers five screens: the three patient screens from v1 (finding a doctor, that doctor's available 30-minute blocks with start–end times, and the booking confirmation with the visit in "My visits"), the doctor's full-week timetable, and the reception desk for patients who did not book online. The Figma flow is the test artefact and carries no live clinic data, so each test action can fail or pass on its own. The patient flow and its five-person test are unchanged from v1; v2 adds the doctor and reception-desk walkthroughs so the clinic side of the booking can be tested. The receptionist is the fallback for patients who do not book online and handles schedule exceptions, not the main booking channel. The prototype uses a 30-minute booking unit; it deliberately leaves out queue estimates, delay updates, walk-ins, and everything else.

## 1. The riskiest assumption

> We assume the clinic will run the appointment book on the screen: patients book online; the receptionist guides patients who did not book online to the right doctor and manages schedule exceptions; the doctor checks the week's timetable and closes each visit, instead of the paper book and the corridor.

**Why this one is riskiest:** v1 tested whether a patient will book on a phone instead of calling; v2 tests whether the clinic will run the other end on a screen instead of the paper book and the corridor. The receptionist is the fallback for patients who do not book online, not the main booking channel. Log 04's doctor already runs his day through reception and the corridor — 22 booked plus 9 walk-ins, slots cut from about 15 to under 10 minutes, two hours over — and log 08's receptionist is the booking channel, overloaded when the doctors are. Log 05's father was told the registry book was full for two weeks. If the doctor keeps working from the corridor and the receptionist keeps the paper book, the patient's booking is a dead end, however good the patient screens are. No log tests whether either will switch, so the prototype must. v1's patient test is still the first link; v2 adds the second and third links, not replaces it.

## 2. The one action

> A patient can find a doctor and book a 30-minute appointment online; a receptionist can guide a patient who did not book online to the right doctor and book the same 30-minute block; a doctor can mark the booked visit Seen or No-show on the week timetable.

## 3. Fidelity

| Choice | Why it is the cheapest thing that can kill the assumption | Tool | Time |
|---|---|---|---|
| Patient screens: clickable, phone-sized, v1 flow plus the start–end time | The patient assumption is about tapping on a phone. Paper cannot test a tap; the duration label is the only addition to v1. | Figma prototype, phone frame | Already built for v1; one label per block |
| Staff screens: clickable, desktop-sized, 30-minute blocks | The doctor and receptionist work at a desk; a phone-sized week grid would test the wrong device. A clickable grid is enough to see whether the doctor can find the booking in the week and the receptionist can guide a non-online patient to the right doctor and book. | Figma prototype, 1280px desktop frame | One evening for both staff screens; 30 minutes per staff session |

## 4. Screens, each traced to evidence

| Screen | What the tester does on it | The log or problem-statement sentence that earns it |
|---|---|---|
| 1. Find doctors (patient) | Starts from the doctor list and finds a general practitioner at the demo hospital. | The ICP has one regular doctor at a public clinic; Beka's father had to contact his clinic registry to get an appointment. (ICP; 05) |
| 2. Available 30-minute blocks (patient) | Opens that doctor's available future blocks and chooses one. Each block shows its start and end time (e.g. 10:00–10:30); the last block ends by the doctor's working-hours end. | Beka's father was told the next free slot was two weeks away; regular visits are booked ahead for Gocha and Zura. The prototype lists available future blocks by doctor. (02, 03, 05) |
| 3. Booking confirmation / My visits (patient) | Books the selected block and verifies that the appointment, including its start and end time, appears as booked. | A booked slot should become an appointment; log 05 describes the current in-person booking fallback, while the prototype flow makes booking online possible. (05; prototype booking flow) |
| 4. Week timetable (doctor) | Sees the full week as a timetable, every day across the full 24 hours, with each booked visit occupying its 30-minute block; finds Monday's 10:30–11:00 patient and marks the visit Seen; marks Monday's 11:00–11:30 patient No-show; can say who is next. | Log 04 describes a day run by reception and the corridor — walk-ins sent to his door, booked patients late, 31 patients, two hours over. Log 08 says booked patients wait about 10 minutes while walk-ins wait 40 minutes to an hour or more. Logs 02/03 show 1.5–2-hour waits. The 30-minute block is the prototype's booking unit, not a claim about the doctor's current 10–15 minute pace in log 04. |
| 5. Reception desk (receptionist) | Sees all doctors' specialties and working hours; the normal 30-minute grid is derived from those hours, so she does not create it. Asks about the patient's complaint; routes by specialty and availability, not diagnosis; names the doctors with the closest free blocks; helps the patient choose and books the chosen block; if the patient has no preference, recommends one using professional judgment — specialty, experience, continuity — not a rating screen. She can add an ad-hoc 30-minute block when a doctor agrees, block a generated slot when a doctor is unavailable, or remove an ad-hoc block she added. | Log 04: 9 walk-ins with 2-minute questions sent to the doctor's door; log 08: patients with a question come in person because doctors are rarely free, and reception is overloaded; log 05: 3 days of calls and a 2-week wait; logs 01/02/03: 1.5–2-hour waits. This screen is the reception desk in one place; the test is whether the receptionist can route a patient by complaint and availability, and whether she can explain how she would handle a schedule exception. |

**Will not appear, even if a tool generates it** (list what you expect to be tempted by):
- delay estimates, arrival-time changes, live queue data, medical advice or triage, emergency booking, payment, and automated diagnosis;
- a walk-in queue or walk-in check-in, the patient-side delay banner, doctor questions and renewals, clinical notes, a patient history, management reports, staff accounts, routine slot deletion (an exception block or exception removal is a verbal follow-up, not a main action), doctor management (adding a new doctor is a setup flow, not a v2 screen), hospital profile, a visit dashboard, and role-switching/login screens (each session starts already signed in);
- variable appointment lengths and a doctor rating screen;
- the condition tracker, patient prescriptions, drug catalog, doctor prescription editor, and patient/doctor profiles — parked; the logs support the jobs, not these screens, and they belong to the next loop.

## 5. The test that can fail

### 5.1 The frozen patient test — unchanged from v1

- **Task, read aloud to the tester, word for word:** “You need a routine follow-up appointment. You are already signed in as a patient in this demo. Find a general practitioner at the demo polyclinic in Kutaisi, choose a future available time, and show me when the visit is booked.”
- **Success looks like:** within two minutes and without help, the tester selects a general practitioner, books one future available slot, and points to the booking confirmation or the visit in “My visits.”
- **Failure looks like:** the tester cannot find a general practitioner or available future time; stops before pressing “Book”; or completes the booking but cannot tell whether it succeeded.
- **Decision rule:** if 3 or more of 5 testers fail, do not treat the current booking flow as usable without help. Identify the observed blocker and revise the flow before testing it again; separately validate real clinic availability before claiming that the app can replace clinic calls.
- **Our prediction of the first thing a tester gets wrong:** they will think selecting an available slot completes the booking and leave before pressing “Book.”

### 5.2 The doctor walkthrough — new, 2 testers

- **Task, read aloud:** “It's Monday morning at your clinic. You have a full list and the first patient is already waiting. Show me how you see your week and who is booked today, and what you do after you have seen the 10:30–11:00 patient. Then show me what you would do with the 11:00–11:30 patient who did not come.”
- **Success looks like:** within 90 seconds and without help, the tester opens the week timetable, finds Monday and the 10:30–11:00 patient, marks the visit Seen, marks the 11:00–11:30 patient No-show, and can say who is next.
- **Failure looks like:** the tester looks for the paper list or the e-system; cannot tell who is next; marks the wrong patient; cannot tell whether the change saved; says “I would ask reception to do this”; or says the timetable is useless without the walk-ins.
- **Decision rule:** with 2 doctors this is a signal, not a rate. If both fail, cut the doctor screen back to a read-only timetable and do not add actions. If one fails, fix the observed blocker and retest with one more doctor before the next milestone.
- **Our prediction of the first thing a tester gets wrong:** he will try to open the patient's name to mark the visit, not use the inline Seen button; or he will ask where the walk-ins are, because his real Monday has 9 of them and the timetable shows booked visits only.

### 5.3 The receptionist walkthrough — new, 1 tester

- **Task, read aloud:** “A new patient has come to the reception desk because they did not book online. They have a minor heart question and do not know which doctor to see. Show me how you would guide them to the right doctor and book a time. Then tell me what you would do if Dr. A is unexpectedly unavailable on Thursday afternoon, if Dr. B agrees to stay late and add a 15:00–15:30 block on Wednesday, and if a new doctor joins next week.”
- **Success looks like:** within 90 seconds and without help, the tester asks about the complaint, identifies that Dr. B is a cardiologist and has a free 10:00–10:30 Tuesday block, explains that Dr. C is a GP with a free 09:30–10:00 Wednesday block but is not the right fit for a heart question, offers Dr. B, and books Dr. B after the patient chooses; if the patient has no preference, the tester recommends Dr. B with a reason and books after confirmation. The booking appears in Dr. B's timetable.
- **Failure looks like:** the tester books the first free block without asking about the complaint; assigns Dr. C just because the date is free; cannot see the doctors' specialties or schedules; cannot name the closest free doctors or their blocks; recommends without a reason; books the wrong doctor or time; books a normal patient outside the doctor's working hours without an agreed exception; cannot tell whether it saved; says “I would write it in the paper book”; says “I would call the doctor first”; or says “I only book with the patient's own doctor.”
- **Decision rule:** one session cannot validate a role. If Receptionist-1 cannot complete the task without help, the reception desk is not proven and we do not claim it works; fix the observed blocker and test with a second receptionist before the next milestone. If she can, that is one blocker-free session, not a pass. If she books without asking about the complaint, that is a finding: the screen needs to show the complaint context and doctor specialties. If she says she must call the doctor before assigning another doctor, that is a finding: the receptionist may not have the authority to route patients. If the tester says the patient must see their own doctor, record it as a real constraint, not a screen failure.
- **Our prediction of the first thing a tester gets wrong:** she will pick the earliest free block (Dr. C, Wednesday 09:30–10:00) without matching the complaint; or she will book Dr. B without explaining why; or she will say she has to call the doctor first.

## 6. Testers

| Code name | From log, or new | Who on the team books them |
|---|---|---|
| Patient-1 | Log 03; previously interviewed, monthly visits with the same cardiologist | Giorgi |
| Patient-2 | Log 02; previously interviewed, regular two-weekly heart check-ups | Jumber |
| Patient-3 | Patient-2's referral, also attends the same ward every two weeks; contact pending | Jumber, via his sister |
| Patient-4 | Log 05; previously interviewed, called for three days and booked in person | Beka |
| Patient-5 | Patient-1's referral, sees the same cardiologist on a monthly rhythm; contact pending | Giorgi |
| Doctor-1 | Log 04; GP at the public polyclinic, 22 booked + 9 walk-ins on his worst Monday | Luka |
| Doctor-2 | Log 06; doctor at Kutaisi Central Hospital, short-staffed shifts | Luka |
| Receptionist-1 | Log 08; receptionist at the same polyclinic, the booking channel today | Beka |


