from datetime import date, datetime
from pydantic import BaseModel, Field, field_validator

from app.models.enums import QuestionUrgency


def _strip_or_none(v):
    return v.strip() if isinstance(v, str) and v.strip() else None


# --- running late -------------------------------------------------------------

class DelayUpdate(BaseModel):
    delay_minutes: int = Field(ge=0, le=240)
    note: str | None = Field(default=None, max_length=200)

    _note = field_validator("note", mode="before")(_strip_or_none)


class DelayOut(BaseModel):
    doctor_id: int
    day: date
    delay_minutes: int
    note: str | None = None
    updated_at: datetime | None = None
    patients_notified: int | None = None


# --- renewals -------------------------------------------------------------------

class RenewalCreate(BaseModel):
    note: str | None = Field(default=None, max_length=500)

    _note = field_validator("note", mode="before")(_strip_or_none)


class RenewalApprove(BaseModel):
    # How long the renewed prescription runs; None keeps it open-ended.
    days: int | None = Field(default=30, ge=1, le=365)
    doctor_note: str | None = Field(default=None, max_length=500)

    _note = field_validator("doctor_note", mode="before")(_strip_or_none)


class RenewalDecline(BaseModel):
    doctor_note: str | None = Field(default=None, max_length=500)

    _note = field_validator("doctor_note", mode="before")(_strip_or_none)


class RenewalOut(BaseModel):
    renewal_id: int
    prescription_id: int
    patient_id: int
    doctor_id: int
    status: str
    patient_note: str | None = None
    doctor_note: str | None = None
    new_prescription_id: int | None = None
    created_at: datetime | None = None
    decided_at: datetime | None = None
    drug_id: int | None = None
    drug_name: str | None = None
    dosage: str | None = None
    frequency: str | None = None
    prescription_status: str | None = None
    patient_first_name: str | None = None
    patient_last_name: str | None = None
    doctor_first_name: str | None = None
    doctor_last_name: str | None = None


# --- questions --------------------------------------------------------------------

class QuestionCreate(BaseModel):
    doctor_id: int
    body: str = Field(min_length=3, max_length=1000)
    urgency: QuestionUrgency = QuestionUrgency.ROUTINE
    treatment_id: int | None = None

    @field_validator("body")
    @classmethod
    def _body(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3:
            raise ValueError("Write your question in a few words")
        return v


class QuestionAnswer(BaseModel):
    answer: str = Field(min_length=1, max_length=2000)

    @field_validator("answer")
    @classmethod
    def _answer(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Answer cannot be empty")
        return v


class QuestionOut(BaseModel):
    question_id: int
    patient_id: int
    doctor_id: int
    treatment_id: int | None = None
    urgency: str
    body: str
    status: str
    answer: str | None = None
    created_at: datetime | None = None
    answered_at: datetime | None = None
    doctor_seen_at: datetime | None = None
    patient_seen_at: datetime | None = None
    due_by: datetime | None = None
    overdue: bool = False
    patient_first_name: str | None = None
    patient_last_name: str | None = None
    doctor_first_name: str | None = None
    doctor_last_name: str | None = None


class QuestionSummary(BaseModel):
    open: int = 0            # doctor: open questions; patient: questions waiting for an answer
    unseen: int = 0          # doctor: open and not opened yet; patient: answers not read yet
    overdue: int = 0         # doctor only: open past the reply window


class QuestionSettings(BaseModel):
    doctor_id: int
    first_name: str | None = None
    last_name: str | None = None
    questions_open: bool
    reply_within_hours: int
    reply_note: str | None = None


class QuestionSettingsUpdate(BaseModel):
    questions_open: bool | None = None
    reply_within_hours: int | None = Field(default=None, ge=4, le=168)
    reply_note: str | None = Field(default=None, max_length=200)

    _note = field_validator("reply_note", mode="before")(
        lambda v: v.strip() if isinstance(v, str) else v
    )


# --- waitlist -----------------------------------------------------------------------

class WaitlistCreate(BaseModel):
    doctor_id: int
    wanted_before: date | None = None
    note: str | None = Field(default=None, max_length=500)

    _note = field_validator("note", mode="before")(_strip_or_none)


class WaitlistOut(BaseModel):
    entry_id: int
    patient_id: int
    doctor_id: int
    wanted_before: date | None = None
    note: str | None = None
    status: str
    offered_slot_id: int | None = None
    offered_start: datetime | None = None
    offered_at: datetime | None = None
    offer_expires_at: datetime | None = None
    appointment_id: int | None = None
    created_at: datetime | None = None
    position: int | None = None
    doctor_first_name: str | None = None
    doctor_last_name: str | None = None
    patient_first_name: str | None = None
    patient_last_name: str | None = None
