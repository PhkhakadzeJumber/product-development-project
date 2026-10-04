from datetime import date
from sqlalchemy import Date, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.enums import Gender


class Patient(Base):
    """Subtype of UserAccount. PK is also FK to user_accounts (shared-PK inheritance)."""

    __tablename__ = "patients"

    patient_id: Mapped[int] = mapped_column(ForeignKey("user_accounts.user_id", ondelete="CASCADE"), primary_key=True)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    gender: Mapped[Gender | None] = mapped_column(Enum(Gender, name="gender"), nullable=True)
    region_id: Mapped[int | None] = mapped_column(ForeignKey("regions.region_id"), nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    address: Mapped[str | None] = mapped_column(String(255), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)


class Doctor(Base):
    __tablename__ = "doctors"

    doctor_id: Mapped[int] = mapped_column(ForeignKey("user_accounts.user_id", ondelete="CASCADE"), primary_key=True)
    hospital_id: Mapped[int] = mapped_column(ForeignKey("hospitals.hospital_id"), nullable=False, index=True)
    specialization_id: Mapped[int | None] = mapped_column(ForeignKey("specializations.specialization_id"), nullable=True, index=True)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    bio: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    qualifications: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    years_of_experience: Mapped[int | None] = mapped_column(Integer, nullable=True)
    license_number: Mapped[str | None] = mapped_column(String(100), unique=True, nullable=True)
    photo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)


class HospitalAdmin(Base):
    __tablename__ = "hospital_admins"

    admin_id: Mapped[int] = mapped_column(ForeignKey("user_accounts.user_id", ondelete="CASCADE"), primary_key=True)
    hospital_id: Mapped[int] = mapped_column(ForeignKey("hospitals.hospital_id"), nullable=False, index=True)
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
