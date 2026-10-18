"""Appointment waitlist.

"If the book is full, you wait in pain" (log 05): the next free slot was two
weeks away. A patient joins a doctor's waitlist; when a slot frees up (a
cancellation or a new slot) it is held for the first matching patient for a
short time and they get a text.
"""
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_role
from app.db.session import get_db
from app.models.care import WaitlistEntry
from app.models.enums import UserRole, WaitlistStatus
from app.models.scheduling import TimeSlot
from app.models.subtypes import Doctor, DoctorHospital, HospitalAdmin, Patient
from app.models.user_account import UserAccount
from app.schemas.care import WaitlistCreate, WaitlistOut
from app.services.care import accept_offer, decline_offer, expire_offers, join_waitlist, leave_waitlist

router = APIRouter(tags=["waitlist"])

ACTIVE = (WaitlistStatus.WAITING.value, WaitlistStatus.OFFERED.value)


def _schedule_notify(background: BackgroundTasks) -> None:
    from app.api.v1.clinical import _schedule_notify as schedule
    schedule(background)


def _entry_rows(db: Session, rows: list[WaitlistEntry]) -> list[dict]:
    if not rows:
        return []
    doctors = {d.doctor_id: d for d in db.query(Doctor).filter(
        Doctor.doctor_id.in_(list({e.doctor_id for e in rows}))).all()}
    patients = {p.patient_id: p for p in db.query(Patient).filter(
        Patient.patient_id.in_(list({e.patient_id for e in rows}))).all()}
    slot_ids = [e.offered_slot_id for e in rows if e.offered_slot_id]
    slots = {s.slot_id: s for s in db.query(TimeSlot).filter(TimeSlot.slot_id.in_(slot_ids)).all()} if slot_ids else {}
    # Queue position among active entries for the same doctor (1 = next in line).
    positions: dict[int, int] = {}
    for doctor_id in {e.doctor_id for e in rows}:
        queue = (db.query(WaitlistEntry.entry_id)
                 .filter(WaitlistEntry.doctor_id == doctor_id, WaitlistEntry.status.in_(ACTIVE))
                 .order_by(WaitlistEntry.created_at, WaitlistEntry.entry_id).all())
        positions.update({entry_id: i + 1 for i, (entry_id,) in enumerate(queue)})
    out = []
    for e in rows:
        d, p = doctors.get(e.doctor_id), patients.get(e.patient_id)
        slot = slots.get(e.offered_slot_id) if e.offered_slot_id else None
        out.append({
            "entry_id": e.entry_id, "patient_id": e.patient_id, "doctor_id": e.doctor_id,
            "wanted_before": e.wanted_before, "note": e.note, "status": e.status,
            "offered_slot_id": e.offered_slot_id,
            "offered_start": slot.start_time if slot else None,
            "offered_at": e.offered_at, "offer_expires_at": e.offer_expires_at,
            "appointment_id": e.appointment_id, "created_at": e.created_at,
            "position": positions.get(e.entry_id) if e.status in ACTIVE else None,
            "doctor_first_name": d.first_name if d else None, "doctor_last_name": d.last_name if d else None,
            "patient_first_name": p.first_name if p else None, "patient_last_name": p.last_name if p else None,
        })
    return out


def _one(db: Session, e: WaitlistEntry) -> dict:
    return _entry_rows(db, [e])[0]


@router.post("/waitlist", response_model=WaitlistOut)
def join(data: WaitlistCreate, db: Session = Depends(get_db),
         user: UserAccount = Depends(require_role(UserRole.PATIENT))):
    entry = join_waitlist(db, user.user_id, data.doctor_id, data.wanted_before, data.note)
    db.commit()
    db.refresh(entry)
    return _one(db, entry)


@router.get("/waitlist", response_model=list[WaitlistOut])
def list_waitlist(background: BackgroundTasks, active_only: bool = True,
                  db: Session = Depends(get_db), user: UserAccount = Depends(get_current_user)):
    role = UserRole(user.role)
    q = db.query(WaitlistEntry)
    if role == UserRole.PATIENT:
        q = q.filter_by(patient_id=user.user_id)
    elif role == UserRole.DOCTOR:
        q = q.filter_by(doctor_id=user.user_id)
    else:
        admin = db.get(HospitalAdmin, user.user_id)
        doc_ids = [r.doctor_id for r in db.query(DoctorHospital).filter_by(hospital_id=admin.hospital_id).all()] if admin else []
        if admin and not doc_ids:
            doc_ids = [d.doctor_id for d in db.query(Doctor).filter_by(hospital_id=admin.hospital_id).all()]
        q = q.filter(WaitlistEntry.doctor_id.in_(doc_ids)) if doc_ids else q.filter(False)
    # Lapsed offers move on before anyone looks at the list.
    if expire_offers(db):
        db.commit()
        _schedule_notify(background)
    if active_only:
        q = q.filter(WaitlistEntry.status.in_(ACTIVE))
    rows = q.order_by(WaitlistEntry.created_at, WaitlistEntry.entry_id).limit(200).all()
    return _entry_rows(db, rows)


@router.post("/waitlist/{entry_id}/accept", response_model=WaitlistOut)
def accept(entry_id: int, background: BackgroundTasks, db: Session = Depends(get_db),
           user: UserAccount = Depends(require_role(UserRole.PATIENT))):
    try:
        entry = accept_offer(db, db.get(WaitlistEntry, entry_id), user.user_id)
        db.commit()
    except HTTPException:
        # Keep any expiry bookkeeping (offer moved to the next patient) even when this accept fails.
        db.commit()
        _schedule_notify(background)
        raise
    db.refresh(entry)
    return _one(db, entry)


@router.post("/waitlist/{entry_id}/decline", response_model=WaitlistOut)
def decline(entry_id: int, background: BackgroundTasks, db: Session = Depends(get_db),
            user: UserAccount = Depends(require_role(UserRole.PATIENT))):
    entry = decline_offer(db, db.get(WaitlistEntry, entry_id), user.user_id)
    db.commit()
    db.refresh(entry)
    _schedule_notify(background)
    return _one(db, entry)


@router.post("/waitlist/{entry_id}/cancel", response_model=WaitlistOut)
def cancel(entry_id: int, background: BackgroundTasks, db: Session = Depends(get_db),
           user: UserAccount = Depends(require_role(UserRole.PATIENT))):
    entry = leave_waitlist(db, db.get(WaitlistEntry, entry_id), user.user_id)
    db.commit()
    db.refresh(entry)
    _schedule_notify(background)
    return _one(db, entry)
