from pydantic import BaseModel, ConfigDict, Field, field_validator


def validate_image_url(value: str | None, *, required: bool = False) -> str | None:
    """Accept https:// URLs or local /avatars/... /drugs/... paths. Empty -> None (optional) or error (required)."""
    if value is None or (isinstance(value, str) and not value.strip()):
        if required:
            raise ValueError("Photo is required")
        return None
    v = value.strip()
    if len(v) > 500:
        raise ValueError("Image URL must be at most 500 characters")
    if v.startswith("/"):
        return v
    if v.startswith("https://") or v.startswith("http://"):
        return v
    raise ValueError("Image must be an https:// URL or a /local/path")


class DoctorPublicOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    doctor_id: int
    hospital_id: int
    hospital_ids: list[int] | None = None
    specialization_id: int | None = None
    first_name: str
    last_name: str
    bio: str | None = None
    qualifications: str | None = None
    years_of_experience: int | None = None
    photo_url: str | None = None
    hospital_name: str | None = None
    specialization_name: str | None = None


class DrugOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    drug_id: int
    name: str
    generic_name: str | None = None
    form: str | None = None
    strength: str | None = None
    description: str | None = None
    image_url: str | None = None


class ProfileUpdate(BaseModel):
    avatar_url: str | None = None
    photo_url: str | None = None
    phone: str | None = Field(default=None, max_length=32)

    _avatar = field_validator("avatar_url", mode="before")(lambda v: validate_image_url(v) if v is not None else None)
    _photo = field_validator("photo_url", mode="before")(lambda v: validate_image_url(v) if v is not None else None)
    _phone = field_validator("phone", mode="before")(
        lambda v: v.strip() if isinstance(v, str) and v.strip() else None
    )


class DrugImageUpdate(BaseModel):
    image_url: str | None = None

    _img = field_validator("image_url", mode="before")(lambda v: validate_image_url(v) if v is not None else None)


class ReviewCreate(BaseModel):
    appointment_id: int
    rating: int
    comment: str | None = None


class ReviewOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    review_id: int
    appointment_id: int
    doctor_id: int
    patient_id: int
    rating: int
    comment: str | None = None


class MessageCreate(BaseModel):
    body: str | None = None
    message_type: str = "TEXT"
    attachment_url: str | None = None
