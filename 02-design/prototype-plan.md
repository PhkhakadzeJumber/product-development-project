# Prototype Plan

**Prototype in scope:** The current app is a coded, role-based hospital appointment and treatment prototype. Patients can find doctors, view future available slots, book and cancel visits, see prescriptions and treatment history, and message doctors; doctors manage visits and treatment records; hospital admins manage slots and visits. Its backend stores time slots and appointments but has no queue estimate or delay-update feature, so this test focuses on the patient booking flow, not reducing waiting time.

## 1. The riskiest assumption

> We assume a patient seeking a routine visit can independently find a suitable doctor and complete an online booking in MediBook without help.

**Why this one is riskiest:** Beka's father called the registry for three days, closed his garage to book in person, and was given the next available appointment two weeks later (05). In contrast, Gocha's regular appointments are booked ahead without difficulty and Zura books his next visit before leaving (02, 03). The app has a working online booking path, but no log tests whether a patient can complete it without help; this test uses seeded demo doctors and slots, so it tests usability of the flow, not whether patients trust live clinic availability or whether online booking reduces waiting.

## 2. The one action

> A patient can find a doctor and book one of that doctor's available future appointment slots.

## 3. Fidelity

| Choice | Why it is the cheapest thing that can kill the assumption | Tool | Time |
|---|---|---|---|
| Coded, full-stack web prototype | This behavior is already implemented: patients search doctors, view future available slots, book, and see confirmation; the backend records the appointment and changes the slot to booked. Testing the actual app will reveal whether people proceed or hesitate, without building new features. | Existing Next.js app, FastAPI backend, and seeded demo data | One 30-minute session per tester |

## 4. Screens, each traced to evidence

| Screen | What the tester does on it | What earns it |
|---|---|---|
| 1. Find doctors | Starts from the doctor list and finds a general practitioner at the demo hospital. | The ICP has one regular doctor at a public clinic; Beka's father had to contact his clinic registry to get an appointment. (ICP; 05) |
| 2. Available slots | Opens that doctor's available future times and chooses one. | Beka's father was told the next free slot was two weeks away; regular visits are booked ahead for Gocha and Zura. The prototype lists available future slots by doctor. (02, 03, 05) |
| 3. Booking confirmation / My visits | Books the selected slot and verifies that the appointment appears as booked. | A booked slot should become an appointment; log 05 describes the current in-person booking fallback, while the prototype flow makes booking online possible. (05; prototype booking flow) |

**Will not appear in this test task, even if a tool generates them:** delay estimates, arrival-time changes, live queue data, medical advice or triage, emergency booking, payment, and automated diagnosis. Chat, prescriptions, and treatment tracking are already part of the app but are outside this one-action booking test. The current prototype does not calculate or display a queue position or wait estimate.

## 5. The test that can fail

- **Task, read aloud to the tester, word for word:** “You need a routine follow-up appointment. Using this demo account, find a general practitioner at Tbilisi Central Hospital, choose a future available time, and show me when the visit is booked.”
- **Success looks like:** within two minutes and without help, the tester selects a general practitioner, books one future available slot, and points to the booking confirmation or the visit in “My visits.”
- **Failure looks like:** the tester cannot find a general practitioner or available future time; stops before pressing “Book”; or completes the booking but cannot tell whether it succeeded.
- **Decision rule:** if 3 or more of 5 testers fail, do not treat the current booking flow as usable without help. Identify the observed blocker and revise the flow before testing it again; separately validate real clinic availability before claiming that the app can replace clinic calls.
- **Our prediction of the first thing a tester gets wrong:** they will think selecting an available slot completes the booking and leave before pressing “Book.”

## 6. Five testers

| Code name | From log, or new | Books them |
|---|---|---|
| Gocha | Log 02; previously interviewed, regular two-weekly heart check-ups | Jumber |
| Zura | Log 03; previously interviewed, monthly visits with the same cardiologist | Giorgi |
| Father-05 | Log 05; previously interviewed, called for three days and booked in person | Beka |
| Ward-neighbour | New; Gocha's referral, also attends the same ward every two weeks; contact pending | Jumber, via his sister |
| Dato | New; Zura's referral, sees the same cardiologist on a monthly rhythm; contact pending | Giorgi |

**Session setup:** Log in each tester to a patient demo account before starting, explain that the doctors and slots are seeded examples, and use a different available slot for each booking. This avoids testing registration and prevents one tester's booking from consuming the next tester's slot.
