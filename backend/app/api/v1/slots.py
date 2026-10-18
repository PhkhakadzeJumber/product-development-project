from datetime import datetime, timezone
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_role
from app.db.session import get_db
from app.models.enums import SlotStatus, UserRole
from app.models.scheduling import TimeSlot
from app.models.subtypes import Doctor, DoctorHospital, HospitalAdmin
from app.models.user_account import UserAccount
from app.schemas.scheduling import SlotCreate, SlotOut

router = APIRouter(tags=["slots"])


@router.get("/slots", response_model=list[SlotOut])
def list_slots(doctor_id: int | None = None, status: SlotStatus | None = None,
               future_only: bool = False,
               db: Session = Depends(get_db), user: UserAccount = Depends(get_current_user)):
    q = db.query(TimeSlot)
    if UserRole(user.role) == UserRole.HOSPITAL_ADMIN:
        # Admins see only their own hospital's slots (patients/doctors keep full listing for booking).
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
        if doctor_id is not None and doctor_id not in doc_ids:
            return []
        q = q.filter(TimeSlot.doctor_id.in_(doc_ids)) if doc_ids else q.filter(False)
    elif doctor_id:
        q = q.filter_by(doctor_id=doctor_id)
    if status:
        q = q.filter_by(status=status)
    if future_only:
        q = q.filter(TimeSlot.start_time > datetime.now(timezone.utc))
    from app.services.care import hold_active
    rows = q.order_by(TimeSlot.start_time).limit(200).all()
    is_patient = UserRole(user.role) == UserRole.PATIENT
    out = []
    for s in rows:
        held = hold_active(s)
        mine = held and s.held_for_patient_id == user.user_id
        if is_patient and held and not mine:
            continue  # held for another patient on the waitlist: not bookable right now
        out.append({**SlotOut.model_validate(s).model_dump(),
                    "held_for_me": mine,
                    "held_until": s.held_until if (held and (mine or not is_patient)) else None})
    return out


@router.post("/slots", response_model=SlotOut)
def create_slot(data: SlotCreate, background: BackgroundTasks, db: Session = Depends(get_db),
                user: UserAccount = Depends(require_role(UserRole.HOSPITAL_ADMIN))):
    admin = db.get(HospitalAdmin, user.user_id)
    doctor = db.get(Doctor, data.doctor_id)
    if not doctor:
        raise HTTPException(404, "Doctor not found")
    if admin:
        try:
            member = db.query(DoctorHospital).filter_by(
                doctor_id=doctor.doctor_id, hospital_id=admin.hospital_id).first()
        except Exception:
            member = None
        if not member and doctor.hospital_id != admin.hospital_id:
            raise HTTPException(403, "Doctor belongs to another hospital")
    if data.end_time <= data.start_time:
        raise HTTPException(422, "end_time must be after start_time")
    duration_min = (data.end_time - data.start_time).total_seconds() / 60
    if duration_min < 30:
        raise HTTPException(422, "Slot must be at least 30 minutes long")
    # Overlap check (DB exclusion constraint is the final guard in migration).
    overlap = db.query(TimeSlot).filter(
        TimeSlot.doctor_id == data.doctor_id,
        TimeSlot.status != SlotStatus.CANCELLED,
        TimeSlot.start_time < data.end_time,
        TimeSlot.end_time > data.start_time,
    ).first()
    if overlap:
        raise HTTPException(409, "Slot overlaps existing slot")
    slot = TimeSlot(doctor_id=data.doctor_id, created_by_admin_id=user.user_id,
                    start_time=data.start_time, end_time=data.end_time,
                    consultation_mode=data.consultation_mode, status=SlotStatus.AVAILABLE)
    db.add(slot)
    db.flush()
    # New capacity goes to the doctor's waitlist first (log 05).
    from app.services.care import offer_slot
    offered = offer_slot(db, slot)
    db.commit()
    db.refresh(slot)
    if offered:
        from app.api.v1.clinical import _schedule_notify
        _schedule_notify(background)
    return slot


@router.delete("/slots/{slot_id}")
def delete_slot(slot_id: int, db: Session = Depends(get_db),
                 user: UserAccount = Depends(require_role(UserRole.HOSPITAL_ADMIN))):
    slot = db.get(TimeSlot, slot_id)
    if not slot:
        raise HTTPException(404, "Slot not found")
    admin = db.get(HospitalAdmin, user.user_id)
    doctor = db.get(Doctor, slot.doctor_id)
    if not admin or not doctor:
        raise HTTPException(403, "Not your hospital's slot")
    try:
        member = db.query(DoctorHospital).filter_by(
            doctor_id=doctor.doctor_id, hospital_id=admin.hospital_id).first()
    except Exception:
        member = None
    if not member and doctor.hospital_id != admin.hospital_id:
        raise HTTPException(403, "Slot belongs to another hospital")
    if slot.status == SlotStatus.BOOKED:
        raise HTTPException(409, "Cannot delete booked slot")
    slot.status = SlotStatus.CANCELLED
    db.commit()
    return {"ok": True}
