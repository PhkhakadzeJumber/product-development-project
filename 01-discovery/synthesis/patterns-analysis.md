# Patterns Analysis

**Interviews behind the patterns (same numbering as `affinity-map.md`):**
- 01 = `2026-10-05-beka-grandmother-blood-pressure-prescription.md` (72, hypertension, monthly prescription, district clinic)
- 02 = `2026-10-05-gocha-heart-patient-ward.md` (60, heart failure, every-two-weeks ward check)
- 03 = `2026-10-05-zura-diabetic-monthly-cardiologist.md` (diabetic, monthly cardiologist, polyclinic)
- 04 = `2026-10-06-acquaintance-polyclinic-doctor.md` (GP, public polyclinic, Kutaisi)
- 05 = `2026-10-07-beka-father-back-pain-appointment.md` (garage owner, back pain, public clinic)
- 06 = `2026-10-07-giorgi-aunt-central-hospital-doctor.md` (doctor, Kutaisi Central Hospital)

One section per pattern from the affinity map. Each why is answered in one sentence with the log that supports it. Stop when the next answer would be a guess.

## Pattern 1: An appointment does not mean being seen on time — walk-ins taken in gaps push booked patients late

**Interviews behind it:** 01, 02, 03, 04

1. Why does this happen? Reception sends walk-ins to sit outside the door and the doctor takes them in the gaps, so booked patients go in late. (04 logged mechanism; 02 watched three booked patients go in late.)
2. Why do so many come without an appointment? They could not reach the clinic by phone first, so showing up is the fallback. (03: "Nothing happened. It rang. Nobody picked up." — 6 calls over 3 days; 05: "I called three days, nobody picks up."; 02: 2 calls, no callback.)
3. Why does phone contact fail? The doctor is seeing patients and gives out no mobile, so everything funnels via the reception/registry line. (04: does not give out mobile number; 03: mobile refused, "Only that the girl at reception decides everything. If she likes you, she passes the message. If not, nothing.")
4. Why take walk-ins in the gaps at all instead of turning them away? Anyone who looks unwell goes first and there is nobody else to send them to. (04: unwell first; 06: nurses prioritise who looks worst.)

**Root cause, one sentence:** Booked and unbooked demand share one corridor and one doctor with no buffer, so walk-ins that failed to get through by phone are absorbed in the gaps at booked patients' expense.

**Which of the answers above is a guess rather than a quote? (be honest; this becomes a question for your next interview):** Why 4's "nobody else to send them to" is clean in 06 (hospital queue outlasts the shift) but inferred for the polyclinic in 04. Added to script v2: what happens if you refuse a walk-in?

## Pattern 2: When something changes between visits, patients cannot reach the clinic by phone and must come in person

**Interviews behind it:** 02, 03, 05, 04

1. Why does this happen? Lines are busy, ring with no pickup, and give no callback. (03: "Nothing happened. It rang. Nobody picked up."; 05: "I called three days, nobody picks up." — morning and afternoon, ~6 calls; 02: called twice, no callback.)
2. Why does that force a trip? The only fallback offered is showing up. (03, reception as reported: "Why do you keep calling, come in if it's urgent."; 05: "I closed the garage for an hour just to book."; 02 went Monday without an appointment.)
3. Why is there no other channel? Doctor mobiles are withheld and the tried alternatives failed. (04: does not give mobile to avoid evening calls; 03 tried mobile — refused, daughter searched online — nothing useful, 5th-floor nurse — would not comment on dose.)

**Root cause, one sentence:** All between-visit contact funnels through an overloaded reception/registry line with no async fallback, so any change forces a physical trip.

**Which of the answers above is a guess rather than a quote?** "Overloaded" for reception is inferred from call volumes (6 + 6 + 2 unanswered) and 04's 31-patient day, not from a receptionist interview. Next interview: the referred receptionist in 04 — ask her call volume and callback practice.

## Pattern 3: A 3- to 10-minute visit costs half a day, bus fare, and lost work — and repeats every month

**Interviews behind it:** 01, 02, 03, 05

1. Why does this happen? Long travel each way plus a corridor wait buys only minutes with the doctor. (01: 1h bus each way + 2h wait, left unseen; 03: 40 min each way + ~2h wait for 3 minutes; 02: "I sat an hour and a half for five minutes."; 05: 30 min corridor for ~10 minutes.)
2. Why go in person for such short needs? The same repeat prescription and quick dose checks have no remote path. (01: same prescription monthly, "Every month half a day, and this month twice."; 03: "The tablet, you can't wait a month with 3.4." yet still had to come in.)
3. Why does it cost money beyond fare? Companions miss work and earners close up. (02: "My daughter had to miss work to bring me."; 03: "fifty, eighty lari I didn't make, who knows." plus 4 GEL transport and a closed shop morning; 05: "I closed the garage for an hour just to book." plus a lost working morning, and 2 weeks working half-strength: "If the book is full, you wait in pain.")

**Root cause, one sentence:** Routine and short-duration needs require physical presence, so travel plus queue plus lost work repeat on every cycle.

**Which of the answers above is a guess rather than a quote?** "No remote path exists" is supported by 03's three failed routes (mobile refused, internet nothing, nurse silent) and 01 asking Beka to call ahead, but we have not asked the doctor side what a remote renewal would break (e-system entry, examination rule). Next doctor interview: ask what stops a repeat prescription without a visit.

## Pattern 4: Doctors absorb more patients than the day fits by shortening visits and finishing paperwork after hours

**Interviews behind it:** 04, 06

1. Why does this happen? Patient count exceeds slots and staff. (04: 22 booked + 9 walk-in = 31, usual 20–25 booked + 5–8 walk-in; 06: one doctor doing the work of two or three, Saturday 2 → 1 when one called in sick.)
2. Why does the day still run? Slots are cut and paperwork is deferred. (04: ~15 min cut to under 10, notes written next morning, left after 5 with no lunch: "By the afternoon I am rushing people I want to give more time to."; 06: skipped full examinations to triage, postponed discharge papers, 12 hours with one short tea break.)
3. Why does it land on mood, not just hours? Endless demand with no backup turns into exhaustion. (06: "You work tirelessly all day and still leave people waiting."; "Then you go home and think about quitting."; "I liked medicine. I no longer enjoy the job.")

**Root cause, one sentence:** Fixed hours plus open-door walk-ins plus short staffing leave rushing visits and after-hours notes as the only shock absorber.

**Which of the answers above is a guess rather than a quote?** Merging 04 (flow mechanics) and 06 (staffing/exhaustion) into one shock-absorber cause is an inference — each log alone supports its own half. Keep them merged only if the next interviews (receptionist, nurse referrals in 04/06) echo the merge.

---

**Strongest pattern (most interviews, clearest root cause):** Pattern 3 — a 3- to 10-minute visit costs half a day, bus fare, and lost work, and repeats.

**Why it is the strongest, in two sentences, citing log numbers:** Four of six interviews pay it directly (01 monthly same prescription "Every month half a day, and this month twice."; 02 "My daughter had to miss work to bring me."; 03 shop morning "fifty, eighty lari I didn't make" plus 4 GEL for 3 minutes; 05 closed garage plus 2 weeks "in pain"), and its root cause — routine and short needs forcing physical presence — is exactly what the website attacks: remote renewal, async check-in, and booking without the extra trip.
