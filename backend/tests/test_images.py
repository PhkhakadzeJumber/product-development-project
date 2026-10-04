from app.schemas.auth import RegisterDoctor, RegisterPatient
from app.schemas.misc import DrugOut, DoctorPublicOut
import pytest
from pydantic import ValidationError


def test_doctor_photo_required():
    with pytest.raises(ValidationError):
        RegisterDoctor(
            email="d@d.ge", password="Test123!", first_name="A", last_name="B",
            hospital_id=1, photo_url="",
        )
    # valid relative + https URLs accepted
    RegisterDoctor(
        email="d@d.ge", password="Test123!", first_name="A", last_name="B",
        hospital_id=1, photo_url="/avatars/doctors/davit.svg",
    )
    RegisterDoctor(
        email="d@d.ge", password="Test123!", first_name="A", last_name="B",
        hospital_id=1, photo_url="https://example.com/a.jpg",
    )
    with pytest.raises(ValidationError):
        RegisterDoctor(
            email="d@d.ge", password="Test123!", first_name="A", last_name="B",
            hospital_id=1, photo_url="not-a-url",
        )


def test_patient_avatar_optional():
    p = RegisterPatient(email="p@p.ge", password="Test123!", first_name="A", last_name="B")
    assert p.avatar_url is None
    p2 = RegisterPatient(email="p@p.ge", password="Test123!", first_name="A", last_name="B",
                         avatar_url="/avatars/patients/ana.svg")
    assert p2.avatar_url == "/avatars/patients/ana.svg"
    with pytest.raises(ValidationError):
        RegisterPatient(email="p@p.ge", password="Test123!", first_name="A", last_name="B",
                        avatar_url="notaurl")


def test_doctor_public_out_has_photo():
    d = DoctorPublicOut(doctor_id=1, hospital_id=1, first_name="A", last_name="B",
                        photo_url="/avatars/doctors/davit.svg")
    assert d.photo_url == "/avatars/doctors/davit.svg"
    d2 = DoctorPublicOut(doctor_id=1, hospital_id=1, first_name="A", last_name="B")
    assert d2.photo_url is None  # placeholder fallback in UI


def test_drug_out_has_image():
    d = DrugOut(drug_id=1, name="Ibuprofen", image_url="/drugs/ibuprofen.svg")
    assert d.image_url == "/drugs/ibuprofen.svg"
