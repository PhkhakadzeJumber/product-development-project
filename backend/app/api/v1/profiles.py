from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_role
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.scheduling import Appointment
from app.models.subtypes import Doctor, DoctorHospital, HospitalAdmin, Patient
from app.models.user_account import UserAccount
from app.services.clinical import doctor_has_patient

router = APIRouter(tags=["profiles"])


@router.get("/patients/{patient_id}/profile")
def patient_profile(patient_id: int, db: Session = Depends(get_db),
                    user: UserAccount = Depends(get_current_user)):
    """Contact + identity of a patient. Doctors see only their own patients;
    patients may see their own profile; admins may see patients of their hospital."""
    role = UserRole(user.role)
    if role == UserRole.PATIENT and user.user_id != patient_id:
        raise HTTPException(403, "Forbidden")
    if role == UserRole.DOCTOR and not doctor_has_patient(db, user.user_id, patient_id):
        raise HTTPException(404, "Not found")
    if role not in (UserRole.DOCTOR, UserRole.HOSPITAL_ADMIN, UserRole.PATIENT):
        raise HTTPException(403, "Forbidden")
    patient = db.get(Patient, patient_id)
    if not patient:
        raise HTTPException(404, "Not found")
    if role == UserRole.HOSPITAL_ADMIN:
        # Admins see only patients linked to their own hospital (via a visit
        # with one of the hospital's doctors). 404 hides cross-hospital existence.
        admin = db.get(HospitalAdmin, user.user_id)
        doc_ids: list[int] = []
        if admin:
            try:
                doc_ids = [r.doctor_id for r in
                           db.query(DoctorHospital).filter_by(hospital_id=admin.hospital_id).all()]
            except Exception:
                doc_ids = []
            if not doc_ids:
                doc_ids = [d.doctor_id for d in db.query(Doctor).filter_by(hospital_id=admin.hospital_id).all()]
        linked = (db.query(Appointment).filter(Appointment.patient_id == patient_id,
                                               Appointment.doctor_id.in_(doc_ids)).first()
                  if doc_ids else None)
        if not linked:
            raise HTTPException(404, "Not found")
    account = db.get(UserAccount, patient_id)
    return {"patient_id": patient.patient_id, "first_name": patient.first_name,
            "last_name": patient.last_name, "date_of_birth": patient.date_of_birth,
            "gender": patient.gender, "city": patient.city,
            "avatar_url": patient.avatar_url,
            "email": account.email if account else None,
            "phone": account.phone if account else None}


@router.get("/doctors/{doctor_id}/contact")
def doctor_contact(doctor_id: int, db: Session = Depends(get_db),
                   user: UserAccount = Depends(get_current_user)):
    """A doctor's contact. Only their own patients (or admins) may see it."""
    role = UserRole(user.role)
    if role == UserRole.PATIENT and not doctor_has_patient(db, doctor_id, user.user_id):
        raise HTTPException(404, "Not found")
    if role not in (UserRole.PATIENT, UserRole.HOSPITAL_ADMIN, UserRole.DOCTOR):
        raise HTTPException(403, "Forbidden")
    doctor = db.get(Doctor, doctor_id)
    if not doctor:
        raise HTTPException(404, "Not found")
    if role == UserRole.HOSPITAL_ADMIN:
        # Admins see contact details only for their own hospital's doctors.
        admin = db.get(HospitalAdmin, user.user_id)
        try:
            member = (db.query(DoctorHospital).filter_by(
                doctor_id=doctor.doctor_id, hospital_id=admin.hospital_id).first()
                if admin else None)
        except Exception:
            member = None
        if not admin or (not member and doctor.hospital_id != admin.hospital_id):
            raise HTTPException(403, "Doctor belongs to another hospital")
    account = db.get(UserAccount, doctor_id)
    return {"doctor_id": doctor.doctor_id, "first_name": doctor.first_name,
            "last_name": doctor.last_name, "photo_url": doctor.photo_url,
            "email": account.email if account else None,
            "phone": account.phone if account else None}
