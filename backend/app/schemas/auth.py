import re
from datetime import date
from pydantic import BaseModel, EmailStr, Field, field_validator
from app.models.enums import Gender, UserRole

PASSWORD_MIN_LENGTH = 8
PASSWORD_MAX_BYTES = 72
PASSWORD_PATTERN = re.compile(r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$")

COMMON_PASSWORDS = {
    "password", "password1", "password123", "12345678", "123456789",
    "qwerty123", "letmein123", "welcome123", "admin123",
}

PASSWORD_HELP = (
    "Password must be 8+ characters with uppercase, lowercase, digit and symbol."
)


def validate_password_strength(password: str) -> str:
    if len(password) < PASSWORD_MIN_LENGTH:
        raise ValueError(f"Password must be at least {PASSWORD_MIN_LENGTH} characters")
    if len(password.encode("utf-8")) > PASSWORD_MAX_BYTES:
        raise ValueError("Password must be at most 72 bytes long")
    if not PASSWORD_PATTERN.match(password):
        raise ValueError(PASSWORD_HELP)
    if password.lower() in COMMON_PASSWORDS:
        raise ValueError("Password is too common, choose a stronger one")
    return password


def normalize_email(email: str) -> str:
    return email.strip().lower()


def non_empty_name(value: str, field_name: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError(f"{field_name} is required")
    if len(cleaned) > 100:
        raise ValueError(f"{field_name} must be at most 100 characters")
    return cleaned


def _validate_image_url(value: str | None, *, required: bool) -> str | None:
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


def _validate_optional_image_url(value: str | None) -> str | None:
    return _validate_image_url(value, required=False)


def _validate_required_image_url(value: str | None) -> str:
    result = _validate_image_url(value, required=True)
    assert result is not None
    return result


class RegisterBase(BaseModel):
    email: EmailStr
    phone: str | None = Field(default=None, max_length=32)
    password: str = Field(min_length=PASSWORD_MIN_LENGTH, max_length=256)

    _normalize_email = field_validator("email", mode="before")(lambda v: v.strip().lower() if isinstance(v, str) else v)
    _check_password = field_validator("password", mode="after")(lambda v: validate_password_strength(v))

    _normalize_phone = field_validator("phone", mode="before")(
        lambda v: v.strip() if isinstance(v, str) and v.strip() else None
    )


class RegisterPatient(RegisterBase):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    date_of_birth: date | None = None
    gender: Gender | None = None
    region_id: int | None = None
    city: str | None = Field(default=None, max_length=100)
    address: str | None = Field(default=None, max_length=255)
    avatar_url: str | None = Field(default=None, max_length=500)

    _first = field_validator("first_name", mode="before")(lambda v: v.strip() if isinstance(v, str) else v)
    _last = field_validator("last_name", mode="before")(lambda v: v.strip() if isinstance(v, str) else v)
    _city = field_validator("city", mode="before")(lambda v: v.strip() if isinstance(v, str) and v.strip() else None)
    _address = field_validator("address", mode="before")(lambda v: v.strip() if isinstance(v, str) and v.strip() else None)
    _avatar = field_validator("avatar_url", mode="before")(lambda v: _validate_optional_image_url(v))


class RegisterDoctor(RegisterBase):
    hospital_id: int
    specialization_id: int | None = None
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    license_number: str | None = Field(default=None, max_length=100)
    photo_url: str = Field(min_length=1, max_length=500)

    _first = field_validator("first_name", mode="before")(lambda v: v.strip() if isinstance(v, str) else v)
    _last = field_validator("last_name", mode="before")(lambda v: v.strip() if isinstance(v, str) else v)
    _lic = field_validator("license_number", mode="before")(
        lambda v: v.strip() if isinstance(v, str) and v.strip() else None
    )
    _photo = field_validator("photo_url", mode="before")(lambda v: _validate_required_image_url(v))


class RegisterAdmin(RegisterBase):
    hospital_id: int
    full_name: str = Field(min_length=1, max_length=200)

    _full = field_validator("full_name", mode="before")(lambda v: v.strip() if isinstance(v, str) else v)


class Login(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)

    _normalize_email = field_validator("email", mode="before")(lambda v: v.strip().lower() if isinstance(v, str) else v)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: UserRole
    user_id: int
