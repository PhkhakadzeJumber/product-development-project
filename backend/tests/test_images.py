from app.schemas.auth import RegisterDoctor, RegisterPatient, validate_phone
from app.schemas.misc import DrugOut, DoctorPublicOut
import pytest
from pydantic import ValidationError

PHONE = "+995555000001"


def test_doctor_photo_optional():
    # photo upload removed from registration — optional, initials placeholder in UI
    d = RegisterDoctor(
        email="d@d.ge", password="Test123!", phone=PHONE, first_name="A", last_name="B",
        hospital_id=1,
    )
    assert d.photo_url is None
    RegisterDoctor(
        email="d@d.ge", password="Test123!", phone=PHONE, first_name="A", last_name="B",
        hospital_ids=[1, 2], photo_url="/avatars/doctors/davit.svg",
    )
    RegisterDoctor(
        email="d@d.ge", password="Test123!", phone=PHONE, first_name="A", last_name="B",
        hospital_ids=[1], photo_url="https://example.com/a.jpg",
    )
    with pytest.raises(ValidationError):
        RegisterDoctor(
            email="d@d.ge", password="Test123!", phone=PHONE, first_name="A", last_name="B",
            hospital_id=1, photo_url="not-a-url",
        )


def test_doctor_hospital_ids_resolve():
    d = RegisterDoctor(
        email="d@d.ge", password="Test123!", phone=PHONE, first_name="A", last_name="B",
        hospital_ids=[2, 1, 2],
    )
    assert d.resolved_hospital_ids() == [2, 1]
    d2 = RegisterDoctor(
        email="d@d.ge", password="Test123!", phone=PHONE, first_name="A", last_name="B",
        hospital_id=1,
    )
    assert d2.resolved_hospital_ids() == [1]
    d3 = RegisterDoctor(
        email="d@d.ge", password="Test123!", phone=PHONE, first_name="A", last_name="B",
    )
    with pytest.raises(ValueError):
        d3.resolved_hospital_ids()


def test_phone_required_and_validated():
    with pytest.raises(ValidationError):
        RegisterPatient(email="p@p.ge", password="Test123!", first_name="A", last_name="B")
    with pytest.raises(ValidationError):
        RegisterPatient(email="p@p.ge", password="Test123!", phone="abc",
                        first_name="A", last_name="B")
    with pytest.raises(ValidationError):
        RegisterPatient(email="p@p.ge", password="Test123!", phone="123",
                        first_name="A", last_name="B")
    p = RegisterPatient(email="p@p.ge", password="Test123!", phone=PHONE,
                        first_name="A", last_name="B")
    assert p.phone == PHONE
    assert validate_phone("  +995 555 00 00 01 ") == "+995 555 00 00 01"


def test_patient_avatar_optional():
    p = RegisterPatient(email="p@p.ge", password="Test123!", phone=PHONE,
                        first_name="A", last_name="B")
    assert p.avatar_url is None
    p2 = RegisterPatient(email="p@p.ge", password="Test123!", phone=PHONE,
                         first_name="A", last_name="B",
                         avatar_url="/avatars/patients/ana.svg")
    assert p2.avatar_url == "/avatars/patients/ana.svg"
    with pytest.raises(ValidationError):
        RegisterPatient(email="p@p.ge", password="Test123!", phone=PHONE,
                        first_name="A", last_name="B", avatar_url="notaurl")


def test_doctor_public_out_has_photo():
    d = DoctorPublicOut(doctor_id=1, hospital_id=1, first_name="A", last_name="B",
                        photo_url="/avatars/doctors/davit.svg")
    assert d.photo_url == "/avatars/doctors/davit.svg"
    d2 = DoctorPublicOut(doctor_id=1, hospital_id=1, first_name="A", last_name="B")
    assert d2.photo_url is None  # placeholder fallback in UI


def test_drug_out_has_image():
    d = DrugOut(drug_id=1, name="Ibuprofen", image_url="/drugs/ibuprofen.svg")
    assert d.image_url == "/drugs/ibuprofen.svg"
