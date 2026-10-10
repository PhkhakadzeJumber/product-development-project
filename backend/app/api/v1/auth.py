from fastapi import APIRouter, Depends, HTTPException, status  
from sqlalchemy.exc import IntegrityError                      
from sqlalchemy.orm import Session                             

from app.core.security import create_access_token, hash_password, verify_password
from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.catalog import Hospital, Region, Specialization
from app.models.enums import UserRole
from app.models.subtypes import Doctor, DoctorHospital, HospitalAdmin, Patient
from app.models.user_account import UserAccount
from app.schemas.auth import Login, RegisterAdmin, RegisterDoctor, RegisterPatient, Token
from app.schemas.misc import ProfileUpdate

router = APIRouter(prefix="/auth", tags=["auth"])

# DEV ONLY: doctor/admin self-registration is open so the team can test
# role flows without a bootstrap admin. Lock down before production
# (require HOSPITAL_ADMIN / super-admin) — see note on each endpoint.


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _create_user(db: Session, email: str, phone: str | None, password: str, role: UserRole) -> UserAccount:
    email = _normalize_email(email)
    if db.query(UserAccount).filter_by(email=email).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")
    try:
        user = UserAccount(email=email, phone=phone, password_hash=hash_password(password), role=role)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(500, f"Password hashing failed: {exc}")
    db.add(user)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")
    return user


def _require_hospital(db: Session, hospital_id: int) -> None:
    if not db.get(Hospital, hospital_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Hospital {hospital_id} not found")


def _require_optional_fk(db: Session, model, fk_id: int | None, label: str) -> None:
    if fk_id is not None and not db.get(model, fk_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"{label} {fk_id} not found")


def _commit_or_409(db: Session, conflict_detail: str = "Registration failed") -> None:
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        msg = str(getattr(exc, "orig", exc)).lower()
        if "license" in msg or "unique" in msg:
            raise HTTPException(status.HTTP_409_CONFLICT, "License number already registered")
        if "foreign key" in msg or "violates" in msg:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Referenced hospital/region/specialization does not exist")
        raise HTTPException(status.HTTP_409_CONFLICT, conflict_detail)


def _token_for(user: UserAccount) -> Token:
    return Token(access_token=create_access_token(str(user.user_id), user.role.value), role=user.role, user_id=user.user_id)


@router.post("/register/patient", response_model=Token)
def register_patient(data: RegisterPatient, db: Session = Depends(get_db)):
    _require_optional_fk(db, Region, data.region_id, "Region")
    user = _create_user(db, data.email, data.phone, data.password, UserRole.PATIENT)
    db.add(Patient(patient_id=user.user_id, first_name=data.first_name, last_name=data.last_name,
                   date_of_birth=data.date_of_birth, gender=data.gender, region_id=data.region_id,
                   city=data.city, address=data.address, avatar_url=data.avatar_url))
    _commit_or_409(db)
    return _token_for(user)


@router.post("/register/doctor", response_model=Token)
def register_doctor(data: RegisterDoctor, db: Session = Depends(get_db)):
    """DEV ONLY — open self-registration for testing. Restrict to admins before prod."""
    try:
        hospital_ids = data.resolved_hospital_ids()
    except ValueError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc))
    for hid in hospital_ids:
        _require_hospital(db, hid)
    _require_optional_fk(db, Specialization, data.specialization_id, "Specialization")
    if data.license_number and db.query(Doctor).filter_by(license_number=data.license_number).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "License number already registered")
    user = _create_user(db, data.email, data.phone, data.password, UserRole.DOCTOR)
    db.add(Doctor(doctor_id=user.user_id, hospital_id=hospital_ids[0],
                 specialization_id=data.specialization_id, first_name=data.first_name,
                 last_name=data.last_name, license_number=data.license_number,
                 photo_url=data.photo_url))
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Registration failed")
    for hid in hospital_ids:
        db.add(DoctorHospital(doctor_id=user.user_id, hospital_id=hid))
    _commit_or_409(db)
    return _token_for(user)


@router.post("/register/admin", response_model=Token)
def register_admin(data: RegisterAdmin, db: Session = Depends(get_db)):
    """DEV ONLY — open self-registration for testing. Restrict to admins before prod."""
    _require_hospital(db, data.hospital_id)
    try:
        first_name, last_name = data.resolved_names()
    except ValueError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc))
    user = _create_user(db, data.email, data.phone, data.password, UserRole.HOSPITAL_ADMIN)
    db.add(HospitalAdmin(admin_id=user.user_id, hospital_id=data.hospital_id,
                         first_name=first_name, last_name=last_name,
                         full_name=f"{first_name} {last_name}"))
    _commit_or_409(db)
    return _token_for(user)


@router.post("/login", response_model=Token)
def login(data: Login, db: Session = Depends(get_db)):
    user = db.query(UserAccount).filter_by(email=_normalize_email(data.email)).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account is deactivated")
    return _token_for(user)


@router.patch("/me/profile")
def update_my_profile(data: ProfileUpdate, db: Session = Depends(get_db),
                      user: UserAccount = Depends(get_current_user)):
    role = UserRole(user.role)
    if data.phone is not None:
        if not data.phone.strip():
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Phone number is required")
        user.phone = data.phone.strip()
    if role == UserRole.PATIENT:
        patient = db.get(Patient, user.user_id)
        if not patient:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Patient profile not found")
        if data.avatar_url is not None:
            patient.avatar_url = data.avatar_url
        db.commit()
        db.refresh(patient)
        return {"patient_id": patient.patient_id, "avatar_url": patient.avatar_url,
                "email": user.email, "phone": user.phone}
    if role == UserRole.DOCTOR:
        doctor = db.get(Doctor, user.user_id)
        if not doctor:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Doctor profile not found")
        if data.photo_url is not None:
            if not data.photo_url.strip():
                raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Photo is required")
            doctor.photo_url = data.photo_url
        db.commit()
        db.refresh(doctor)
        return {"doctor_id": doctor.doctor_id, "photo_url": doctor.photo_url,
                "email": user.email, "phone": user.phone}
    if data.avatar_url is not None or data.photo_url is not None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admins have no photo profile")
    db.commit()
    return {"admin_id": user.user_id, "email": user.email, "phone": user.phone}


@router.get("/me/profile")
def get_my_profile(db: Session = Depends(get_db), user: UserAccount = Depends(get_current_user)):
    role = UserRole(user.role)
    if role == UserRole.PATIENT:
        patient = db.get(Patient, user.user_id)
        return {"patient_id": user.user_id,
                "first_name": patient.first_name if patient else None,
                "last_name": patient.last_name if patient else None,
                "avatar_url": patient.avatar_url if patient else None,
                "email": user.email, "phone": user.phone}
    if role == UserRole.DOCTOR:
        doctor = db.get(Doctor, user.user_id)
        return {"doctor_id": user.user_id,
                "first_name": doctor.first_name if doctor else None,
                "last_name": doctor.last_name if doctor else None,
                "photo_url": doctor.photo_url if doctor else None,
                "email": user.email, "phone": user.phone}
    admin = db.get(HospitalAdmin, user.user_id)
    return {"admin_id": user.user_id,
            "first_name": admin.first_name if admin else None,
            "last_name": admin.last_name if admin else None,
            "full_name": admin.full_name if admin else None,
            "hospital_id": admin.hospital_id if admin else None,
            "email": user.email, "phone": user.phone}
