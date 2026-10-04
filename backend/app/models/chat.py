from datetime import datetime
from sqlalchemy import BigInteger, DateTime, Enum, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.enums import MessageType


class Conversation(Base):
    __tablename__ = "conversations"

    conversation_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.patient_id"), nullable=False, index=True)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("doctors.doctor_id"), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (UniqueConstraint("patient_id", "doctor_id", name="uq_conversation_pair"),)


class Message(Base):
    __tablename__ = "messages"

    message_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    conversation_id: Mapped[int] = mapped_column(ForeignKey("conversations.conversation_id", ondelete="CASCADE"), nullable=False, index=True)
    sender_id: Mapped[int] = mapped_column(ForeignKey("user_accounts.user_id"), nullable=False, index=True)
    message_type: Mapped[MessageType] = mapped_column(
        Enum(MessageType, name="message_type"), nullable=False, default=MessageType.TEXT
    )
    body: Mapped[str | None] = mapped_column(String(4000), nullable=True)
    attachment_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
