"""Regression tests: hospital admins are scoped to their own hospital.

Uses FakeDB (no Postgres needed) via FastAPI dependency_overrides,
mirroring tests/test_api_images.py.
Covers step 1a-1e: cross-hospital admin cancel/slot-delete/profile/contact
are rejected, admin review reads are forbidden, and admin slot listing is
scoped to the admin's hospital.
"""
from types import SimpleNamespace

from fastapi.testclient import TestClient

from app.core.deps import get_current_user
from app.db.session import get_db
from app.main import app
from app.models.enums import AppointmentStatus, UserRole
from app.models.feedback import DoctorReview
from app.models.scheduling import Appointment, TimeSlot
from app.models.subtypes import Doctor, DoctorHospital, HospitalAdmin, Patient
from app.models.user_account import UserAccount

client = TestClient(app)

# --- fakes -------------------------------------------------------------------

class _FakeQuery:
    def __init__(self, result=None):
        self._result = result

    def filter_by(self, **kwargs):
        return self

    def filter(self, *args):
        return self

    def order_by(self, *args):
        return self

    def limit(self, *args):
        return self

    def first(self):
        return self._result

    def all(self):
        if self._result is None:
            return []
        return self._result if isinstance(self._result, list) else [self._result]


class FakeDB:
    def __init__(self, *, first_by_model=None, get_by_key=None):
        self._first = first_by_model or {}
        self._get = get_by_key or {}

    def query(self, model):
        return _FakeQuery(self._first.get(model))

    def get(self, model, key):
        return self._get.get((model, key))

    def add(self, obj):
        pass

    def commit(self):
        pass

    def refresh(self, obj):
        pass

    def rollback(self):
        pass


def _admin(user_id: int) -> UserAccount:
    return UserAccount(user_id=user_id, email=f"admin{user_id}@t.ge",
                       password_hash="x", role=UserRole.HOSPITAL_ADMIN, is_active=True)


def _override(db: FakeDB, user: UserAccount):
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: user


def teardown_function():
    app.dependency_overrides.clear()


# --- 1a: admin cancel is hospital-scoped ---------------------------------------

def test_admin_cancel_other_hospital_visit_forbidden():
    appt = Appointment(appointment_id=1, slot_id=1, doctor_id=20, patient_id=30,
                       status=AppointmentStatus.SCHEDULED)
    db = FakeDB(get_by_key={
        (Appointment, 1): appt,
        # Admin of hospital 1, doctor belongs to hospital 2.
        (HospitalAdmin, 100): HospitalAdmin(admin_id=100, hospital_id=1),
        (Doctor, 20): Doctor(doctor_id=20, hospital_id=2),
    })
    _override(db, _admin(100))
    r = client.post("/api/v1/appointments/1/cancel", json={})
    assert r.status_code == 403, r.text


# --- 1b: admin slot delete is hospital-scoped ----------------------------------

def test_admin_delete_other_hospital_slot_forbidden():
    db = FakeDB(get_by_key={
        (TimeSlot, 1): TimeSlot(slot_id=1, doctor_id=20),
        (HospitalAdmin, 100): HospitalAdmin(admin_id=100, hospital_id=1),
        (Doctor, 20): Doctor(doctor_id=20, hospital_id=2),
    })
    _override(db, _admin(100))
    r = client.delete("/api/v1/slots/1")
    assert r.status_code == 403, r.text


# --- 1c: admin profile/contact are hospital-scoped ------------------------------

def test_admin_patient_profile_other_hospital_not_found():
    db = FakeDB(get_by_key={
        (Patient, 7): Patient(patient_id=7, first_name="Ana", last_name="M"),
        (HospitalAdmin, 100): HospitalAdmin(admin_id=100, hospital_id=1),
    })
    _override(db, _admin(100))
    r = client.get("/api/v1/patients/7/profile")
    # 404 (not 403) so cross-hospital patient existence is not revealed.
    assert r.status_code == 404, r.text


def test_admin_doctor_contact_other_hospital_forbidden():
    db = FakeDB(get_by_key={
        (Doctor, 20): Doctor(doctor_id=20, hospital_id=2, first_name="D", last_name="B"),
        (HospitalAdmin, 100): HospitalAdmin(admin_id=100, hospital_id=1),
    })
    _override(db, _admin(100))
    r = client.get("/api/v1/doctors/20/contact")
    assert r.status_code == 403, r.text


def test_admin_doctor_contact_own_hospital_allowed():
    db = FakeDB(
        first_by_model={DoctorHospital: [SimpleNamespace(doctor_id=20, hospital_id=1)]},
        get_by_key={
            (Doctor, 20): Doctor(doctor_id=20, hospital_id=1, first_name="D", last_name="B"),
            (HospitalAdmin, 100): HospitalAdmin(admin_id=100, hospital_id=1),
        },
    )
    _override(db, _admin(100))
    r = client.get("/api/v1/doctors/20/contact")
    assert r.status_code == 200, r.text


# --- 1d: admins cannot read reviews ---------------------------------------------

def test_admin_get_review_forbidden():
    review = DoctorReview(appointment_id=5, doctor_id=20, patient_id=30, rating=5)
    db = FakeDB(first_by_model={DoctorReview: review})
    _override(db, _admin(100))
    r = client.get("/api/v1/reviews", params={"appointment_id": 5})
    assert r.status_code == 403, r.text


# --- 1e: admin slot listing is hospital-scoped -----------------------------------

def test_admin_slot_list_other_hospital_doctor_empty():
    db = FakeDB(
        first_by_model={DoctorHospital: [SimpleNamespace(doctor_id=20, hospital_id=1)]},
        get_by_key={(HospitalAdmin, 100): HospitalAdmin(admin_id=100, hospital_id=1)},
    )
    _override(db, _admin(100))
    r = client.get("/api/v1/slots", params={"doctor_id": 99})
    assert r.status_code == 200, r.text
    assert r.json() == []
