"""Between-visit care: running late, renewals, quick questions, waitlist.

Each feature traces to interview evidence (01-discovery/interview-logs/):
- DoctorDelay: an appointment does not tell a patient when they will be seen
  (logs 01, 02, 04).
- PrescriptionRenewal: the same prescription costs a monthly trip (log 01).
- PatientQuestion: patients cannot reach their doctor between visits and keep
  calling (logs 02, 03, 04, 07).
- WaitlistEntry: "if the book is full, you wait in pain" (log 05).

Statuses are plain strings (validated in app.models.enums) so adding a state
never needs a Postgres ALTER TYPE.
"""
from datetime import date, datetime
from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class DoctorDelay(Base):
    """How late a doctor is running on one clinic day. One row per doctor/day."""

    __tablename__ = "doctor_delays"

    delay_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("doctors.doctor_id", ondelete="CASCADE"), nullable=False, index=True)
    day: Mapped[date] = mapped_column(Date, nullable=False)
    delay_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    note: Mapped[str | None] = mapped_column(String(200), nullable=True)
    # Delay value patients were last told about, so small changes stay silent.
    notified_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    updated_by: Mapped[int | None] = mapped_column(ForeignKey("user_accounts.user_id"), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(),
                                                 onupdate=func.now(), nullable=False)

    __table_args__ = (UniqueConstraint("doctor_id", "day", name="uq_doctor_delay_day"),)


class PrescriptionRenewal(Base):
    __tablename__ = "prescription_renewals"

    renewal_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    prescription_id: Mapped[int] = mapped_column(ForeignKey("prescriptions.prescription_id"), nullable=False, index=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.patient_id"), nullable=False, index=True)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("doctors.doctor_id"), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="PENDING", index=True)
    patient_note: Mapped[str | None] = mapped_column(String(500), nullable=True)
    doctor_note: Mapped[str | None] = mapped_column(String(500), nullable=True)
    # The prescription issued on approval (supersedes the requested one).
    new_prescription_id: Mapped[int | None] = mapped_column(ForeignKey("prescriptions.prescription_id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class PatientQuestion(Base):
    __tablename__ = "patient_questions"

    question_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.patient_id"), nullable=False, index=True)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("doctors.doctor_id"), nullable=False, index=True)
    treatment_id: Mapped[int | None] = mapped_column(ForeignKey("treatment_cases.treatment_id"), nullable=True)
    urgency: Mapped[str] = mapped_column(String(16), nullable=False, default="ROUTINE")
    body: Mapped[str] = mapped_column(String(1000), nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="OPEN", index=True)
    answer: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    answered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # "Seen" receipts: the doctor opened it / the patient read the answer.
    doctor_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    patient_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class WaitlistEntry(Base):
    __tablename__ = "waitlist_entries"

    entry_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.patient_id"), nullable=False, index=True)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("doctors.doctor_id"), nullable=False, index=True)
    # Only offer slots starting on or before this day (None = any earlier slot).
    wanted_before: Mapped[date | None] = mapped_column(Date, nullable=True)
    note: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="WAITING", index=True)
    offered_slot_id: Mapped[int | None] = mapped_column(ForeignKey("time_slots.slot_id"), nullable=True)
    offered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    offer_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    appointment_id: Mapped[int | None] = mapped_column(ForeignKey("appointments.appointment_id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
