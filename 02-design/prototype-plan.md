# Prototype Plan

**Prototype in scope:** The prototype is a clickable design prototype of the MediBook booking flow, drawn in Figma for the Week 5 test using invented example data. It covers three screens: finding a doctor, that doctor's available future slots, and the booking confirmation with the visit in "My visits." A working build already exists in `app/` and `backend/`, but it is not used for this test — the Figma flow is the test artefact and carries no live clinic data, so the one action can fail or pass on its own. Booking is where the pain sits for one of our interviewees (05), who called the registry for three days and closed his garage to book in person, so this test covers only the patient booking flow; it deliberately leaves out queue estimates, delay updates, and everything else.

## 1. The riskiest assumption

> We assume a patient seeking a routine visit can independently find a suitable doctor and complete an online booking in MediBook without help.

**Why this one is riskiest:** Beka's father called the registry for three days, closed his garage to book in person, and was given the next available appointment two weeks later (05). In contrast, Gocha's regular appointments are booked ahead without difficulty and Zura books his next visit before leaving (02, 03). No log yet tests whether a patient can complete an online booking without help, so this prototype tests whether the flow itself is clear enough to follow — not whether patients trust real clinic availability or whether online booking reduces waiting.

## 2. The one action

> A patient can find a doctor and book one of that doctor's available future appointment slots.

## 3. Fidelity

| Choice | Why it is the cheapest thing that can kill the assumption | Tool | Time |
|---|---|---|---|
| Clickable design prototype (no code) | The flow is three screens, so drawing them is the cheapest way to watch whether a patient can find a doctor and press "Book" without help — before we write any backend or commit to seeded data. | Figma (prototype mode, free plan) | One 30-minute build; one 30-minute session per tester |

## 4. Screens, each traced to evidence

| Screen | What the tester does on it | What earns it |
|---|---|---|
| 1. Find doctors | Starts from the doctor list and finds a general practitioner at the demo hospital. | The ICP has one regular doctor at a public clinic; Beka's father had to contact his clinic registry to get an appointment. (ICP; 05) |
| 2. Available slots | Opens that doctor's available future times and chooses one. | Beka's father was told the next free slot was two weeks away; regular visits are booked ahead for Gocha and Zura. The prototype lists available future slots by doctor. (02, 03, 05) |
| 3. Booking confirmation / My visits | Books the selected slot and verifies that the appointment appears as booked. | A booked slot should become an appointment; log 05 describes the current in-person booking fallback, while the prototype flow makes booking online possible. (05; prototype booking flow) |

**Will not appear in this test task, even if a tool generates them:** delay estimates, arrival-time changes, live queue data, medical advice or triage, emergency booking, payment, and automated diagnosis. Chat, prescriptions, and treatment tracking belong to later iterations and are outside this one-action booking test. This prototype shows no queue position or wait estimate.

## 5. The test that can fail

- **Task, read aloud to the tester, word for word:** “You need a routine follow-up appointment. You are already signed in as a patient in this demo. Find a general practitioner at the demo polyclinic in Kutaisi, choose a future available time, and show me when the visit is booked.”
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

**Session setup:** Open the prototype at screen 1 (Find doctors) before each session, explain that the doctors and slots are invented examples, and use a different available slot for each tester (or reset the prototype between sessions). This avoids testing registration and prevents one tester's booking from consuming the next tester's slot.
