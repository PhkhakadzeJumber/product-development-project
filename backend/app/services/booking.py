from datetime import datetime, timezone
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.enums import AppointmentStatus, SlotStatus
from app.models.scheduling import Appointment, TimeSlot


def _as_utc(dt):
    """Coerce slot timestamps to aware UTC for cutoff comparisons.

    Postgres timestamptz comes back aware; SQLite / naive inputs come back
    naive (stored as UTC). Treat naive as UTC so past-vs-future math is stable.
    """
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def book_appointment(db: Session, patient_id: int, slot_id: int, reason: str | None) -> Appointment:
    # One transaction: lock slot row, check AVAILABLE, insert, mark BOOKED.
    slot = db.execute(select(TimeSlot).where(TimeSlot.slot_id == slot_id).with_for_update()).scalar_one_or_none()
    if not slot:
        raise HTTPException(404, "Slot not found")
    if slot.status != SlotStatus.AVAILABLE:
        raise HTTPException(409, "Slot not available")
    start_utc = _as_utc(slot.start_time)
    if start_utc is not None and start_utc <= datetime.now(timezone.utc):
        raise HTTPException(409, "This time slot has already passed. Please choose a future time.")
    appt = Appointment(slot_id=slot_id, doctor_id=slot.doctor_id, patient_id=patient_id,
                       status=AppointmentStatus.SCHEDULED, reason=reason)
    db.add(appt)
    slot.status = SlotStatus.BOOKED
    db.flush()
    return appt


def cancel_appointment(db: Session, appt: Appointment, cancelled_by: str, reason: str | None) -> Appointment:
    if appt.status != AppointmentStatus.SCHEDULED:
        raise HTTPException(409, "Only SCHEDULED appointments can be cancelled")
    slot = db.get(TimeSlot, appt.slot_id)
    # Cutoff rule for patients
    if cancelled_by == "PATIENT" and slot:
        now = datetime.now(timezone.utc)
        start = _as_utc(slot.start_time)
        if start is not None:
            hours_left = (start - now).total_seconds() / 3600
            if hours_left < settings.CANCEL_CUTOFF_HOURS:
                if hours_left < 0:
                    raise HTTPException(409, "This visit has already started or passed and cannot be cancelled")
                raise HTTPException(409, "Cancellation cutoff passed")
    appt.status = AppointmentStatus.CANCELLED
    appt.cancelled_at = datetime.now(timezone.utc)
    appt.cancelled_by = cancelled_by  # type: ignore
    appt.cancel_reason = reason
    if slot:
        slot.status = SlotStatus.AVAILABLE
    db.flush()
    return appt
