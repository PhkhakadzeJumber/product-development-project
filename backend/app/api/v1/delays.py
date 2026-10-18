"""Running late + check-in.

An appointment does not tell a patient when they will be seen (logs 01, 02, 04),
so the doctor or reception posts today's delay and booked patients see the
expected start time; patients or reception mark arrival.
"""
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.v1.appointments import _appt_out, _check_visit_access
from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.scheduling import Appointment, TimeSlot
from app.models.subtypes import Doctor
from app.models.user_account import UserAccount
from app.schemas.care import DelayOut, DelayUpdate
from app.schemas.scheduling import AppointmentOut
from app.services.care import admin_manages_doctor, check_in, clinic_today, delays_today, set_delay

router = APIRouter(tags=["running-late"])


def _schedule_notify(background: BackgroundTasks) -> None:
    from app.api.v1.clinical import _schedule_notify as schedule
    schedule(background)


@router.get("/doctors/{doctor_id}/delay", response_model=DelayOut)
def get_delay(doctor_id: int, db: Session = Depends(get_db),
              user: UserAccount = Depends(get_current_user)):
    if not db.get(Doctor, doctor_id):
        raise HTTPException(404, "Doctor not found")
    row = delays_today(db, [doctor_id]).get(doctor_id)
    return DelayOut(doctor_id=doctor_id, day=clinic_today(),
                    delay_minutes=row.delay_minutes if row else 0,
                    note=row.note if row else None,
                    updated_at=row.updated_at if row else None)


@router.put("/doctors/{doctor_id}/delay", response_model=DelayOut)
def put_delay(doctor_id: int, data: DelayUpdate, background: BackgroundTasks,
              db: Session = Depends(get_db), user: UserAccount = Depends(get_current_user)):
    role = UserRole(user.role)
    if role == UserRole.DOCTOR and doctor_id != user.user_id:
        raise HTTPException(403, "You can only set your own delay")
    if role == UserRole.HOSPITAL_ADMIN and not admin_manages_doctor(db, user.user_id, doctor_id):
        raise HTTPException(403, "Doctor belongs to another hospital")
    if role == UserRole.PATIENT:
        raise HTTPException(403, "Only the doctor or reception can set a delay")
    row, notified = set_delay(db, doctor_id, data.delay_minutes, data.note, updated_by=user.user_id)
    db.commit()
    db.refresh(row)
    if notified:
        _schedule_notify(background)
    return DelayOut(doctor_id=doctor_id, day=row.day, delay_minutes=row.delay_minutes,
                    note=row.note, updated_at=row.updated_at, patients_notified=notified)


@router.post("/appointments/{appointment_id}/check-in", response_model=AppointmentOut)
def check_in_visit(appointment_id: int, db: Session = Depends(get_db),
                   user: UserAccount = Depends(get_current_user)):
    appt = db.get(Appointment, appointment_id)
    if not appt:
        raise HTTPException(404, "Not found")
    _check_visit_access(appt, user, db)
    check_in(db, appt)
    db.commit()
    db.refresh(appt)
    slot = db.get(TimeSlot, appt.slot_id)
    return _appt_out(appt, slot, delays_today(db, [appt.doctor_id]))
