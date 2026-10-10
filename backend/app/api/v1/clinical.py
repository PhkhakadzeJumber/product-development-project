from datetime import date, datetime, timezone
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_role
from app.db.session import get_db
from app.models.clinical import Consultation, Drug, Prescription, TreatmentCase
from app.models.enums import AppointmentStatus, CaseStatus, PrescriptionStatus, UserRole
from app.models.scheduling import Appointment
from app.models.subtypes import Doctor, Patient
from app.models.user_account import UserAccount
from app.schemas.clinical import (
    ConsultationCreate, ConsultationUpdate, PrescriptionCreate, PrescriptionDiscontinue,
    PrescriptionOut, PrescriptionSubstitute, PrescriptionUpdate,
    TreatmentCaseCreate, TreatmentCaseOut, TreatmentCaseUpdate,
)
from app.services.clinical import check_consultation_invariants, doctor_has_patient

router = APIRouter(tags=["clinical"])


def _process_pending_task() -> None:
    from app.db.session import SessionLocal
    from app.services.notifications import process_pending
    db = SessionLocal()
    try:
        process_pending(db)
    finally:
        db.close()


def _schedule_notify(background: BackgroundTasks) -> None:
    background.add_task(_process_pending_task)


def _notify_prescription(db: Session, *, action: str, p: Prescription,
                         old_drug_name: str | None = None) -> None:
    from app.services.notifications import enqueue_prescription_change
    account = db.get(UserAccount, p.patient_id)
    doctor = db.get(Doctor, p.doctor_id)
    drug = db.get(Drug, p.drug_id)
    enqueue_prescription_change(
        db, action=action,
        patient_email=account.email if account else None,
        patient_phone=account.phone if account else None,
        patient_id=p.patient_id, prescription_id=p.prescription_id,
        drug_name=drug.name if drug else f"drug #{p.drug_id}",
        dosage=p.dosage, frequency=p.frequency, duration_note=p.duration_note,
        start_date=p.start_date, end_date=p.end_date,
        doctor_name=f"{doctor.first_name} {doctor.last_name}" if doctor else f"#{p.doctor_id}",
        old_drug_name=old_drug_name,
    )


def _timeline_payload(case: TreatmentCase, consults: list[Consultation], db: Session) -> dict:
    consult_ids = [c.consultation_id for c in consults]
    rxs = (db.query(Prescription).filter(Prescription.consultation_id.in_(consult_ids)).all()
           if consult_ids else [])
    by_consult: dict[int, list] = {}
    for r in rxs:
        by_consult.setdefault(r.consultation_id, []).append({
            "prescription_id": r.prescription_id, "drug_id": r.drug_id,
            "dosage": r.dosage, "frequency": r.frequency, "route": r.route,
            "start_date": r.start_date.isoformat() if r.start_date else None,
            "end_date": r.end_date.isoformat() if r.end_date else None,
            "duration_note": r.duration_note, "instructions": r.instructions,
            "status": r.status, "supersedes_id": r.supersedes_id,
        })
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
                               "created_at": c.created_at,
                               "prescriptions": by_consult.get(c.consultation_id, [])} for c in consults]}


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


def _require_in_treatment(case: TreatmentCase) -> None:
    from app.models.enums import CaseStatus
    if case.status != CaseStatus.IN_TREATMENT:
        raise HTTPException(409, "Case is not in treatment — record is read-only")


@router.patch("/treatment-cases/{treatment_id}", response_model=TreatmentCaseOut)
def update_case(treatment_id: int, data: TreatmentCaseUpdate, db: Session = Depends(get_db),
                user: UserAccount = Depends(require_role(UserRole.DOCTOR))):
    case = db.get(TreatmentCase, treatment_id)
    if not case or case.doctor_id != user.user_id:
        raise HTTPException(404, "Not found")
    # Status transitions are always allowed (OPEN -> IN_TREATMENT -> RESOLVED),
    # but content edits are only allowed while IN_TREATMENT.
    wants_content_edit = any(v is not None for v in (data.title, data.diagnosis, data.icd_code, data.severity))
    if wants_content_edit:
        _require_in_treatment(case)
    if data.title is not None:
        case.title = data.title.strip() or case.title
    if data.diagnosis is not None:
        case.diagnosis = data.diagnosis.strip() or None
    if data.icd_code is not None:
        case.icd_code = data.icd_code.strip() or None
    if data.severity is not None:
        case.severity = data.severity
    if data.status is not None:
        case.status = data.status
        if data.status == CaseStatus.RESOLVED and not case.ended_on:
            case.ended_on = date.today()
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


@router.get("/treatment-cases/mine", response_model=list[TreatmentCaseOut])
def my_cases(db: Session = Depends(get_db),
             user: UserAccount = Depends(require_role(UserRole.PATIENT))):
    return db.query(TreatmentCase).filter_by(patient_id=user.user_id).all()


@router.get("/treatment-cases/{treatment_id}/timeline")
def case_timeline(treatment_id: int, db: Session = Depends(get_db),
                  user: UserAccount = Depends(get_current_user)):
    case = db.get(TreatmentCase, treatment_id)
    if not case:
        raise HTTPException(404, "Not found")
    role = UserRole(user.role)
    if role == UserRole.DOCTOR and case.doctor_id != user.user_id:
        raise HTTPException(404, "Not found")
    elif role == UserRole.PATIENT and case.patient_id != user.user_id:
        raise HTTPException(404, "Not found")
    elif role not in (UserRole.DOCTOR, UserRole.PATIENT):
        raise HTTPException(403, "Admins cannot view timelines")
    consults = db.query(Consultation).filter_by(treatment_id=treatment_id).order_by(Consultation.created_at).all()
    return _timeline_payload(case, consults, db)


@router.post("/consultations")
def create_consultation(data: ConsultationCreate, db: Session = Depends(get_db),
                        user: UserAccount = Depends(require_role(UserRole.DOCTOR))):
    check_consultation_invariants(db, user.user_id, data.appointment_id, data.treatment_id)
    case = db.get(TreatmentCase, data.treatment_id)
    if case is not None:
        _require_in_treatment(case)
    c = Consultation(**data.model_dump())
    db.add(c)
    db.commit()
    db.refresh(c)
    return {"consultation_id": c.consultation_id}


@router.patch("/consultations/{consultation_id}")
def update_consultation(consultation_id: int, data: ConsultationUpdate,
                        db: Session = Depends(get_db),
                        user: UserAccount = Depends(require_role(UserRole.DOCTOR))):
    c = db.get(Consultation, consultation_id)
    if not c:
        raise HTTPException(404, "Not found")
    case = db.get(TreatmentCase, c.treatment_id)
    if not case or case.doctor_id != user.user_id:
        raise HTTPException(403, "Not your consultation")
    _require_in_treatment(case)
    for field in ("chief_complaint", "symptoms", "examination_notes", "follow_up_plan"):
        val = getattr(data, field)
        if val is not None:
            setattr(c, field, val.strip() or None)
    if data.condition_status is not None:
        c.condition_status = data.condition_status
    if data.vitals is not None:
        c.vitals = data.vitals
    db.commit()
    return {"ok": True}


def _own_prescription(db: Session, prescription_id: int, doctor_id: int) -> Prescription:
    p = db.get(Prescription, prescription_id)
    if not p or p.doctor_id != doctor_id:
        raise HTTPException(404, "Not found")
    return p


@router.post("/prescriptions", response_model=PrescriptionOut)
def create_prescription(data: PrescriptionCreate, background: BackgroundTasks,
                        db: Session = Depends(get_db),
                        user: UserAccount = Depends(require_role(UserRole.DOCTOR))):
    case = db.get(TreatmentCase, data.treatment_id)
    if not case or case.doctor_id != user.user_id or case.patient_id != data.patient_id:
        raise HTTPException(409, "Case/patient mismatch")
    _require_in_treatment(case)
    consult = db.get(Consultation, data.consultation_id)
    if not consult or consult.treatment_id != data.treatment_id:
        raise HTTPException(409, "Consultation/case mismatch")
    p = Prescription(consultation_id=data.consultation_id, treatment_id=data.treatment_id,
                     patient_id=data.patient_id, doctor_id=user.user_id, drug_id=data.drug_id,
                     dosage=data.dosage, frequency=data.frequency, route=data.route,
                     start_date=data.start_date or date.today(), end_date=data.end_date,
                     duration_note=data.duration_note,
                     instructions=data.instructions, status=PrescriptionStatus.ACTIVE)
    db.add(p)
    db.flush()
    _notify_prescription(db, action="created", p=p)
    db.commit()
    db.refresh(p)
    _schedule_notify(background)
    return p


@router.patch("/prescriptions/{prescription_id}", response_model=PrescriptionOut)
def update_prescription(prescription_id: int, data: PrescriptionUpdate,
                        background: BackgroundTasks, db: Session = Depends(get_db),
                        user: UserAccount = Depends(require_role(UserRole.DOCTOR))):
    p = _own_prescription(db, prescription_id, user.user_id)
    if p.status != PrescriptionStatus.ACTIVE:
        raise HTTPException(409, "Only active prescriptions can be edited")
    case = db.get(TreatmentCase, p.treatment_id)
    if case is not None:
        _require_in_treatment(case)
    end_date_set = data.end_date is not None and p.end_date != data.end_date
    for field in ("dosage", "frequency", "route", "instructions", "duration_note"):
        val = getattr(data, field)
        if val is not None:
            setattr(p, field, val.strip() if isinstance(val, str) else val)
    if data.start_date is not None:
        p.start_date = data.start_date
    if data.end_date is not None:
        p.end_date = data.end_date
    db.flush()
    _notify_prescription(db, action="ended" if end_date_set and not data.dosage
                         and not data.frequency and not data.instructions else "edited", p=p)
    db.commit()
    db.refresh(p)
    _schedule_notify(background)
    return p


@router.post("/prescriptions/{prescription_id}/discontinue", response_model=PrescriptionOut)
def discontinue_prescription(prescription_id: int, data: PrescriptionDiscontinue,
                             background: BackgroundTasks, db: Session = Depends(get_db),
                             user: UserAccount = Depends(require_role(UserRole.DOCTOR))):
    p = _own_prescription(db, prescription_id, user.user_id)
    if p.status != PrescriptionStatus.ACTIVE:
        raise HTTPException(409, "Only active prescriptions can be discontinued")
    case = db.get(TreatmentCase, p.treatment_id)
    if case is not None:
        _require_in_treatment(case)
    p.status = PrescriptionStatus.DISCONTINUED
    p.discontinue_reason = (data.reason or "").strip() or None
    p.completed_at = datetime.now(timezone.utc)
    db.flush()
    _notify_prescription(db, action="discontinued", p=p)
    db.commit()
    db.refresh(p)
    _schedule_notify(background)
    return p


@router.post("/prescriptions/{prescription_id}/substitute", response_model=PrescriptionOut)
def substitute_prescription(prescription_id: int, data: PrescriptionSubstitute,
                            background: BackgroundTasks, db: Session = Depends(get_db),
                            user: UserAccount = Depends(require_role(UserRole.DOCTOR))):
    """Atomic discontinue-old + create-new. History is preserved via supersedes_id."""
    old = _own_prescription(db, prescription_id, user.user_id)
    if old.status != PrescriptionStatus.ACTIVE:
        raise HTTPException(409, "Only active prescriptions can be substituted")
    case = db.get(TreatmentCase, old.treatment_id)
    if case is not None:
        _require_in_treatment(case)
    if not db.get(Drug, data.drug_id):
        raise HTTPException(404, "Drug not found")
    old_drug = db.get(Drug, old.drug_id)
    old.status = PrescriptionStatus.DISCONTINUED
    old.discontinue_reason = (data.reason or "").strip() or f"Substituted (see prescription replacing #{old.prescription_id})"
    old.completed_at = datetime.now(timezone.utc)
    new = Prescription(consultation_id=old.consultation_id, treatment_id=old.treatment_id,
                       patient_id=old.patient_id, doctor_id=user.user_id, drug_id=data.drug_id,
                       dosage=data.dosage, frequency=data.frequency, route=data.route,
                       start_date=data.start_date or date.today(), end_date=data.end_date,
                       duration_note=data.duration_note, instructions=data.instructions,
                       status=PrescriptionStatus.ACTIVE, supersedes_id=old.prescription_id)
    db.add(new)
    db.flush()
    _notify_prescription(db, action="substituted", p=new,
                         old_drug_name=old_drug.name if old_drug else None)
    db.commit()
    db.refresh(new)
    _schedule_notify(background)
    return new


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
