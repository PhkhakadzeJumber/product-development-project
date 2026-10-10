from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_role
from app.db.session import get_db
from app.models.catalog import Hospital, Specialization
from app.models.enums import UserRole
from app.models.feedback import DoctorPerformance, DoctorReview
from app.models.subtypes import Doctor, DoctorHospital, HospitalAdmin
from app.models.user_account import UserAccount
from app.schemas.misc import DoctorPublicOut

router = APIRouter(tags=["doctors"])


def _hospital_ids_for_doctor(db: Session, doctor: Doctor) -> list[int]:
    try:
        rows = db.query(DoctorHospital).filter_by(doctor_id=doctor.doctor_id).all()
        ids = [r.hospital_id for r in rows]
        if ids:
            return ids
    except Exception:
        pass
    return [doctor.hospital_id] if doctor.hospital_id else []


def _doctor_in_hospital(db: Session, doctor: Doctor, hospital_id: int) -> bool:
    return hospital_id in _hospital_ids_for_doctor(db, doctor)


def _doctor_out(db: Session, d: Doctor) -> dict:
    hospital_name = None
    specialization_name = None
    if d.hospital_id:
        h = db.get(Hospital, d.hospital_id)
        hospital_name = h.name if h else None
    if d.specialization_id:
        s = db.get(Specialization, d.specialization_id)
        specialization_name = s.name if s else None
    return {
        "doctor_id": d.doctor_id,
        "hospital_id": d.hospital_id,
        "hospital_ids": _hospital_ids_for_doctor(db, d),
        "specialization_id": d.specialization_id,
        "first_name": d.first_name,
        "last_name": d.last_name,
        "bio": d.bio,
        "qualifications": d.qualifications,
        "years_of_experience": d.years_of_experience,
        "photo_url": d.photo_url,
        "hospital_name": hospital_name,
        "specialization_name": specialization_name,
    }


@router.get("/doctors", response_model=list[DoctorPublicOut])
def list_doctors(hospital_id: int | None = None, specialization_id: int | None = None,
                 db: Session = Depends(get_db), _: UserAccount = Depends(get_current_user)):
    q = db.query(Doctor).filter_by(is_active=True)
    if hospital_id:
        try:
            doc_ids = [r.doctor_id for r in
                       db.query(DoctorHospital).filter_by(hospital_id=hospital_id).all()]
            q = q.filter(Doctor.doctor_id.in_(doc_ids)) if doc_ids else q.filter(False)
        except Exception:
            q = q.filter_by(hospital_id=hospital_id)
    if specialization_id:
        q = q.filter_by(specialization_id=specialization_id)
    return [_doctor_out(db, d) for d in q.all()]


@router.get("/doctors/{doctor_id}", response_model=DoctorPublicOut)
def get_doctor(doctor_id: int, db: Session = Depends(get_db),
               _: UserAccount = Depends(get_current_user)):
    d = db.get(Doctor, doctor_id)
    if not d or not d.is_active:
        raise HTTPException(404, "Doctor not found")
    return _doctor_out(db, d)


@router.get("/doctors/{doctor_id}/reviews")
def doctor_reviews(doctor_id: int, db: Session = Depends(get_db),
                   _: UserAccount = Depends(get_current_user)):
    doctor = db.get(Doctor, doctor_id)
    if not doctor:
        raise HTTPException(404, "Doctor not found")
    reviews = (db.query(DoctorReview).filter_by(doctor_id=doctor_id)
               .order_by(DoctorReview.created_at.desc()).limit(50).all())
    perf = db.get(DoctorPerformance, doctor_id)
    return {
        "average_rating": float(perf.average_rating) if perf and perf.average_rating is not None else None,
        "review_count": perf.review_count if perf else len(reviews),
        "reviews": [
            {"review_id": r.review_id, "appointment_id": r.appointment_id,
             "rating": r.rating, "comment": r.comment,
             "created_at": r.created_at.isoformat() if r.created_at else None}
            for r in reviews
        ],
    }


@router.get("/doctors/{doctor_id}/performance")
def doctor_performance(doctor_id: int, db: Session = Depends(get_db),
                       user: UserAccount = Depends(require_role(UserRole.HOSPITAL_ADMIN))):
    admin = db.get(HospitalAdmin, user.user_id)
    doctor = db.get(Doctor, doctor_id)
    if not doctor:
        raise HTTPException(404, "Doctor not found")
    if admin and not _doctor_in_hospital(db, doctor, admin.hospital_id):
        raise HTTPException(403, "Doctor belongs to another hospital")
    return db.get(DoctorPerformance, doctor_id)
