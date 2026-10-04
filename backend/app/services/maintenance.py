from datetime import date
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.clinical import Prescription
from app.models.enums import PrescriptionStatus
from app.models.feedback import DoctorPerformance, DoctorReview


def refresh_performance(db: Session, doctor_id: int):
    avg, cnt = db.execute(
        select(func.avg(DoctorReview.rating), func.count()).where(DoctorReview.doctor_id == doctor_id)
    ).one()
    perf = db.get(DoctorPerformance, doctor_id)
    if not perf:
        perf = DoctorPerformance(doctor_id=doctor_id)
        db.add(perf)
    perf.average_rating = float(avg) if avg is not None else None
    perf.review_count = cnt or 0
    perf.popularity_score = float(avg or 0) * (cnt or 0)
    db.flush()


def complete_expired_prescriptions(db: Session) -> int:
    today = date.today()
    q = select(Prescription).where(Prescription.status == PrescriptionStatus.ACTIVE,
                                  Prescription.end_date.is_not(None),
                                  Prescription.end_date < today)
    rows = db.execute(q).scalars().all()
    for p in rows:
        p.status = PrescriptionStatus.COMPLETED
    db.commit()
    return len(rows)
