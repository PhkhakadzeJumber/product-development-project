from datetime import date, datetime
from sqlalchemy import JSON, Date, DateTime, Enum, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.enums import CaseStatus, ConditionStatus, PrescriptionStatus, Severity


class TreatmentCase(Base):
    __tablename__ = "treatment_cases"

    treatment_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.patient_id"), nullable=False, index=True)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("doctors.doctor_id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    diagnosis: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    icd_code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    severity: Mapped[Severity | None] = mapped_column(Enum(Severity, name="severity"), nullable=True)
    status: Mapped[CaseStatus] = mapped_column(Enum(CaseStatus, name="case_status"), nullable=False, default=CaseStatus.OPEN)
    started_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    ended_on: Mapped[date | None] = mapped_column(Date, nullable=True)


class Consultation(Base):
    __tablename__ = "consultations"

    consultation_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    appointment_id: Mapped[int] = mapped_column(
        ForeignKey("appointments.appointment_id"), nullable=False, unique=True, index=True
    )
    treatment_id: Mapped[int] = mapped_column(ForeignKey("treatment_cases.treatment_id"), nullable=False, index=True)
    chief_complaint: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    symptoms: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    examination_notes: Mapped[str | None] = mapped_column(String(4000), nullable=True)
    condition_status: Mapped[ConditionStatus | None] = mapped_column(
        Enum(ConditionStatus, name="condition_status"), nullable=True
    )
    vitals: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    follow_up_plan: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Drug(Base):
    __tablename__ = "drugs"

    drug_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    generic_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    form: Mapped[str | None] = mapped_column(String(50), nullable=True)
    strength: Mapped[str | None] = mapped_column(String(50), nullable=True)
    description: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)


class Prescription(Base):
    __tablename__ = "prescriptions"

    prescription_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    consultation_id: Mapped[int] = mapped_column(ForeignKey("consultations.consultation_id"), nullable=False, index=True)
    treatment_id: Mapped[int] = mapped_column(ForeignKey("treatment_cases.treatment_id"), nullable=False, index=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.patient_id"), nullable=False, index=True)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("doctors.doctor_id"), nullable=False, index=True)
    drug_id: Mapped[int] = mapped_column(ForeignKey("drugs.drug_id"), nullable=False, index=True)
    dosage: Mapped[str | None] = mapped_column(String(100), nullable=True)
    frequency: Mapped[str | None] = mapped_column(String(100), nullable=True)
    route: Mapped[str | None] = mapped_column(String(50), nullable=True)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    # Human-readable intended duration, e.g. "for about a month".
    # end_date stays NULL (open-ended) until the doctor stops the drug.
    duration_note: Mapped[str | None] = mapped_column(String(120), nullable=True)
    instructions: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    discontinue_reason: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    # Substitute chain: new prescription points at the one it replaces.
    supersedes_id: Mapped[int | None] = mapped_column(
        ForeignKey("prescriptions.prescription_id"), nullable=True, index=True)
    status: Mapped[PrescriptionStatus] = mapped_column(
        Enum(PrescriptionStatus, name="prescription_status"), nullable=False, default=PrescriptionStatus.ACTIVE, index=True
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
