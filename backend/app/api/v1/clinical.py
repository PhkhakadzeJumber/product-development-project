from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_role
from app.db.session import get_db
from app.models.clinical import Consultation, Prescription, TreatmentCase
from app.models.enums import PrescriptionStatus, UserRole
from app.models.user_account import UserAccount
from app.schemas.clinical import ConsultationCreate, PrescriptionCreate, PrescriptionOut, TreatmentCaseCreate, TreatmentCaseOut
from app.services.clinical import check_consultation_invariants, doctor_has_patient

router = APIRouter(tags=["clinical"])


@router.post("/treatment-cases", response_model=TreatmentCaseOut)
def create_case(data: TreatmentCaseCreate, db: Session = Depends(get_db),
                user: UserAccount = Depends(require_role(UserRole.DOCTOR))):
    if not doctor_has_patient(db, user.user_id, data.patient_id):
        raise HTTPException(403, "No appointment with this patient")
    case = TreatmentCase(patient_id=data.patient_id, doctor_id=user.user_id, title=data.title,
                         diagnosis=data.diagnosis, icd_code=data.icd_code, severity=data.severity)
    db.add(case)
    db.commit()
    db.refresh(case)
    return case


@router.get("/treatment-cases", response_model=list[TreatmentCaseOut])
def list_cases(patient_id: int | None = None, db: Session = Depends(get_db),
               user: UserAccount = Depends(require_role(UserRole.DOCTOR))):
    q = db.query(TreatmentCase).filter_by(doctor_id=user.user_id)
    if patient_id:
        q = q.filter_by(patient_id=patient_id)
    return q.all()


@router.get("/treatment-cases/{treatment_id}/timeline")
def case_timeline(treatment_id: int, db: Session = Depends(get_db),
                  user: UserAccount = Depends(require_role(UserRole.DOCTOR))):
    case = db.get(TreatmentCase, treatment_id)
    if not case or case.doctor_id != user.user_id:
        raise HTTPException(404, "Not found")
    consults = db.query(Consultation).filter_by(treatment_id=treatment_id).order_by(Consultation.created_at).all()
    return {"case": {"treatment_id": case.treatment_id, "patient_id": case.patient_id,
                     "doctor_id": case.doctor_id, "title": case.title,
                     "diagnosis": case.diagnosis, "icd_code": case.icd_code,
                     "severity": case.severity, "status": case.status,
                     "started_on": case.started_on, "ended_on": case.ended_on},
            "consultations": [{"consultation_id": c.consultation_id,
                               "appointment_id": c.appointment_id,
                               "chief_complaint": c.chief_complaint,
                               "condition_status": c.condition_status,
                               "symptoms": c.symptoms,
                               "examination_notes": c.examination_notes,
                               "vitals": c.vitals,
                               "follow_up_plan": c.follow_up_plan,
                               "created_at": c.created_at} for c in consults]}


@router.post("/consultations")
def create_consultation(data: ConsultationCreate, db: Session = Depends(get_db),
                        user: UserAccount = Depends(require_role(UserRole.DOCTOR))):
    check_consultation_invariants(db, user.user_id, data.appointment_id, data.treatment_id)
    c = Consultation(**data.model_dump())
    db.add(c)
    db.commit()
    db.refresh(c)
    return {"consultation_id": c.consultation_id}


@router.post("/prescriptions", response_model=PrescriptionOut)
def create_prescription(data: PrescriptionCreate, db: Session = Depends(get_db),
                        user: UserAccount = Depends(require_role(UserRole.DOCTOR))):
    case = db.get(TreatmentCase, data.treatment_id)
    if not case or case.doctor_id != user.user_id or case.patient_id != data.patient_id:
        raise HTTPException(409, "Case/patient mismatch")
    p = Prescription(consultation_id=data.consultation_id, treatment_id=data.treatment_id,
                     patient_id=data.patient_id, doctor_id=user.user_id, drug_id=data.drug_id,
                     dosage=data.dosage, frequency=data.frequency, route=data.route,
                     start_date=data.start_date, end_date=data.end_date,
                     instructions=data.instructions, status=PrescriptionStatus.ACTIVE)
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


@router.get("/prescriptions/mine", response_model=list[PrescriptionOut])
def my_prescriptions(active_only: bool = False, db: Session = Depends(get_db),
                     user: UserAccount = Depends(get_current_user)):
    role = UserRole(user.role)
    q = db.query(Prescription)
    if role == UserRole.PATIENT:
        q = q.filter_by(patient_id=user.user_id)
        if active_only:
            q = q.filter_by(status=PrescriptionStatus.ACTIVE)
    elif role == UserRole.DOCTOR:
        q = q.filter_by(doctor_id=user.user_id)
    else:
        raise HTTPException(403, "Admins cannot view prescriptions")
    return q.limit(200).all()


@router.patch("/prescriptions/{prescription_id}/complete")
def complete_prescription(prescription_id: int, db: Session = Depends(get_db),
                          user: UserAccount = Depends(require_role(UserRole.DOCTOR))):
    p = db.get(Prescription, prescription_id)
    if not p or p.doctor_id != user.user_id:
        raise HTTPException(404, "Not found")
    p.status = PrescriptionStatus.COMPLETED
    p.completed_at = datetime.now(timezone.utc)
    db.commit()
    return {"ok": True}
