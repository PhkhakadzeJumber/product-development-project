from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class DoctorReview(Base):
    __tablename__ = "doctor_reviews"

    review_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    appointment_id: Mapped[int] = mapped_column(
        ForeignKey("appointments.appointment_id"), nullable=False, unique=True, index=True
    )
    doctor_id: Mapped[int] = mapped_column(ForeignKey("doctors.doctor_id"), nullable=False, index=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.patient_id"), nullable=False, index=True)
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    comment: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class DoctorPerformance(Base):
    __tablename__ = "doctor_performance"

    doctor_id: Mapped[int] = mapped_column(ForeignKey("doctors.doctor_id", ondelete="CASCADE"), primary_key=True)
    average_rating: Mapped[float | None] = mapped_column(Numeric(3, 2), nullable=True)
    review_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    popularity_score: Mapped[float | None] = mapped_column(Numeric(6, 2), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
