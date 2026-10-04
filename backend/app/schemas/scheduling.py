from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.enums import AppointmentStatus, CancelledBy, ConsultationMode, SlotStatus


class SlotCreate(BaseModel):
    doctor_id: int
    start_time: datetime
    end_time: datetime
    consultation_mode: ConsultationMode = ConsultationMode.IN_PERSON

    def model_post_init(self, _context) -> None:
        if self.end_time <= self.start_time:
            raise ValueError("end_time must be after start_time")
        duration_min = (self.end_time - self.start_time).total_seconds() / 60
        if duration_min < 30:
            raise ValueError("Slot must be at least 30 minutes long")


class SlotOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    slot_id: int
    doctor_id: int
    start_time: datetime
    end_time: datetime
    consultation_mode: ConsultationMode
    status: SlotStatus


class AppointmentCreate(BaseModel):
    slot_id: int
    reason: str | None = None


class AppointmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    appointment_id: int
    slot_id: int
    doctor_id: int
    patient_id: int
    status: AppointmentStatus
    reason: str | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
    consultation_mode: ConsultationMode | None = None


class AppointmentCancel(BaseModel):
    cancel_reason: str | None = None


class AppointmentDetailOut(BaseModel):
    appointment_id: int
    slot_id: int
    doctor_id: int
    patient_id: int
    status: AppointmentStatus
    reason: str | None = None
    booked_at: datetime | None = None
    cancelled_at: datetime | None = None
    cancelled_by: CancelledBy | None = None
    cancel_reason: str | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
    consultation_mode: ConsultationMode | None = None
    doctor_first_name: str | None = None
    doctor_last_name: str | None = None
    doctor_photo_url: str | None = None
    patient_first_name: str | None = None
    patient_last_name: str | None = None
    patient_avatar_url: str | None = None
    consultation_id: int | None = None
    treatment_id: int | None = None
