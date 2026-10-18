"""Prescription renewal requests.

A patient on a standing treatment asks for the same prescription again; the
doctor approves or declines without a visit (log 01: the same prescription
costs half a day every month, twice when the doctor is out).
"""
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_role
from app.db.session import get_db
from app.models.care import PrescriptionRenewal
from app.models.clinical import Drug, Prescription
from app.models.enums import RenewalStatus, UserRole
from app.models.subtypes import Doctor, Patient
from app.models.user_account import UserAccount
from app.schemas.care import RenewalApprove, RenewalCreate, RenewalDecline, RenewalOut
from app.services.care import approve_renewal, cancel_renewal, decline_renewal, request_renewal

router = APIRouter(tags=["renewals"])


def _renewal_rows(db: Session, rows: list[PrescriptionRenewal]) -> list[dict]:
    if not rows:
        return []
    rx_ids = list({r.prescription_id for r in rows})
    rxs = {p.prescription_id: p for p in db.query(Prescription).filter(Prescription.prescription_id.in_(rx_ids)).all()}
    drug_ids = list({p.drug_id for p in rxs.values()})
    drugs = {d.drug_id: d for d in db.query(Drug).filter(Drug.drug_id.in_(drug_ids)).all()} if drug_ids else {}
    pat_ids = list({r.patient_id for r in rows})
    doc_ids = list({r.doctor_id for r in rows})
    patients = {p.patient_id: p for p in db.query(Patient).filter(Patient.patient_id.in_(pat_ids)).all()}
    doctors = {d.doctor_id: d for d in db.query(Doctor).filter(Doctor.doctor_id.in_(doc_ids)).all()}
    out = []
    for r in rows:
        rx = rxs.get(r.prescription_id)
        drug = drugs.get(rx.drug_id) if rx else None
        p, d = patients.get(r.patient_id), doctors.get(r.doctor_id)
        out.append({
            "renewal_id": r.renewal_id, "prescription_id": r.prescription_id,
            "patient_id": r.patient_id, "doctor_id": r.doctor_id, "status": r.status,
            "patient_note": r.patient_note, "doctor_note": r.doctor_note,
            "new_prescription_id": r.new_prescription_id,
            "created_at": r.created_at, "decided_at": r.decided_at,
            "drug_id": rx.drug_id if rx else None, "drug_name": drug.name if drug else None,
            "dosage": rx.dosage if rx else None, "frequency": rx.frequency if rx else None,
            "prescription_status": getattr(rx.status, "value", rx.status) if rx else None,
            "patient_first_name": p.first_name if p else None, "patient_last_name": p.last_name if p else None,
            "doctor_first_name": d.first_name if d else None, "doctor_last_name": d.last_name if d else None,
        })
    return out


def _one(db: Session, ren: PrescriptionRenewal) -> dict:
    return _renewal_rows(db, [ren])[0]


@router.post("/prescriptions/{prescription_id}/renewals", response_model=RenewalOut)
def create_renewal(prescription_id: int, data: RenewalCreate, db: Session = Depends(get_db),
                   user: UserAccount = Depends(require_role(UserRole.PATIENT))):
    rx = db.get(Prescription, prescription_id)
    if not rx:
        raise HTTPException(404, "Prescription not found")
    ren = request_renewal(db, rx, user.user_id, data.note)
    db.commit()
    db.refresh(ren)
    return _one(db, ren)


@router.get("/renewals", response_model=list[RenewalOut])
def list_renewals(status: RenewalStatus | None = None, db: Session = Depends(get_db),
                  user: UserAccount = Depends(get_current_user)):
    role = UserRole(user.role)
    q = db.query(PrescriptionRenewal)
    if role == UserRole.PATIENT:
        q = q.filter_by(patient_id=user.user_id)
    elif role == UserRole.DOCTOR:
        q = q.filter_by(doctor_id=user.user_id)
    else:
        raise HTTPException(403, "Admins cannot view prescriptions")
    if status:
        q = q.filter_by(status=status.value)
    rows = q.order_by(PrescriptionRenewal.created_at.desc(), PrescriptionRenewal.renewal_id.desc()).limit(200).all()
    return _renewal_rows(db, rows)


@router.post("/renewals/{renewal_id}/approve", response_model=RenewalOut)
def approve(renewal_id: int, data: RenewalApprove, background: BackgroundTasks,
            db: Session = Depends(get_db), user: UserAccount = Depends(require_role(UserRole.DOCTOR))):
    from app.api.v1.clinical import _notify_prescription, _schedule_notify
    ren, new = approve_renewal(db, db.get(PrescriptionRenewal, renewal_id), user.user_id,
                               data.days, data.doctor_note)
    _notify_prescription(db, action="renewed", p=new)
    db.commit()
    db.refresh(ren)
    _schedule_notify(background)
    return _one(db, ren)


@router.post("/renewals/{renewal_id}/decline", response_model=RenewalOut)
def decline(renewal_id: int, data: RenewalDecline, background: BackgroundTasks,
            db: Session = Depends(get_db), user: UserAccount = Depends(require_role(UserRole.DOCTOR))):
    from app.api.v1.clinical import _schedule_notify
    ren = decline_renewal(db, db.get(PrescriptionRenewal, renewal_id), user.user_id, data.doctor_note)
    db.commit()
    db.refresh(ren)
    _schedule_notify(background)
    return _one(db, ren)


@router.post("/renewals/{renewal_id}/cancel", response_model=RenewalOut)
def cancel(renewal_id: int, db: Session = Depends(get_db),
           user: UserAccount = Depends(require_role(UserRole.PATIENT))):
    ren = cancel_renewal(db, db.get(PrescriptionRenewal, renewal_id), user.user_id)
    db.commit()
    db.refresh(ren)
    return _one(db, ren)
