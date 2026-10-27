# Prototype Test Plan

**Prototype v1 link:** the same link as the Prototype row in the team README; hosted demo so the tester opens it on their own phone (README says coming Week 5 — sessions run from the lab laptop on local Wi-Fi until then)

**Riskiest assumption under test:** We assume a patient seeking a routine visit can independently find a suitable doctor and complete an online booking in MediBook without help.

## The frozen test (copied from `02-design/prototype-plan.md`, section 5, unchanged)

**Task, read aloud word for word:** "You need a routine follow-up appointment. You are already signed in as a patient in this demo. Find a general practitioner at the demo polyclinic in Kutaisi, choose a future available time, and show me when the visit is booked."

**Success:** within two minutes and without help, the tester selects a general practitioner, books one future available slot, and points to the booking confirmation or the visit in "My visits."

**Failure behaviors:**
1. The tester cannot find a general practitioner or available future time.
2. Stops before pressing "Book".
3. Completes the booking but cannot tell whether it succeeded.

**Decision rule (out of 5):** if 3 or more of 5 testers fail, do not treat the current booking flow as usable without help. Identify the observed blocker and revise the flow before testing it again; separately validate real clinic availability before claiming that the app can replace clinic calls.

**Predicted first mistake:** they will think selecting an available slot completes the booking and leave before pressing "Book."

## Five testers

| # | Code name | Role | Why they fit the ICP | Runner | Logger | Target day | Status |
|---|---|---|---|---|---|---|---|
| 1 | Patient-1 | Patient, diabetic 4-5 years | Log 03. Spends too much money and time. | LM | GP | Lab week, Thu | not messaged |

## Session protocol (same every time)

1. The tester opens the link on their own phone. Not yours.
2. The runner reads the task word for word, then says nothing.
3. The logger starts the timer on the last word of the task and writes: time to first tap, time to the one action, every unprompted sentence verbatim.
4. When the tester stops, or at 3 minutes, the runner asks one question only: "What were you expecting to happen?"
5. The logger writes the verdict against the rule before anyone discusses the session.
