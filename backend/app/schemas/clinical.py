from datetime import date
from pydantic import BaseModel, ConfigDict, Field, field_validator
from app.models.enums import CaseStatus, ConditionStatus, PrescriptionStatus, Severity


class TreatmentCaseCreate(BaseModel):
    patient_id: int
    title: str
    diagnosis: str | None = None
    icd_code: str | None = None
    severity: Severity | None = None


class TreatmentCaseUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=200)
    diagnosis: str | None = Field(default=None, max_length=1000)
    icd_code: str | None = Field(default=None, max_length=20)
    severity: Severity | None = None
    status: CaseStatus | None = None


class TreatmentCaseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    treatment_id: int
    patient_id: int
    doctor_id: int
    title: str
    status: CaseStatus


class ConsultationCreate(BaseModel):
    appointment_id: int
    treatment_id: int
    chief_complaint: str | None = None
    symptoms: str | None = None
    examination_notes: str | None = None
    condition_status: ConditionStatus | None = None
    vitals: dict | None = None
    follow_up_plan: str | None = None


class ConsultationUpdate(BaseModel):
    chief_complaint: str | None = Field(default=None, max_length=1000)
    symptoms: str | None = Field(default=None, max_length=2000)
    examination_notes: str | None = Field(default=None, max_length=4000)
    condition_status: ConditionStatus | None = None
    vitals: dict | None = None
    follow_up_plan: str | None = Field(default=None, max_length=2000)


class PrescriptionCreate(BaseModel):
    consultation_id: int
    treatment_id: int
    patient_id: int
    drug_id: int
    dosage: str | None = None
    frequency: str | None = None
    route: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    duration_note: str | None = Field(default=None, max_length=120)
    instructions: str | None = None

    _duration = field_validator("duration_note", mode="before")(
        lambda v: v.strip() if isinstance(v, str) and v.strip() else None
    )


class PrescriptionUpdate(BaseModel):
    dosage: str | None = Field(default=None, max_length=100)
    frequency: str | None = Field(default=None, max_length=100)
    route: str | None = Field(default=None, max_length=50)
    start_date: date | None = None
    end_date: date | None = None
    duration_note: str | None = Field(default=None, max_length=120)
    instructions: str | None = Field(default=None, max_length=1000)

    _duration = field_validator("duration_note", mode="before")(
        lambda v: v.strip() if isinstance(v, str) and v.strip() else None
    )


class PrescriptionDiscontinue(BaseModel):
    reason: str | None = Field(default=None, max_length=1000)


class PrescriptionSubstitute(BaseModel):
    drug_id: int
    dosage: str | None = None
    frequency: str | None = None
    route: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    duration_note: str | None = Field(default=None, max_length=120)
    instructions: str | None = None
    reason: str | None = Field(default=None, max_length=1000)

    _duration = field_validator("duration_note", mode="before")(
        lambda v: v.strip() if isinstance(v, str) and v.strip() else None
    )


class PrescriptionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    prescription_id: int
    patient_id: int
    doctor_id: int
    drug_id: int
    status: PrescriptionStatus
    dosage: str | None = None
    frequency: str | None = None
    route: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    duration_note: str | None = None
    instructions: str | None = None
    supersedes_id: int | None = None
