from fastapi import APIRouter, Depends, HTTPException 
from sqlalchemy.orm import Session  

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.enums import AppointmentStatus, UserRole
from app.models.scheduling import Appointment
from app.models.subtypes import Doctor, HospitalAdmin
from app.models.user_account import UserAccount
from app.schemas.scheduling import AppointmentCancel, AppointmentCreate, AppointmentDetailOut, AppointmentOut
from app.services.booking import book_appointment, cancel_appointment

router = APIRouter(tags=["appointments"])


def _appt_out(a: Appointment, s=None) -> dict:
    return {
        "appointment_id": a.appointment_id,
        "slot_id": a.slot_id,
        "doctor_id": a.doctor_id,
        "patient_id": a.patient_id,
        "status": a.status,
        "reason": a.reason,
        "start_time": s.start_time if s else None,
        "end_time": s.end_time if s else None,
        "consultation_mode": s.consultation_mode if s else None,
    }


@router.post("/appointments", response_model=AppointmentOut)
def create_appointment(data: AppointmentCreate, db: Session = Depends(get_db),
                       user: UserAccount = Depends(get_current_user)):
    from app.models.scheduling import TimeSlot
    if UserRole(user.role) != UserRole.PATIENT:
        raise HTTPException(403, "Only patients book appointments")
    try:
        appt = book_appointment(db, patient_id=user.user_id, slot_id=data.slot_id, reason=data.reason)
        db.commit()
    except Exception:
        db.rollback()
        raise
    db.refresh(appt)
    slot = db.get(TimeSlot, appt.slot_id)
    return _appt_out(appt, slot)


@router.get("/appointments/mine", response_model=list[AppointmentOut])
def my_appointments(db: Session = Depends(get_db), user: UserAccount = Depends(get_current_user)):
    from app.models.scheduling import TimeSlot
    role = UserRole(user.role)
    q = db.query(Appointment)
    if role == UserRole.PATIENT:
        q = q.filter_by(patient_id=user.user_id)
    elif role == UserRole.DOCTOR:
        q = q.filter_by(doctor_id=user.user_id)
    elif role == UserRole.HOSPITAL_ADMIN:
        admin = db.get(HospitalAdmin, user.user_id)
        doc_ids = [d.doctor_id for d in db.query(Doctor).filter_by(hospital_id=admin.hospital_id).all()] if admin else []
        q = q.filter(Appointment.doctor_id.in_(doc_ids)) if doc_ids else q.filter(False)
    rows = q.order_by(Appointment.booked_at.desc()).limit(200).all()
    slot_ids = list({a.slot_id for a in rows})
    slots = {s.slot_id: s for s in db.query(TimeSlot).filter(TimeSlot.slot_id.in_(slot_ids)).all()} if slot_ids else {}
    return [_appt_out(a, slots.get(a.slot_id)) for a in rows]


def _check_visit_access(appt: Appointment, user: UserAccount, db: Session) -> None:
    role = UserRole(user.role)
    if role == UserRole.PATIENT and appt.patient_id != user.user_id:
        raise HTTPException(403, "Not your appointment")
    if role == UserRole.DOCTOR and appt.doctor_id != user.user_id:
        raise HTTPException(403, "Not your appointment")
    if role == UserRole.HOSPITAL_ADMIN:
        admin = db.get(HospitalAdmin, user.user_id)
        doctor = db.get(Doctor, appt.doctor_id)
        if not admin or not doctor or doctor.hospital_id != admin.hospital_id:
            raise HTTPException(403, "Not your hospital's visit")


@router.get("/appointments/{appointment_id}", response_model=AppointmentDetailOut)
def get_appointment(appointment_id: int, db: Session = Depends(get_db),
                    user: UserAccount = Depends(get_current_user)):
    from app.models.clinical import Consultation
    from app.models.scheduling import TimeSlot
    from app.models.subtypes import Doctor, Patient
    appt = db.get(Appointment, appointment_id)
    if not appt:
        raise HTTPException(404, "Not found")
    _check_visit_access(appt, user, db)
    slot = db.get(TimeSlot, appt.slot_id)
    doctor = db.get(Doctor, appt.doctor_id)
    patient = db.get(Patient, appt.patient_id)
    consult = db.query(Consultation).filter_by(appointment_id=appt.appointment_id).first()
    return {
        "appointment_id": appt.appointment_id,
        "slot_id": appt.slot_id,
        "doctor_id": appt.doctor_id,
        "patient_id": appt.patient_id,
        "status": appt.status,
        "reason": appt.reason,
        "booked_at": appt.booked_at,
        "cancelled_at": appt.cancelled_at,
        "cancelled_by": appt.cancelled_by,
        "cancel_reason": appt.cancel_reason,
        "start_time": slot.start_time if slot else None,
        "end_time": slot.end_time if slot else None,
        "consultation_mode": slot.consultation_mode if slot else None,
        "doctor_first_name": doctor.first_name if doctor else None,
        "doctor_last_name": doctor.last_name if doctor else None,
        "doctor_photo_url": doctor.photo_url if doctor else None,
        "patient_first_name": patient.first_name if patient else None,
        "patient_last_name": patient.last_name if patient else None,
        "patient_avatar_url": patient.avatar_url if patient else None,
        "consultation_id": consult.consultation_id if consult else None,
        "treatment_id": consult.treatment_id if consult else None,
    }


@router.post("/appointments/{appointment_id}/cancel", response_model=AppointmentOut)
def cancel(appointment_id: int, data: AppointmentCancel, db: Session = Depends(get_db),
           user: UserAccount = Depends(get_current_user)):
    from app.models.scheduling import TimeSlot
    appt = db.get(Appointment, appointment_id)
    if not appt:
        raise HTTPException(404, "Not found")
    role = UserRole(user.role)
    if role == UserRole.PATIENT and appt.patient_id != user.user_id:
        raise HTTPException(403, "Not your appointment")
    if role == UserRole.DOCTOR and appt.doctor_id != user.user_id:
        raise HTTPException(403, "Not your appointment")
    who = "PATIENT" if role == UserRole.PATIENT else ("DOCTOR" if role == UserRole.DOCTOR else "ADMIN")
    appt = cancel_appointment(db, appt, cancelled_by=who, reason=data.cancel_reason)
    db.commit()
    db.refresh(appt)
    slot = db.get(TimeSlot, appt.slot_id)
    return _appt_out(appt, slot)


@router.patch("/appointments/{appointment_id}/status", response_model=AppointmentOut)
def update_status(appointment_id: int, status: AppointmentStatus, db: Session = Depends(get_db),
                  user: UserAccount = Depends(get_current_user)):
    from app.models.scheduling import TimeSlot
    if UserRole(user.role) != UserRole.DOCTOR:
        raise HTTPException(403, "Only doctors update status")
    appt = db.get(Appointment, appointment_id)
    if not appt or appt.doctor_id != user.user_id:
        raise HTTPException(404, "Not found")
    if appt.status != AppointmentStatus.SCHEDULED or status not in (AppointmentStatus.COMPLETED, AppointmentStatus.NO_SHOW):
        raise HTTPException(409, "Invalid transition (SCHEDULED -> COMPLETED|NO_SHOW only)")
    appt.status = status
    db.commit()
    db.refresh(appt)
    slot = db.get(TimeSlot, appt.slot_id)
    return _appt_out(appt, slot)
