"""Endpoint-level tests for the image feature + booking lifecycle.

Uses a FakeDB (no Postgres needed) via FastAPI dependency_overrides for
get_db / get_current_user. Real password hashing + JWT are exercised.
"""
from fastapi.testclient import TestClient

from app.core.deps import get_current_user
from app.core.security import hash_password
from app.db.session import get_db
from app.main import app
from app.models.clinical import Drug
from app.models.enums import UserRole
from app.models.subtypes import Doctor, Patient
from app.models.user_account import UserAccount

client = TestClient(app)

PASSWORD = "Test123!"


class _FakeQuery:
    def __init__(self, result=None):
        self._result = result

    def filter_by(self, **kwargs):
        return self

    def filter(self, *args):
        return self

    def first(self):
        return self._result


class FakeDB:
    """Minimal Session stand-in: auto-assigns user_ids on flush like the DB would."""

    def __init__(self, *, first_by_model=None, get_by_key=None):
        self.added = []
        self._seq = 100
        self._first = first_by_model or {}
        self._get = get_by_key or {}

    def query(self, model):
        return _FakeQuery(self._first.get(model))

    def get(self, model, key):
        return self._get.get((model, key))

    def add(self, obj):
        self.added.append(obj)

    def flush(self):
        for o in self.added:
            if isinstance(o, UserAccount) and o.user_id is None:
                self._seq += 1
                o.user_id = self._seq

    def commit(self):
        pass

    def refresh(self, obj):
        pass

    def rollback(self):
        pass


def _user(user_id: int, role: UserRole) -> UserAccount:
    return UserAccount(user_id=user_id, email=f"u{user_id}@t.ge",
                       password_hash="x", role=role, is_active=True)


def _override(db: FakeDB, user: UserAccount | None = None):
    app.dependency_overrides[get_db] = lambda: db
    if user is not None:
        app.dependency_overrides[get_current_user] = lambda: user
    else:
        app.dependency_overrides.pop(get_current_user, None)


def teardown_function():
    app.dependency_overrides.clear()


# --- registration -----------------------------------------------------------

def test_register_doctor_requires_photo():
    _override(FakeDB())
    r = client.post("/api/v1/auth/register/doctor", json={
        "email": "d1@t.ge", "password": PASSWORD, "first_name": "A", "last_name": "B",
        "hospital_id": 1,
    })
    assert r.status_code == 422, r.text


def test_register_doctor_bad_photo_rejected():
    _override(FakeDB())
    r = client.post("/api/v1/auth/register/doctor", json={
        "email": "d2@t.ge", "password": PASSWORD, "first_name": "A", "last_name": "B",
        "hospital_id": 1, "photo_url": "not-a-url",
    })
    assert r.status_code == 422, r.text


def test_register_doctor_with_photo_ok():
    from app.models.catalog import Hospital
    db = FakeDB(get_by_key={(Hospital, 1): object()})
    _override(db)
    r = client.post("/api/v1/auth/register/doctor", json={
        "email": "d3@t.ge", "password": PASSWORD, "first_name": "Davit", "last_name": "M",
        "hospital_id": 1, "photo_url": "/avatars/doctors/davit.svg",
    })
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["role"] == "DOCTOR" and body["access_token"]
    docs = [o for o in db.added if isinstance(o, Doctor)]
    assert len(docs) == 1 and docs[0].photo_url == "/avatars/doctors/davit.svg"


def test_register_patient_avatar_optional_and_stored():
    db = FakeDB()
    _override(db)
    r = client.post("/api/v1/auth/register/patient", json={
        "email": "p1@t.ge", "password": PASSWORD, "first_name": "Ana", "last_name": "M",
    })
    assert r.status_code == 200, r.text
    pats = [o for o in db.added if isinstance(o, Patient)]
    assert len(pats) == 1 and pats[0].avatar_url is None

    db2 = FakeDB()
    _override(db2)
    r = client.post("/api/v1/auth/register/patient", json={
        "email": "p2@t.ge", "password": PASSWORD, "first_name": "Ana", "last_name": "M",
        "avatar_url": "/avatars/patients/ana.svg",
    })
    assert r.status_code == 200, r.text
    pats2 = [o for o in db2.added if isinstance(o, Patient)]
    assert pats2[0].avatar_url == "/avatars/patients/ana.svg"


# --- login ------------------------------------------------------------------

def _login_db() -> FakeDB:
    user = UserAccount(user_id=7, email="p@t.ge", password_hash=hash_password(PASSWORD),
                       role=UserRole.PATIENT, is_active=True)
    return FakeDB(first_by_model={UserAccount: user})


def test_login_success_and_wrong_password():
    _override(_login_db())
    r = client.post("/api/v1/auth/login", json={"email": "p@t.ge", "password": PASSWORD})
    assert r.status_code == 200, r.text
    assert r.json()["role"] == "PATIENT"

    _override(_login_db())
    r = client.post("/api/v1/auth/login", json={"email": "p@t.ge", "password": "Wrong123!"})
    assert r.status_code == 401, r.text


# --- profile ----------------------------------------------------------------

def test_patient_profile_update_and_get():
    patient = Patient(patient_id=5, first_name="Ana", last_name="M", avatar_url=None)
    db = FakeDB(get_by_key={(Patient, 5): patient})
    _override(db, _user(5, UserRole.PATIENT))
    r = client.patch("/api/v1/auth/me/profile", json={"avatar_url": "/avatars/patients/ana.svg"})
    assert r.status_code == 200, r.text
    assert r.json()["avatar_url"] == "/avatars/patients/ana.svg"

    r = client.get("/api/v1/auth/me/profile")
    assert r.status_code == 200, r.text
    assert r.json()["avatar_url"] == "/avatars/patients/ana.svg"


def test_doctor_profile_update():
    doctor = Doctor(doctor_id=6, hospital_id=1, first_name="D", last_name="M",
                    photo_url="/avatars/doctors/davit.svg")
    db = FakeDB(get_by_key={(Doctor, 6): doctor})
    _override(db, _user(6, UserRole.DOCTOR))
    r = client.patch("/api/v1/auth/me/profile", json={"photo_url": "https://cdn.t.ge/d.jpg"})
    assert r.status_code == 200, r.text
    assert r.json()["photo_url"] == "https://cdn.t.ge/d.jpg"


def test_admin_profile_forbidden():
    _override(FakeDB(), _user(9, UserRole.HOSPITAL_ADMIN))
    r = client.patch("/api/v1/auth/me/profile", json={"avatar_url": "/x.svg"})
    assert r.status_code == 403, r.text


# --- drug image ---------------------------------------------------------------

def test_drug_image_admin_ok_patient_forbidden():
    drug = Drug(drug_id=1, name="Ibuprofen", image_url=None)
    _override(FakeDB(get_by_key={(Drug, 1): drug}), _user(9, UserRole.HOSPITAL_ADMIN))
    r = client.patch("/api/v1/drugs/1", json={"image_url": "/drugs/ibuprofen.svg"})
    assert r.status_code == 200, r.text
    assert r.json()["image_url"] == "/drugs/ibuprofen.svg"

    drug2 = Drug(drug_id=1, name="Ibuprofen", image_url=None)
    _override(FakeDB(get_by_key={(Drug, 1): drug2}), _user(5, UserRole.PATIENT))
    r = client.patch("/api/v1/drugs/1", json={"image_url": "/drugs/ibuprofen.svg"})
    assert r.status_code == 403, r.text
    assert drug2.image_url is None


# --- booking lifecycle --------------------------------------------------------

def test_booking_success_and_cancel_flow():
    from datetime import datetime, timedelta, timezone
    from unittest.mock import MagicMock
    from app.models.enums import AppointmentStatus, SlotStatus
    from app.models.scheduling import Appointment, TimeSlot
    from app.services.booking import book_appointment, cancel_appointment

    slot = TimeSlot(slot_id=1, doctor_id=7, start_time=datetime.now(timezone.utc) + timedelta(hours=5),
                    end_time=datetime.now(timezone.utc) + timedelta(hours=6), status=SlotStatus.AVAILABLE)
    db = MagicMock()
    db.execute.return_value.scalar_one_or_none.return_value = slot
    appt = book_appointment(db, patient_id=5, slot_id=1, reason="check")
    assert appt.status == AppointmentStatus.SCHEDULED and slot.status == SlotStatus.BOOKED

    # patient cancel far in future -> allowed, slot freed
    db2 = MagicMock()
    db2.get.return_value = slot
    out = cancel_appointment(db2, appt, cancelled_by="PATIENT", reason=None)
    assert out.status == AppointmentStatus.CANCELLED and slot.status == SlotStatus.AVAILABLE

    # patient cancel inside cutoff -> 409
    from fastapi import HTTPException
    import pytest
    slot2 = TimeSlot(slot_id=2, doctor_id=7, start_time=datetime.now(timezone.utc) + timedelta(minutes=30),
                     end_time=datetime.now(timezone.utc) + timedelta(hours=1), status=SlotStatus.BOOKED)
    appt2 = Appointment(slot_id=2, doctor_id=7, patient_id=5, status=AppointmentStatus.SCHEDULED)
    db3 = MagicMock()
    db3.get.return_value = slot2
    with pytest.raises(HTTPException):
        cancel_appointment(db3, appt2, cancelled_by="PATIENT", reason=None)
