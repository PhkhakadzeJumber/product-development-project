from datetime import date
from pydantic import BaseModel, ConfigDict
from app.models.enums import CaseStatus, ConditionStatus, PrescriptionStatus, Severity


class TreatmentCaseCreate(BaseModel):
    patient_id: int
    title: str
    diagnosis: str | None = None
    icd_code: str | None = None
    severity: Severity | None = None


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
    instructions: str | None = None


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
    instructions: str | None = None
