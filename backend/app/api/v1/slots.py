from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_role
from app.db.session import get_db
from app.models.enums import SlotStatus, UserRole
from app.models.scheduling import TimeSlot
from app.models.subtypes import Doctor, HospitalAdmin
from app.models.user_account import UserAccount
from app.schemas.scheduling import SlotCreate, SlotOut

router = APIRouter(tags=["slots"])


@router.get("/slots", response_model=list[SlotOut])
def list_slots(doctor_id: int | None = None, status: SlotStatus | None = None,
               future_only: bool = False,
               db: Session = Depends(get_db), _: UserAccount = Depends(get_current_user)):
    q = db.query(TimeSlot)
    if doctor_id:
        q = q.filter_by(doctor_id=doctor_id)
    if status:
        q = q.filter_by(status=status)
    if future_only:
        q = q.filter(TimeSlot.start_time > datetime.now(timezone.utc))
    return q.order_by(TimeSlot.start_time).limit(200).all()


@router.post("/slots", response_model=SlotOut)
def create_slot(data: SlotCreate, db: Session = Depends(get_db),
                user: UserAccount = Depends(require_role(UserRole.HOSPITAL_ADMIN))):
    admin = db.get(HospitalAdmin, user.user_id)
    doctor = db.get(Doctor, data.doctor_id)
    if not doctor:
        raise HTTPException(404, "Doctor not found")
    if admin and doctor.hospital_id != admin.hospital_id:
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
    db.commit()
    db.refresh(slot)
    return slot


@router.delete("/slots/{slot_id}")
def delete_slot(slot_id: int, db: Session = Depends(get_db),
                 user: UserAccount = Depends(require_role(UserRole.HOSPITAL_ADMIN))):
    slot = db.get(TimeSlot, slot_id)
    if not slot:
        raise HTTPException(404, "Slot not found")
    if slot.status == SlotStatus.BOOKED:
        raise HTTPException(409, "Cannot delete booked slot")
    slot.status = SlotStatus.CANCELLED
    db.commit()
    return {"ok": True}
