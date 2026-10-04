from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.clinical import Consultation, Prescription, TreatmentCase
from app.models.enums import AppointmentStatus
from app.models.scheduling import Appointment


def doctor_has_patient(db: Session, doctor_id: int, patient_id: int) -> bool:
    q = select(Appointment).where(Appointment.doctor_id == doctor_id,
                                 Appointment.patient_id == patient_id,
                                 Appointment.status != AppointmentStatus.CANCELLED).limit(1)
    return db.execute(q).scalar_one_or_none() is not None


def check_consultation_invariants(db: Session, doctor_id: int, appointment_id: int, treatment_id: int):
    appt = db.get(Appointment, appointment_id)
    if not appt:
        raise HTTPException(404, "Appointment not found")
    if appt.doctor_id != doctor_id:
        raise HTTPException(403, "Appointment belongs to another doctor")
    case = db.get(TreatmentCase, treatment_id)
    if not case:
        raise HTTPException(404, "Treatment case not found")
    if case.patient_id != appt.patient_id or case.doctor_id != doctor_id:
        raise HTTPException(409, "appointment.patient_id must equal treatment_case.patient_id")
