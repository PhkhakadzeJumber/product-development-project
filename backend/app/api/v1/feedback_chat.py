from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_role
from app.db.session import get_db
from app.models.enums import AppointmentStatus, MessageType, UserRole
from app.models.feedback import DoctorReview
from app.models.scheduling import Appointment
from app.models.chat import Conversation, Message
from app.models.user_account import UserAccount
from app.schemas.misc import MessageCreate, ReviewCreate, ReviewOut
from app.services.maintenance import refresh_performance

router = APIRouter(tags=["feedback-chat"])


@router.post("/reviews")
def create_review(data: ReviewCreate, db: Session = Depends(get_db),
                  user: UserAccount = Depends(require_role(UserRole.PATIENT))):
    appt = db.get(Appointment, data.appointment_id)
    if not appt or appt.patient_id != user.user_id:
        raise HTTPException(404, "Appointment not found")
    if appt.status != AppointmentStatus.COMPLETED:
        raise HTTPException(409, "Review requires COMPLETED appointment")
    if not 1 <= data.rating <= 5:
        raise HTTPException(422, "Rating 1..5")
    if db.query(DoctorReview).filter_by(appointment_id=data.appointment_id).first():
        raise HTTPException(409, "One review per appointment")
    r = DoctorReview(appointment_id=appt.appointment_id, doctor_id=appt.doctor_id,
                     patient_id=user.user_id, rating=data.rating, comment=data.comment)
    db.add(r)
    db.flush()
    refresh_performance(db, appt.doctor_id)
    db.commit()
    return {"review_id": r.review_id}


@router.get("/reviews", response_model=ReviewOut | None)
def get_review(appointment_id: int | None = None, db: Session = Depends(get_db),
               user: UserAccount = Depends(get_current_user)):
    """Return the caller's review for one appointment (or null). Lets the UI
    show 'already reviewed' instead of a dead Send button."""
    if not appointment_id:
        raise HTTPException(422, "appointment_id query param is required")
    r = db.query(DoctorReview).filter_by(appointment_id=appointment_id).first()
    if not r:
        return None
    role = UserRole(user.role)
    if role == UserRole.PATIENT and r.patient_id != user.user_id:
        raise HTTPException(403, "Not your review")
    if role == UserRole.DOCTOR and r.doctor_id != user.user_id:
        raise HTTPException(403, "Not your review")
    return r


@router.post("/conversations")
def get_or_create_conversation(patient_id: int, doctor_id: int, db: Session = Depends(get_db),
                               user: UserAccount = Depends(get_current_user)):
    role = UserRole(user.role)
    if role == UserRole.PATIENT and patient_id != user.user_id:
        raise HTTPException(403, "Not your conversation")
    if role == UserRole.DOCTOR and doctor_id != user.user_id:
        raise HTTPException(403, "Not your conversation")
    if role == UserRole.HOSPITAL_ADMIN:
        raise HTTPException(403, "Admins cannot chat")
    exists = db.query(Appointment).filter_by(patient_id=patient_id, doctor_id=doctor_id).filter(
        Appointment.status != AppointmentStatus.CANCELLED).first()
    if not exists:
        raise HTTPException(409, "Conversation requires a non-cancelled appointment between pair")
    conv = db.query(Conversation).filter_by(patient_id=patient_id, doctor_id=doctor_id).first()
    if not conv:
        conv = Conversation(patient_id=patient_id, doctor_id=doctor_id)
        db.add(conv)
        db.commit()
        db.refresh(conv)
    return {"conversation_id": conv.conversation_id}


@router.post("/conversations/{conversation_id}/messages")
def send_message(conversation_id: int, data: MessageCreate, db: Session = Depends(get_db),
                 user: UserAccount = Depends(get_current_user)):
    conv = db.get(Conversation, conversation_id)
    if not conv:
        raise HTTPException(404, "Not found")
    if user.user_id not in (conv.patient_id, conv.doctor_id):
        raise HTTPException(403, "Not your conversation")
    m = Message(conversation_id=conversation_id, sender_id=user.user_id,
                message_type=MessageType(data.message_type), body=data.body,
                attachment_url=data.attachment_url)
    db.add(m)
    db.commit()
    db.refresh(m)
    return {"message_id": m.message_id}


@router.get("/conversations/{conversation_id}/messages")
def list_messages(conversation_id: int, db: Session = Depends(get_db),
                  user: UserAccount = Depends(get_current_user)):
    conv = db.get(Conversation, conversation_id)
    if not conv or user.user_id not in (conv.patient_id, conv.doctor_id):
        raise HTTPException(404, "Not found")
    return db.query(Message).filter_by(conversation_id=conversation_id).order_by(Message.sent_at).all()
