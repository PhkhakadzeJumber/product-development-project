"""Between-visit care logic: running late + check-in, prescription renewals,
patient questions, and the appointment waitlist.

Routers stay thin; every rule lives here so it can be tested without HTTP.
All functions flush but never commit — the caller owns the transaction, and
notification rows are written in that same transaction (see notifications.py).
"""
from datetime import date, datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.care import DoctorDelay, PatientQuestion, PrescriptionRenewal, WaitlistEntry
from app.models.clinical import Drug, Prescription, TreatmentCase
from app.models.enums import (
    AppointmentStatus, CaseStatus, PrescriptionStatus, QuestionStatus, RenewalStatus,
    SlotStatus, WaitlistStatus,
)
from app.models.scheduling import Appointment, TimeSlot
from app.models.subtypes import Doctor, DoctorHospital, HospitalAdmin
from app.services.booking import _as_utc
from app.services.notifications import enqueue_patient_message


# --- time helpers ------------------------------------------------------------

def clinic_tz() -> timezone:
    return timezone(timedelta(hours=settings.CLINIC_UTC_OFFSET_HOURS))


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def clinic_day(dt: datetime) -> date:
    return _as_utc(dt).astimezone(clinic_tz()).date()


def clinic_today() -> date:
    return now_utc().astimezone(clinic_tz()).date()


def fmt_clinic_time(dt: datetime) -> str:
    return _as_utc(dt).astimezone(clinic_tz()).strftime("%H:%M")


def fmt_clinic_datetime(dt: datetime) -> str:
    return _as_utc(dt).astimezone(clinic_tz()).strftime("%a %d %b, %H:%M")


def doctor_name(doctor: Doctor | None, doctor_id: int) -> str:
    return f"{doctor.first_name} {doctor.last_name}" if doctor else f"#{doctor_id}"


def admin_manages_doctor(db: Session, admin_id: int, doctor_id: int) -> bool:
    """Same hospital scoping rule the slots/visits endpoints use."""
    admin = db.get(HospitalAdmin, admin_id)
    doctor = db.get(Doctor, doctor_id)
    if not admin or not doctor:
        return False
    if doctor.hospital_id == admin.hospital_id:
        return True
    return db.query(DoctorHospital).filter_by(
        doctor_id=doctor_id, hospital_id=admin.hospital_id).first() is not None


# --- 1. running late + check-in ----------------------------------------------

def delays_today(db: Session, doctor_ids: list[int]) -> dict[int, DoctorDelay]:
    if not doctor_ids:
        return {}
    rows = db.query(DoctorDelay).filter(DoctorDelay.doctor_id.in_(doctor_ids),
                                        DoctorDelay.day == clinic_today()).all()
    return {r.doctor_id: r for r in rows}


def appointment_timing(appt: Appointment, slot: TimeSlot | None,
                       delays: dict[int, DoctorDelay]) -> dict:
    """Delay + expected start for a SCHEDULED visit happening today."""
    out = {"delay_minutes": 0, "expected_start": None,
           "checked_in_at": appt.checked_in_at}
    if appt.status != AppointmentStatus.SCHEDULED or not slot or clinic_day(slot.start_time) != clinic_today():
        return out
    row = delays.get(appt.doctor_id)
    minutes = row.delay_minutes if row else 0
    out["delay_minutes"] = minutes
    out["expected_start"] = _as_utc(slot.start_time) + timedelta(minutes=minutes)
    return out


def _todays_upcoming_visits(db: Session, doctor_id: int) -> list[tuple[Appointment, TimeSlot]]:
    """Scheduled visits today that have not started (by the clock) more than an hour ago."""
    cutoff = now_utc() - timedelta(hours=1)
    rows = (db.query(Appointment, TimeSlot)
            .join(TimeSlot, TimeSlot.slot_id == Appointment.slot_id)
            .filter(Appointment.doctor_id == doctor_id,
                    Appointment.status == AppointmentStatus.SCHEDULED)
            .all())
    today = clinic_today()
    return [(a, s) for a, s in rows
            if clinic_day(s.start_time) == today and _as_utc(s.start_time) >= cutoff]


def set_delay(db: Session, doctor_id: int, minutes: int, note: str | None,
              updated_by: int) -> tuple[DoctorDelay, int]:
    """Set today's delay. Notifies today's booked patients when the delay is
    big enough and has moved enough since they were last told. Returns
    (row, number of patients notified)."""
    doctor = db.get(Doctor, doctor_id)
    if not doctor:
        raise HTTPException(404, "Doctor not found")
    today = clinic_today()
    row = db.query(DoctorDelay).filter_by(doctor_id=doctor_id, day=today).first()
    if not row:
        row = DoctorDelay(doctor_id=doctor_id, day=today, delay_minutes=0, notified_minutes=0)
        db.add(row)
    row.delay_minutes = minutes
    row.note = (note or "").strip() or None
    row.updated_by = updated_by
    row.updated_at = now_utc()

    floor, step = settings.DELAY_NOTIFY_MIN_MINUTES, settings.DELAY_RENOTIFY_STEP_MINUTES
    told = row.notified_minutes or 0
    running_late = minutes >= floor and abs(minutes - told) >= step
    back_on_time = minutes < floor and told >= floor
    notified = 0
    if running_late or back_on_time:
        name = doctor_name(doctor, doctor_id)
        for appt, slot in _todays_upcoming_visits(db, doctor_id):
            at = fmt_clinic_time(slot.start_time)
            if running_late:
                expected = fmt_clinic_time(_as_utc(slot.start_time) + timedelta(minutes=minutes))
                head = f"Dr. {name} is running about {minutes} minutes late today."
                body = f"{head} Your {at} visit is now expected to start around {expected}."
            else:
                head = f"Dr. {name} is back on schedule."
                body = f"{head} Your {at} visit is expected to start on time."
            notified += 1 if enqueue_patient_message(
                db, patient_id=appt.patient_id, kind="delay",
                subject="Your doctor is running late" if running_late else "Your doctor is back on schedule",
                email_body=body + "\n\nYour place in the queue does not change.",
                sms_body=body) else 0
        row.notified_minutes = minutes
    db.flush()
    return row, notified


def check_in(db: Session, appt: Appointment) -> Appointment:
    if appt.status != AppointmentStatus.SCHEDULED:
        raise HTTPException(409, "Only scheduled visits can be checked in")
    slot = db.get(TimeSlot, appt.slot_id)
    if not slot or clinic_day(slot.start_time) != clinic_today():
        raise HTTPException(409, "Check-in opens on the day of the visit")
    if appt.checked_in_at is None:
        appt.checked_in_at = now_utc()
        db.flush()
    return appt


# --- 2. prescription renewals ------------------------------------------------

def _case_allows_renewal(db: Session, rx: Prescription) -> None:
    case = db.get(TreatmentCase, rx.treatment_id)
    if case is not None and case.status not in (CaseStatus.OPEN, CaseStatus.IN_TREATMENT):
        raise HTTPException(409, "This treatment case is closed. Book a visit to restart it.")


def request_renewal(db: Session, rx: Prescription, patient_id: int, note: str | None) -> PrescriptionRenewal:
    if rx.patient_id != patient_id:
        raise HTTPException(404, "Prescription not found")
    if rx.status == PrescriptionStatus.DISCONTINUED:
        raise HTTPException(409, "Your doctor stopped this drug. Ask them before taking it again.")
    _case_allows_renewal(db, rx)
    pending = db.query(PrescriptionRenewal).filter_by(
        prescription_id=rx.prescription_id, status=RenewalStatus.PENDING.value).first()
    if pending:
        raise HTTPException(409, "A renewal request for this prescription is already waiting")
    ren = PrescriptionRenewal(prescription_id=rx.prescription_id, patient_id=patient_id,
                              doctor_id=rx.doctor_id, status=RenewalStatus.PENDING.value,
                              patient_note=(note or "").strip() or None)
    db.add(ren)
    db.flush()
    return ren


def _own_pending_renewal(ren: PrescriptionRenewal | None, doctor_id: int) -> PrescriptionRenewal:
    if not ren or ren.doctor_id != doctor_id:
        raise HTTPException(404, "Renewal request not found")
    if ren.status != RenewalStatus.PENDING.value:
        raise HTTPException(409, "This request was already decided")
    return ren


def approve_renewal(db: Session, ren: PrescriptionRenewal | None, doctor_id: int,
                    days: int | None, doctor_note: str | None) -> tuple[PrescriptionRenewal, Prescription]:
    """Issue a new prescription that supersedes the old one (history kept)."""
    ren = _own_pending_renewal(ren, doctor_id)
    old = db.get(Prescription, ren.prescription_id)
    if not old:
        raise HTTPException(404, "Prescription not found")
    if old.status == PrescriptionStatus.DISCONTINUED:
        raise HTTPException(409, "This prescription was stopped; prescribe again from the case instead")
    _case_allows_renewal(db, old)
    today = clinic_today()
    new = Prescription(consultation_id=old.consultation_id, treatment_id=old.treatment_id,
                       patient_id=old.patient_id, doctor_id=doctor_id, drug_id=old.drug_id,
                       dosage=old.dosage, frequency=old.frequency, route=old.route,
                       start_date=today, end_date=today + timedelta(days=days) if days else None,
                       duration_note=old.duration_note, instructions=old.instructions,
                       status=PrescriptionStatus.ACTIVE, supersedes_id=old.prescription_id)
    if old.status == PrescriptionStatus.ACTIVE:
        old.status = PrescriptionStatus.COMPLETED
        old.completed_at = now_utc()
    db.add(new)
    db.flush()
    ren.status = RenewalStatus.APPROVED.value
    ren.new_prescription_id = new.prescription_id
    ren.doctor_note = (doctor_note or "").strip() or None
    ren.decided_at = now_utc()
    db.flush()
    return ren, new


def decline_renewal(db: Session, ren: PrescriptionRenewal | None, doctor_id: int,
                    doctor_note: str | None) -> PrescriptionRenewal:
    ren = _own_pending_renewal(ren, doctor_id)
    ren.status = RenewalStatus.DECLINED.value
    ren.doctor_note = (doctor_note or "").strip() or None
    ren.decided_at = now_utc()
    rx = db.get(Prescription, ren.prescription_id)
    drug = db.get(Drug, rx.drug_id) if rx else None
    doctor = db.get(Doctor, doctor_id)
    head = (f"Dr. {doctor_name(doctor, doctor_id)} could not renew "
            f"{drug.name if drug else 'your prescription'} without seeing you.")
    enqueue_patient_message(
        db, patient_id=ren.patient_id, kind="renewal", subject="About your renewal request",
        email_body=f"{head}\n\nOpen MediBook to read the doctor's note and book a visit. "
                   "Do not stop treatment on your own.",
        sms_body=f"{head} Open MediBook to read the note and book a visit.",
        prescription_id=ren.prescription_id)
    db.flush()
    return ren


def cancel_renewal(db: Session, ren: PrescriptionRenewal | None, patient_id: int) -> PrescriptionRenewal:
    if not ren or ren.patient_id != patient_id:
        raise HTTPException(404, "Renewal request not found")
    if ren.status != RenewalStatus.PENDING.value:
        raise HTTPException(409, "This request was already decided")
    ren.status = RenewalStatus.CANCELLED.value
    ren.decided_at = now_utc()
    db.flush()
    return ren


# --- 3. patient questions ----------------------------------------------------

def doctor_patient_pair_exists(db: Session, doctor_id: int, patient_id: int) -> bool:
    return db.query(Appointment).filter(
        Appointment.doctor_id == doctor_id, Appointment.patient_id == patient_id,
        Appointment.status != AppointmentStatus.CANCELLED).first() is not None


def ask_question(db: Session, patient_id: int, doctor_id: int, body: str, urgency: str,
                 treatment_id: int | None) -> PatientQuestion:
    doctor = db.get(Doctor, doctor_id)
    if not doctor or not doctor.is_active:
        raise HTTPException(404, "Doctor not found")
    if not doctor.questions_open:
        raise HTTPException(409, f"Dr. {doctor_name(doctor, doctor_id)} is not taking questions right now. "
                                 "Call the clinic or book a visit.")
    if not doctor_patient_pair_exists(db, doctor_id, patient_id):
        raise HTTPException(403, "You can only ask a doctor you have a visit with")
    if treatment_id is not None:
        case = db.get(TreatmentCase, treatment_id)
        if not case or case.patient_id != patient_id or case.doctor_id != doctor_id:
            raise HTTPException(409, "Treatment case does not belong to you and this doctor")
    open_count = db.query(PatientQuestion).filter_by(
        patient_id=patient_id, doctor_id=doctor_id, status=QuestionStatus.OPEN.value).count()
    if open_count >= settings.MAX_OPEN_QUESTIONS_PER_DOCTOR:
        raise HTTPException(409, "You already have questions waiting for this doctor. "
                                 "Wait for an answer or close one first.")
    q = PatientQuestion(patient_id=patient_id, doctor_id=doctor_id, treatment_id=treatment_id,
                        urgency=urgency, body=body.strip(), status=QuestionStatus.OPEN.value)
    db.add(q)
    db.flush()
    return q


def answer_question(db: Session, q: PatientQuestion | None, doctor_id: int, answer: str) -> PatientQuestion:
    if not q or q.doctor_id != doctor_id:
        raise HTTPException(404, "Question not found")
    if q.status != QuestionStatus.OPEN.value:
        raise HTTPException(409, "Only open questions can be answered")
    now = now_utc()
    q.answer = answer.strip()
    q.status = QuestionStatus.ANSWERED.value
    q.answered_at = now
    q.doctor_seen_at = q.doctor_seen_at or now
    doctor = db.get(Doctor, doctor_id)
    head = f"Dr. {doctor_name(doctor, doctor_id)} answered your question."
    # The answer itself stays in the app: SMS/email bodies never carry clinical text.
    enqueue_patient_message(db, patient_id=q.patient_id, kind="question_answered",
                            subject="Your doctor answered your question",
                            email_body=f"{head}\n\nOpen MediBook > Questions to read it.",
                            sms_body=f"{head} Open MediBook > Questions to read it.")
    db.flush()
    return q


def question_due_by(q: PatientQuestion, doctor: Doctor | None) -> datetime | None:
    if q.created_at is None:
        return None
    hours = doctor.reply_within_hours if doctor else 48
    return _as_utc(q.created_at) + timedelta(hours=hours)


# --- 4. waitlist ---------------------------------------------------------------

def hold_active(slot: TimeSlot, at: datetime | None = None) -> bool:
    if slot.held_for_patient_id is None or slot.held_until is None:
        return False
    return _as_utc(slot.held_until) > (at or now_utc())


def _clear_hold(slot: TimeSlot | None) -> None:
    if slot is not None:
        slot.held_for_patient_id = None
        slot.held_until = None


def offer_slot(db: Session, slot: TimeSlot, exclude_patient_ids: set[int] | None = None) -> WaitlistEntry | None:
    """Offer a free future slot to the first matching patient on its doctor's waitlist."""
    now = now_utc()
    if slot.status != SlotStatus.AVAILABLE or _as_utc(slot.start_time) <= now or hold_active(slot, now):
        return None
    exclude = exclude_patient_ids or set()
    day = clinic_day(slot.start_time)
    waiting = (db.query(WaitlistEntry)
               .filter_by(doctor_id=slot.doctor_id, status=WaitlistStatus.WAITING.value)
               .order_by(WaitlistEntry.created_at, WaitlistEntry.entry_id).all())
    for entry in waiting:
        if entry.patient_id in exclude:
            continue
        if entry.wanted_before is not None and day > entry.wanted_before:
            continue
        if _has_visit_by(db, entry.patient_id, slot.doctor_id, slot.start_time):
            continue  # already booked at or before this time: no point offering
        expires = min(now + timedelta(minutes=settings.WAITLIST_HOLD_MINUTES), _as_utc(slot.start_time))
        entry.status = WaitlistStatus.OFFERED.value
        entry.offered_slot_id = slot.slot_id
        entry.offered_at = now
        entry.offer_expires_at = expires
        slot.held_for_patient_id = entry.patient_id
        slot.held_until = expires
        doctor = db.get(Doctor, slot.doctor_id)
        head = f"An earlier visit with Dr. {doctor_name(doctor, slot.doctor_id)} opened: {fmt_clinic_datetime(slot.start_time)}."
        tail = f"It is held for you until {fmt_clinic_time(expires)}. Open MediBook > My visits to take it."
        enqueue_patient_message(db, patient_id=entry.patient_id, kind="waitlist_offer",
                                subject="An earlier visit is available",
                                email_body=f"{head}\n\n{tail}", sms_body=f"{head} {tail}")
        db.flush()
        return entry
    return None


def _has_visit_by(db: Session, patient_id: int, doctor_id: int, start: datetime) -> bool:
    rows = (db.query(TimeSlot.start_time)
            .join(Appointment, Appointment.slot_id == TimeSlot.slot_id)
            .filter(Appointment.patient_id == patient_id, Appointment.doctor_id == doctor_id,
                    Appointment.status == AppointmentStatus.SCHEDULED).all())
    limit = _as_utc(start)
    now = now_utc()
    return any(now < _as_utc(r[0]) <= limit for r in rows)


def expire_offers(db: Session, doctor_id: int | None = None) -> int:
    """Lazy expiry: lapsed offers go back to WAITING and the slot moves on."""
    q = db.query(WaitlistEntry).filter_by(status=WaitlistStatus.OFFERED.value)
    if doctor_id is not None:
        q = q.filter_by(doctor_id=doctor_id)
    now = now_utc()
    expired = 0
    for entry in q.all():
        if entry.offer_expires_at is None or _as_utc(entry.offer_expires_at) > now:
            continue
        slot = db.get(TimeSlot, entry.offered_slot_id) if entry.offered_slot_id else None
        if slot is not None and slot.held_for_patient_id == entry.patient_id:
            _clear_hold(slot)
        _reset_offer(entry)
        expired += 1
        db.flush()
        if slot is not None:
            offer_slot(db, slot, exclude_patient_ids={entry.patient_id})
    return expired


def _reset_offer(entry: WaitlistEntry) -> None:
    entry.status = WaitlistStatus.WAITING.value
    entry.offered_slot_id = None
    entry.offered_at = None
    entry.offer_expires_at = None


def join_waitlist(db: Session, patient_id: int, doctor_id: int, wanted_before: date | None,
                  note: str | None) -> WaitlistEntry:
    doctor = db.get(Doctor, doctor_id)
    if not doctor or not doctor.is_active:
        raise HTTPException(404, "Doctor not found")
    if wanted_before is not None and wanted_before < clinic_today():
        raise HTTPException(422, "The 'before' date is already in the past")
    active = db.query(WaitlistEntry).filter(
        WaitlistEntry.patient_id == patient_id, WaitlistEntry.doctor_id == doctor_id,
        WaitlistEntry.status.in_([WaitlistStatus.WAITING.value, WaitlistStatus.OFFERED.value])).first()
    if active:
        raise HTTPException(409, "You are already on this doctor's waitlist")
    entry = WaitlistEntry(patient_id=patient_id, doctor_id=doctor_id, wanted_before=wanted_before,
                          note=(note or "").strip() or None, status=WaitlistStatus.WAITING.value)
    db.add(entry)
    db.flush()
    return entry


def _own_entry(entry: WaitlistEntry | None, patient_id: int) -> WaitlistEntry:
    if not entry or entry.patient_id != patient_id:
        raise HTTPException(404, "Waitlist entry not found")
    return entry


def accept_offer(db: Session, entry: WaitlistEntry | None, patient_id: int) -> WaitlistEntry:
    from app.services.booking import book_appointment
    entry = _own_entry(entry, patient_id)
    expire_offers(db, entry.doctor_id)
    if entry.status != WaitlistStatus.OFFERED.value or entry.offered_slot_id is None:
        raise HTTPException(409, "This offer has expired or was already used")
    appt = book_appointment(db, patient_id=patient_id, slot_id=entry.offered_slot_id,
                            reason=entry.note or "Earlier visit from the waitlist")
    # book_appointment settles the hold and marks this entry BOOKED.
    db.flush()
    return entry if entry.appointment_id else _mark_booked(entry, appt)


def _mark_booked(entry: WaitlistEntry, appt: Appointment) -> WaitlistEntry:
    entry.status = WaitlistStatus.BOOKED.value
    entry.appointment_id = appt.appointment_id
    entry.offer_expires_at = None
    return entry


def decline_offer(db: Session, entry: WaitlistEntry | None, patient_id: int) -> WaitlistEntry:
    """Keep waiting for a different time; the slot goes to the next patient."""
    entry = _own_entry(entry, patient_id)
    if entry.status != WaitlistStatus.OFFERED.value:
        raise HTTPException(409, "There is no open offer to decline")
    slot = db.get(TimeSlot, entry.offered_slot_id) if entry.offered_slot_id else None
    if slot is not None and slot.held_for_patient_id == patient_id:
        _clear_hold(slot)
    _reset_offer(entry)
    db.flush()
    if slot is not None:
        offer_slot(db, slot, exclude_patient_ids={patient_id})
    return entry


def leave_waitlist(db: Session, entry: WaitlistEntry | None, patient_id: int) -> WaitlistEntry:
    entry = _own_entry(entry, patient_id)
    if entry.status not in (WaitlistStatus.WAITING.value, WaitlistStatus.OFFERED.value):
        raise HTTPException(409, "This waitlist entry is already closed")
    slot = db.get(TimeSlot, entry.offered_slot_id) if entry.offered_slot_id else None
    if slot is not None and slot.held_for_patient_id == patient_id:
        _clear_hold(slot)
    entry.status = WaitlistStatus.CANCELLED.value
    entry.offer_expires_at = None
    db.flush()
    if slot is not None:
        offer_slot(db, slot, exclude_patient_ids={patient_id})
    return entry


def settle_hold_on_booking(db: Session, slot: TimeSlot, patient_id: int, appt: Appointment) -> None:
    """Called by book_appointment once a slot is taken.

    - holder booked it (from the offer or straight from the slots page): entry BOOKED
    - someone else booked an expired hold: the holder goes back to WAITING
    """
    holder = slot.held_for_patient_id
    if holder is not None:
        entry = db.query(WaitlistEntry).filter_by(
            patient_id=holder, offered_slot_id=slot.slot_id, status=WaitlistStatus.OFFERED.value).first()
        if entry is not None:
            if holder == patient_id:
                _mark_booked(entry, appt)
            else:
                _reset_offer(entry)
    _clear_hold(slot)
