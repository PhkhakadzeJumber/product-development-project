from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class NotificationChannel(str):
    EMAIL = "EMAIL"
    SMS = "SMS"


class NotificationStatus(str):
    PENDING = "PENDING"
    SENT = "SENT"
    LOGGED = "LOGGED"  # delivery disabled (dev/placeholder mode): logged only
    SKIPPED = "SKIPPED"  # delivery on but recipient not in allowlist
    FAILED = "FAILED"


class NotificationOutbox(Base):
    """One row per outbound prescription message.

    Written in the same DB transaction as the clinical change so the intent
    is never lost. The sender (BackgroundTasks in v1) delivers or logs it.

    SAFETY: rows are inert data. Real delivery only happens in
    services.notifications when the channel flag is on AND credentials are
    present AND (no allowlist OR recipient listed). Tests assert silence.
    """

    __tablename__ = "notification_outbox"

    notification_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    channel: Mapped[str] = mapped_column(String(8), nullable=False, index=True)
    recipient: Mapped[str] = mapped_column(String(255), nullable=False)
    subject: Mapped[str | None] = mapped_column(String(255), nullable=True)
    body: Mapped[str] = mapped_column(String(4000), nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="PENDING", index=True)
    prescription_id: Mapped[int | None] = mapped_column(
        ForeignKey("prescriptions.prescription_id"), nullable=True, index=True)
    patient_id: Mapped[int | None] = mapped_column(nullable=True, index=True)
    error: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
