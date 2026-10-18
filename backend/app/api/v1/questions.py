"""Between-visit questions to the patient's own doctor.

Patients could not reach their doctor between visits and kept calling (2, 6 and
4 calls in logs 02, 03, 07), while the doctor keeps his mobile private to avoid
evening calls (log 04). So: a short written question, a reply window the doctor
sets, "seen" receipts so nobody has to call to check, and no texts to the
doctor's phone.
"""
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_role
from app.db.session import get_db
from app.models.care import PatientQuestion
from app.models.enums import AppointmentStatus, QuestionStatus, UserRole
from app.models.scheduling import Appointment
from app.models.subtypes import Doctor, Patient
from app.models.user_account import UserAccount
from app.schemas.care import (
    QuestionAnswer, QuestionCreate, QuestionOut, QuestionSettings, QuestionSettingsUpdate, QuestionSummary,
)
from app.services.booking import _as_utc
from app.services.care import answer_question, ask_question, now_utc, question_due_by

router = APIRouter(tags=["questions"])


def _settings_out(d: Doctor) -> dict:
    return {"doctor_id": d.doctor_id, "first_name": d.first_name, "last_name": d.last_name,
            "questions_open": d.questions_open, "reply_within_hours": d.reply_within_hours,
            "reply_note": d.reply_note}


def _question_rows(db: Session, rows: list[PatientQuestion]) -> list[dict]:
    if not rows:
        return []
    patients = {p.patient_id: p for p in db.query(Patient).filter(
        Patient.patient_id.in_(list({q.patient_id for q in rows}))).all()}
    doctors = {d.doctor_id: d for d in db.query(Doctor).filter(
        Doctor.doctor_id.in_(list({q.doctor_id for q in rows}))).all()}
    now = now_utc()
    out = []
    for q in rows:
        p, d = patients.get(q.patient_id), doctors.get(q.doctor_id)
        due = question_due_by(q, d)
        out.append({
            "question_id": q.question_id, "patient_id": q.patient_id, "doctor_id": q.doctor_id,
            "treatment_id": q.treatment_id, "urgency": q.urgency, "body": q.body, "status": q.status,
            "answer": q.answer, "created_at": q.created_at, "answered_at": q.answered_at,
            "doctor_seen_at": q.doctor_seen_at, "patient_seen_at": q.patient_seen_at,
            "due_by": due,
            "overdue": q.status == QuestionStatus.OPEN.value and due is not None and _as_utc(due) < now,
            "patient_first_name": p.first_name if p else None, "patient_last_name": p.last_name if p else None,
            "doctor_first_name": d.first_name if d else None, "doctor_last_name": d.last_name if d else None,
        })
    return out


def _own_question(db: Session, question_id: int, user: UserAccount) -> PatientQuestion:
    q = db.get(PatientQuestion, question_id)
    role = UserRole(user.role)
    if not q or (role == UserRole.PATIENT and q.patient_id != user.user_id) \
            or (role == UserRole.DOCTOR and q.doctor_id != user.user_id) \
            or role == UserRole.HOSPITAL_ADMIN:
        raise HTTPException(404, "Question not found")
    return q


# --- doctor reply settings ------------------------------------------------------

@router.get("/doctors/{doctor_id}/question-settings", response_model=QuestionSettings)
def get_question_settings(doctor_id: int, db: Session = Depends(get_db),
                          user: UserAccount = Depends(get_current_user)):
    d = db.get(Doctor, doctor_id)
    if not d:
        raise HTTPException(404, "Doctor not found")
    return _settings_out(d)


@router.patch("/doctors/me/question-settings", response_model=QuestionSettings)
def update_question_settings(data: QuestionSettingsUpdate, db: Session = Depends(get_db),
                             user: UserAccount = Depends(require_role(UserRole.DOCTOR))):
    d = db.get(Doctor, user.user_id)
    if not d:
        raise HTTPException(404, "Doctor not found")
    if data.questions_open is not None:
        d.questions_open = data.questions_open
    if data.reply_within_hours is not None:
        d.reply_within_hours = data.reply_within_hours
    if data.reply_note is not None:
        d.reply_note = data.reply_note or None
    db.commit()
    db.refresh(d)
    return _settings_out(d)


# --- questions ------------------------------------------------------------------

@router.get("/questions/doctors", response_model=list[QuestionSettings])
def askable_doctors(db: Session = Depends(get_db), user: UserAccount = Depends(require_role(UserRole.PATIENT))):
    """Doctors this patient has a (non-cancelled) visit with, plus their reply settings."""
    ids = [r[0] for r in db.query(Appointment.doctor_id).filter(
        Appointment.patient_id == user.user_id,
        Appointment.status != AppointmentStatus.CANCELLED).distinct().all()]
    if not ids:
        return []
    doctors = db.query(Doctor).filter(Doctor.doctor_id.in_(ids), Doctor.is_active.is_(True)).all()
    return [_settings_out(d) for d in sorted(doctors, key=lambda d: (d.last_name, d.first_name))]


@router.post("/questions", response_model=QuestionOut)
def create_question(data: QuestionCreate, db: Session = Depends(get_db),
                    user: UserAccount = Depends(require_role(UserRole.PATIENT))):
    q = ask_question(db, user.user_id, data.doctor_id, data.body, data.urgency.value, data.treatment_id)
    db.commit()
    db.refresh(q)
    return _question_rows(db, [q])[0]


@router.get("/questions", response_model=list[QuestionOut])
def list_questions(status: QuestionStatus | None = None, db: Session = Depends(get_db),
                   user: UserAccount = Depends(get_current_user)):
    role = UserRole(user.role)
    q = db.query(PatientQuestion)
    if role == UserRole.PATIENT:
        q = q.filter_by(patient_id=user.user_id)
    elif role == UserRole.DOCTOR:
        q = q.filter_by(doctor_id=user.user_id)
    else:
        raise HTTPException(403, "Questions are between a patient and their doctor")
    if status:
        q = q.filter_by(status=status.value)
    rows = q.order_by(PatientQuestion.created_at.desc(), PatientQuestion.question_id.desc()).limit(200).all()
    out = _question_rows(db, rows)
    if role == UserRole.DOCTOR:
        # Inbox order: open first (soon before routine, oldest first), then the rest newest first.
        open_rows = [r for r in out if r["status"] == "OPEN"]
        open_rows.sort(key=lambda r: (r["urgency"] != "SOON", _as_utc(r["created_at"]) if r["created_at"] else now_utc()))
        out = open_rows + [r for r in out if r["status"] != "OPEN"]
    return out


@router.get("/questions/summary", response_model=QuestionSummary)
def question_summary(db: Session = Depends(get_db), user: UserAccount = Depends(get_current_user)):
    role = UserRole(user.role)
    if role == UserRole.DOCTOR:
        rows = db.query(PatientQuestion).filter_by(doctor_id=user.user_id, status=QuestionStatus.OPEN.value).all()
        doctor = db.get(Doctor, user.user_id)
        now = now_utc()
        overdue = sum(1 for q in rows if (due := question_due_by(q, doctor)) is not None and _as_utc(due) < now)
        return QuestionSummary(open=len(rows), unseen=sum(1 for q in rows if q.doctor_seen_at is None), overdue=overdue)
    if role == UserRole.PATIENT:
        open_count = db.query(PatientQuestion).filter_by(
            patient_id=user.user_id, status=QuestionStatus.OPEN.value).count()
        unseen = db.query(PatientQuestion).filter_by(
            patient_id=user.user_id, status=QuestionStatus.ANSWERED.value).filter(
            PatientQuestion.patient_seen_at.is_(None)).count()
        return QuestionSummary(open=open_count, unseen=unseen)
    return QuestionSummary()


@router.post("/questions/{question_id}/answer", response_model=QuestionOut)
def answer(question_id: int, data: QuestionAnswer, background: BackgroundTasks,
           db: Session = Depends(get_db), user: UserAccount = Depends(require_role(UserRole.DOCTOR))):
    from app.api.v1.clinical import _schedule_notify
    q = answer_question(db, db.get(PatientQuestion, question_id), user.user_id, data.answer)
    db.commit()
    db.refresh(q)
    _schedule_notify(background)
    return _question_rows(db, [q])[0]


@router.post("/questions/{question_id}/seen", response_model=QuestionOut)
def mark_seen(question_id: int, db: Session = Depends(get_db), user: UserAccount = Depends(get_current_user)):
    q = _own_question(db, question_id, user)
    now = now_utc()
    if UserRole(user.role) == UserRole.DOCTOR:
        q.doctor_seen_at = q.doctor_seen_at or now
    elif q.status == QuestionStatus.ANSWERED.value:
        q.patient_seen_at = q.patient_seen_at or now
    db.commit()
    db.refresh(q)
    return _question_rows(db, [q])[0]


@router.post("/questions/{question_id}/close", response_model=QuestionOut)
def close(question_id: int, db: Session = Depends(get_db), user: UserAccount = Depends(get_current_user)):
    q = _own_question(db, question_id, user)
    if q.status == QuestionStatus.CLOSED.value:
        raise HTTPException(409, "Question is already closed")
    q.status = QuestionStatus.CLOSED.value
    if UserRole(user.role) == UserRole.PATIENT and q.answered_at is not None:
        q.patient_seen_at = q.patient_seen_at or now_utc()
    db.commit()
    db.refresh(q)
    return _question_rows(db, [q])[0]
