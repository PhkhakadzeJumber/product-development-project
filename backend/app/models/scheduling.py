from datetime import datetime
from sqlalchemy import DateTime, Enum, ForeignKey, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.enums import AppointmentStatus, CancelledBy, ConsultationMode, SlotStatus


class TimeSlot(Base):
    __tablename__ = "time_slots"

    slot_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("doctors.doctor_id", ondelete="CASCADE"), nullable=False, index=True)
    created_by_admin_id: Mapped[int | None] = mapped_column(ForeignKey("hospital_admins.admin_id"), nullable=True)
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    consultation_mode: Mapped[ConsultationMode] = mapped_column(
        Enum(ConsultationMode, name="consultation_mode"), nullable=False, default=ConsultationMode.IN_PERSON
    )
    status: Mapped[SlotStatus] = mapped_column(
        Enum(SlotStatus, name="slot_status"), nullable=False, default=SlotStatus.AVAILABLE, index=True
    )

    # NOTE: no-overlap enforced in migration via Postgres EXCLUDE USING gist
    # (doctor_id WITH =, tstzrange(start_time, end_time) WITH &&).


class Appointment(Base):
    __tablename__ = "appointments"

    appointment_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    slot_id: Mapped[int] = mapped_column(ForeignKey("time_slots.slot_id"), nullable=False, index=True)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("doctors.doctor_id"), nullable=False, index=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.patient_id"), nullable=False, index=True)
    status: Mapped[AppointmentStatus] = mapped_column(
        Enum(AppointmentStatus, name="appointment_status"), nullable=False, default=AppointmentStatus.SCHEDULED, index=True
    )
    reason: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    booked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cancelled_by: Mapped[CancelledBy | None] = mapped_column(Enum(CancelledBy, name="cancelled_by"), nullable=True)
    cancel_reason: Mapped[str | None] = mapped_column(String(1000), nullable=True)

    __table_args__ = (
        # One non-cancelled appointment per slot prevents double booking.
        Index("uq_slot_single_active", "slot_id", unique=True,
              postgresql_where=(status != AppointmentStatus.CANCELLED)),
    )
