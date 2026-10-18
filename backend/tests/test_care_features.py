"""End-to-end tests for the between-visit care features:
running late + check-in, prescription renewals, patient questions, waitlist.

Runs every request through the real routers and services against an
in-memory SQLite database (no Postgres needed). Notification delivery is
stubbed out: these tests only check which outbox rows get queued, and the
delivery-safety guarantees stay covered by test_notifications.py.
"""
from datetime import date, datetime, timedelta, timezone

import pytest
from fastapi import Depends
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.models.care  # noqa: F401  (register tables)
import app.models.catalog  # noqa: F401
import app.models.chat  # noqa: F401
import app.models.feedback  # noqa: F401
import app.models.notifications  # noqa: F401
from app.api.v1 import clinical as clinical_api
from app.core.deps import get_current_user
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.care import PrescriptionRenewal, WaitlistEntry
from app.models.catalog import Hospital
from app.models.clinical import Consultation, Drug, Prescription, TreatmentCase
from app.models.enums import (
    AppointmentStatus, CaseStatus, PrescriptionStatus, SlotStatus, UserRole,
)
from app.models.notifications import NotificationOutbox
from app.models.scheduling import Appointment, TimeSlot
from app.models.subtypes import Doctor, HospitalAdmin, Patient
from app.models.user_account import UserAccount
from app.services import care


# --- harness ------------------------------------------------------------------

class World:
    """One fresh database per test, plus helpers to build rows and act as a user."""

    def __init__(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False},
                                    poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine, autoflush=False, expire_on_commit=False)
        self.db = self.Session()
        self.current_user_id: int | None = None
        self.client = TestClient(app)
        self._next_id = 1
        self.hospital = self._add(Hospital(name="Kutaisi Polyclinic", city="Kutaisi"))
        self.other_hospital = self._add(Hospital(name="Tbilisi Central", city="Tbilisi"))

    # rows
    def _add(self, obj):
        self.db.add(obj)
        self.db.commit()
        return obj

    def _account(self, role: UserRole, phone: str | None = "+995555000000") -> UserAccount:
        uid = self._next_id
        self._next_id += 1
        return self._add(UserAccount(user_id=uid, email=f"user{uid}@test.ge", phone=phone,
                                     password_hash="x", role=role, is_active=True))

    def patient(self, first="Gela") -> Patient:
        acc = self._account(UserRole.PATIENT)
        return self._add(Patient(patient_id=acc.user_id, first_name=first, last_name="Test"))

    def doctor(self, hospital=None, first="Nino") -> Doctor:
        acc = self._account(UserRole.DOCTOR)
        return self._add(Doctor(doctor_id=acc.user_id, hospital_id=(hospital or self.hospital).hospital_id,
                                first_name=first, last_name="Doc", is_active=True))

    def admin(self, hospital=None) -> HospitalAdmin:
        acc = self._account(UserRole.HOSPITAL_ADMIN)
        h = hospital or self.hospital
        return self._add(HospitalAdmin(admin_id=acc.user_id, hospital_id=h.hospital_id,
                                       first_name="Ana", last_name="Admin", full_name="Ana Admin"))

    def slot(self, doctor: Doctor, start: datetime, status=SlotStatus.AVAILABLE) -> TimeSlot:
        return self._add(TimeSlot(doctor_id=doctor.doctor_id, start_time=start,
                                  end_time=start + timedelta(minutes=30), status=status))

    def visit(self, doctor: Doctor, patient: Patient, start: datetime) -> Appointment:
        s = self.slot(doctor, start, status=SlotStatus.BOOKED)
        return self._add(Appointment(slot_id=s.slot_id, doctor_id=doctor.doctor_id,
                                     patient_id=patient.patient_id, status=AppointmentStatus.SCHEDULED))

    def prescription(self, doctor: Doctor, patient: Patient, *, status=PrescriptionStatus.ACTIVE,
                     case_status=CaseStatus.IN_TREATMENT) -> Prescription:
        appt = self.visit(doctor, patient, datetime.now(timezone.utc) + timedelta(days=40))
        case = self._add(TreatmentCase(patient_id=patient.patient_id, doctor_id=doctor.doctor_id,
                                       title="Hypertension", status=case_status))
        consult = self._add(Consultation(appointment_id=appt.appointment_id, treatment_id=case.treatment_id))
        drug = self._add(Drug(name="Enalapril", strength="10 mg"))
        return self._add(Prescription(consultation_id=consult.consultation_id, treatment_id=case.treatment_id,
                                      patient_id=patient.patient_id, doctor_id=doctor.doctor_id,
                                      drug_id=drug.drug_id, dosage="10 mg", frequency="Once a day",
                                      start_date=date.today() - timedelta(days=30), status=status))

    # acting
    def as_(self, who):
        self.current_user_id = getattr(who, "patient_id", None) or getattr(who, "doctor_id", None) \
            or getattr(who, "admin_id", None)
        return self.client

    def outbox(self, kind: str | None = None, patient_id: int | None = None) -> list[NotificationOutbox]:
        self.db.expire_all()
        q = self.db.query(NotificationOutbox)
        if kind:
            q = q.filter_by(kind=kind)
        if patient_id:
            q = q.filter_by(patient_id=patient_id)
        return q.all()

    def refresh(self, obj):
        self.db.expire_all()
        return self.db.get(type(obj), _pk(obj))


def _pk(obj):
    return obj.__mapper__.primary_key_from_instance(obj)[0]


@pytest.fixture
def w(monkeypatch):
    world = World()

    def _get_db():
        s = world.Session()
        try:
            yield s
        finally:
            s.close()

    def _current_user(db=Depends(get_db)):
        return db.get(UserAccount, world.current_user_id)

    app.dependency_overrides[get_db] = _get_db
    app.dependency_overrides[get_current_user] = _current_user
    # Delivery is out of scope here: never touch the real DB/SMTP/Twilio.
    monkeypatch.setattr(clinical_api, "_process_pending_task", lambda: None)
    yield world
    app.dependency_overrides.clear()
    world.db.close()


def soon(minutes=5) -> datetime:
    """A start time later today (clinic time). Skips near midnight to stay deterministic."""
    start = datetime.now(timezone.utc) + timedelta(minutes=minutes)
    if care.clinic_day(start) != care.clinic_today():
        pytest.skip("too close to clinic midnight for a same-day visit")
    return start


def days_ahead(n: int, hour_utc: int = 8) -> datetime:
    d = datetime.now(timezone.utc) + timedelta(days=n)
    return d.replace(hour=hour_utc, minute=0, second=0, microsecond=0)


# --- 1. running late + check-in --------------------------------------------------

def test_delay_shows_expected_start_and_notifies_todays_patients(w):
    doc, pat = w.doctor(), w.patient()
    start = soon()
    appt = w.visit(doc, pat, start)
    later = w.visit(doc, w.patient("Zura"), days_ahead(3))  # not today: never told

    r = w.as_(doc).put(f"/api/v1/doctors/{doc.doctor_id}/delay", json={"delay_minutes": 40, "note": "Walk-ins"})
    assert r.status_code == 200, r.text
    assert r.json()["delay_minutes"] == 40 and r.json()["patients_notified"] == 1

    rows = w.outbox("delay", pat.patient_id)
    assert {x.channel for x in rows} == {"EMAIL", "SMS"}
    assert "running about 40 minutes late" in rows[0].body
    assert w.outbox("delay", later.patient_id) == []

    mine = w.as_(pat).get("/api/v1/appointments/mine").json()
    me = next(a for a in mine if a["appointment_id"] == appt.appointment_id)
    assert me["delay_minutes"] == 40
    expected = datetime.fromisoformat(me["expected_start"].replace("Z", "+00:00"))
    assert abs((care._as_utc(expected) - (start + timedelta(minutes=40))).total_seconds()) < 1

    detail = w.as_(pat).get(f"/api/v1/appointments/{appt.appointment_id}").json()
    assert detail["delay_minutes"] == 40


def test_small_delay_changes_stay_silent_and_back_on_time_is_announced(w):
    doc, pat = w.doctor(), w.patient()
    w.visit(doc, pat, soon())
    put = lambda m: w.as_(doc).put(f"/api/v1/doctors/{doc.doctor_id}/delay", json={"delay_minutes": m}).json()

    assert put(10)["patients_notified"] == 0          # under the 15-minute floor
    assert put(30)["patients_notified"] == 1
    assert put(35)["patients_notified"] == 0          # moved less than 10 minutes
    assert put(45)["patients_notified"] == 1
    assert put(0)["patients_notified"] == 1           # back on schedule
    bodies = [x.body for x in w.outbox("delay", pat.patient_id) if x.channel == "SMS"]
    assert len(bodies) == 3 and "back on schedule" in bodies[-1]


def test_who_may_set_a_delay(w):
    doc, other_doc, pat = w.doctor(), w.doctor(first="Levan"), w.patient()
    own_admin, foreign_admin = w.admin(), w.admin(w.other_hospital)
    url = f"/api/v1/doctors/{doc.doctor_id}/delay"
    body = {"delay_minutes": 20}
    assert w.as_(other_doc).put(url, json=body).status_code == 403
    assert w.as_(pat).put(url, json=body).status_code == 403
    assert w.as_(foreign_admin).put(url, json=body).status_code == 403
    assert w.as_(own_admin).put(url, json=body).status_code == 200
    assert w.as_(doc).put(url, json={"delay_minutes": 500}).status_code == 422
    assert w.as_(pat).get(url).json()["delay_minutes"] == 20


def test_check_in_only_on_the_day_and_only_own_visit(w):
    doc, pat, stranger = w.doctor(), w.patient(), w.patient("Other")
    today = w.visit(doc, pat, soon())
    future = w.visit(doc, pat, days_ahead(2))

    assert w.as_(stranger).post(f"/api/v1/appointments/{today.appointment_id}/check-in").status_code == 403
    r = w.as_(pat).post(f"/api/v1/appointments/{today.appointment_id}/check-in")
    assert r.status_code == 200 and r.json()["checked_in_at"]
    first = r.json()["checked_in_at"]
    assert w.as_(w.admin()).post(f"/api/v1/appointments/{today.appointment_id}/check-in").json()["checked_in_at"] == first
    assert w.as_(pat).post(f"/api/v1/appointments/{future.appointment_id}/check-in").status_code == 409


# --- 2. prescription renewals --------------------------------------------------------

def test_renewal_request_and_approval_issues_a_superseding_prescription(w):
    doc, pat = w.doctor(), w.patient()
    rx = w.prescription(doc, pat)

    r = w.as_(pat).post(f"/api/v1/prescriptions/{rx.prescription_id}/renewals", json={"note": "Running out on Friday"})
    assert r.status_code == 200, r.text
    ren = r.json()
    assert ren["status"] == "PENDING" and ren["drug_name"] == "Enalapril"
    assert w.as_(pat).post(f"/api/v1/prescriptions/{rx.prescription_id}/renewals", json={}).status_code == 409

    inbox = w.as_(doc).get("/api/v1/renewals?status=PENDING").json()
    assert [x["renewal_id"] for x in inbox] == [ren["renewal_id"]]
    assert inbox[0]["patient_first_name"] == "Gela"

    r = w.as_(doc).post(f"/api/v1/renewals/{ren['renewal_id']}/approve", json={"days": 30})
    assert r.status_code == 200, r.text
    approved = r.json()
    assert approved["status"] == "APPROVED" and approved["new_prescription_id"]

    new = w.db.get(Prescription, approved["new_prescription_id"])
    old = w.refresh(rx)
    assert new.status == PrescriptionStatus.ACTIVE and new.supersedes_id == rx.prescription_id
    assert new.end_date == care.clinic_today() + timedelta(days=30)
    assert new.dosage == "10 mg" and new.frequency == "Once a day"
    assert old.status == PrescriptionStatus.COMPLETED
    sms = [x for x in w.outbox("prescription", pat.patient_id) if x.channel == "SMS"]
    assert sms and "renewed your Enalapril prescription" in sms[0].body

    # A decided request cannot be decided again.
    assert w.as_(doc).post(f"/api/v1/renewals/{ren['renewal_id']}/decline", json={}).status_code == 409


def test_renewal_decline_notifies_without_the_note(w):
    doc, pat = w.doctor(), w.patient()
    rx = w.prescription(doc, pat)
    ren = w.as_(pat).post(f"/api/v1/prescriptions/{rx.prescription_id}/renewals", json={}).json()
    r = w.as_(doc).post(f"/api/v1/renewals/{ren['renewal_id']}/decline",
                        json={"doctor_note": "Your blood pressure log needs a check first"})
    assert r.status_code == 200 and r.json()["status"] == "DECLINED"
    assert r.json()["doctor_note"] == "Your blood pressure log needs a check first"
    rows = w.outbox("renewal", pat.patient_id)
    assert rows and all("blood pressure log" not in x.body for x in rows)
    assert w.refresh(rx).status == PrescriptionStatus.ACTIVE  # nothing changes on decline


def test_renewal_guards(w):
    doc, pat, stranger, other_doc = w.doctor(), w.patient(), w.patient("Other"), w.doctor(first="Levan")
    stopped = w.prescription(doc, pat, status=PrescriptionStatus.DISCONTINUED)
    closed = w.prescription(doc, pat, case_status=CaseStatus.CLOSED)
    ok = w.prescription(doc, pat)
    post = lambda who, rx: w.as_(who).post(f"/api/v1/prescriptions/{rx.prescription_id}/renewals", json={})

    assert post(pat, stopped).status_code == 409
    assert post(pat, closed).status_code == 409
    assert post(stranger, ok).status_code == 404
    assert post(doc, ok).status_code == 403  # doctors do not request renewals

    ren = post(pat, ok).json()
    assert w.as_(other_doc).post(f"/api/v1/renewals/{ren['renewal_id']}/approve", json={}).status_code == 404
    assert w.as_(stranger).post(f"/api/v1/renewals/{ren['renewal_id']}/cancel").status_code == 404
    r = w.as_(pat).post(f"/api/v1/renewals/{ren['renewal_id']}/cancel")
    assert r.status_code == 200 and r.json()["status"] == "CANCELLED"
    # After cancelling, a fresh request is allowed again.
    assert post(pat, ok).status_code == 200


def test_open_ended_renewal(w):
    doc, pat = w.doctor(), w.patient()
    rx = w.prescription(doc, pat)
    ren = w.as_(pat).post(f"/api/v1/prescriptions/{rx.prescription_id}/renewals", json={}).json()
    approved = w.as_(doc).post(f"/api/v1/renewals/{ren['renewal_id']}/approve", json={"days": None}).json()
    assert w.db.get(Prescription, approved["new_prescription_id"]).end_date is None


# --- 3. patient questions --------------------------------------------------------------

def test_question_flow_with_seen_receipts_and_answer_notification(w):
    doc, pat = w.doctor(), w.patient()
    w.visit(doc, pat, days_ahead(10))

    askable = w.as_(pat).get("/api/v1/questions/doctors").json()
    assert [d["doctor_id"] for d in askable] == [doc.doctor_id] and askable[0]["reply_within_hours"] == 48

    r = w.as_(pat).post("/api/v1/questions", json={
        "doctor_id": doc.doctor_id, "urgency": "SOON",
        "body": "New tablet since Monday, sugar 3.4 this morning. Half the dose?"})
    assert r.status_code == 200, r.text
    q = r.json()
    assert q["status"] == "OPEN" and q["due_by"] and not q["overdue"]
    assert w.outbox() == []  # never texts the doctor

    assert w.as_(doc).get("/api/v1/questions/summary").json() == {"open": 1, "unseen": 1, "overdue": 0}
    assert w.as_(doc).post(f"/api/v1/questions/{q['question_id']}/seen").json()["doctor_seen_at"]
    assert w.as_(doc).get("/api/v1/questions/summary").json()["unseen"] == 0
    assert w.as_(pat).get(f"/api/v1/questions").json()[0]["doctor_seen_at"]  # patient sees "seen"

    r = w.as_(doc).post(f"/api/v1/questions/{q['question_id']}/answer",
                        json={"answer": "Yes, take half a tablet and come on Thursday."})
    assert r.status_code == 200 and r.json()["status"] == "ANSWERED"
    rows = w.outbox("question_answered", pat.patient_id)
    assert {x.channel for x in rows} == {"EMAIL", "SMS"}
    assert all("half a tablet" not in x.body for x in rows)  # clinical text stays in the app

    assert w.as_(pat).get("/api/v1/questions/summary").json() == {"open": 0, "unseen": 1, "overdue": 0}
    w.as_(pat).post(f"/api/v1/questions/{q['question_id']}/seen")
    assert w.as_(pat).get("/api/v1/questions/summary").json()["unseen"] == 0
    assert w.as_(doc).post(f"/api/v1/questions/{q['question_id']}/answer", json={"answer": "again"}).status_code == 409


def test_question_guards(w):
    doc, pat, stranger_doc = w.doctor(), w.patient(), w.doctor(first="Levan")
    w.visit(doc, pat, days_ahead(10))
    ask = lambda **kw: w.as_(pat).post("/api/v1/questions", json={"doctor_id": doc.doctor_id, "body": "A short question", **kw})

    assert w.as_(pat).post("/api/v1/questions", json={"doctor_id": stranger_doc.doctor_id, "body": "Hello doctor"}).status_code == 403
    assert ask(body="  ").status_code == 422
    for _ in range(3):
        assert ask().status_code == 200
    assert ask().status_code == 409  # max 3 open questions per doctor

    q_id = w.as_(pat).get("/api/v1/questions").json()[0]["question_id"]
    assert w.as_(stranger_doc).post(f"/api/v1/questions/{q_id}/answer", json={"answer": "x"}).status_code == 404
    assert w.as_(pat).post(f"/api/v1/questions/{q_id}/close").json()["status"] == "CLOSED"
    assert ask().status_code == 200  # closing one frees a place

    r = w.as_(doc).patch("/api/v1/doctors/me/question-settings",
                         json={"questions_open": False, "reply_within_hours": 24, "reply_note": "Weekdays before 17:00"})
    assert r.status_code == 200 and r.json()["reply_note"] == "Weekdays before 17:00"
    assert w.as_(pat).get(f"/api/v1/doctors/{doc.doctor_id}/question-settings").json()["questions_open"] is False
    assert ask().status_code == 409  # doctor paused questions


def test_doctor_inbox_puts_soon_questions_first(w):
    doc, a, b = w.doctor(), w.patient("Gocha"), w.patient("Zura")
    w.visit(doc, a, days_ahead(5))
    w.visit(doc, b, days_ahead(6))
    w.as_(a).post("/api/v1/questions", json={"doctor_id": doc.doctor_id, "body": "Routine question"})
    w.as_(b).post("/api/v1/questions", json={"doctor_id": doc.doctor_id, "body": "Something changed", "urgency": "SOON"})
    inbox = w.as_(doc).get("/api/v1/questions").json()
    assert [q["urgency"] for q in inbox] == ["SOON", "ROUTINE"]
    assert w.as_(w.admin()).get("/api/v1/questions").status_code == 403


# --- 4. waitlist ---------------------------------------------------------------------------

def test_cancellation_offers_slot_to_first_waiting_patient_and_holds_it(w):
    doc, booked, first, second = w.doctor(), w.patient("Booked"), w.patient("First"), w.patient("Second")
    appt = w.visit(doc, booked, days_ahead(2))

    e1 = w.as_(first).post("/api/v1/waitlist", json={"doctor_id": doc.doctor_id, "note": "Back pain"})
    assert e1.status_code == 200, e1.text
    assert w.as_(first).post("/api/v1/waitlist", json={"doctor_id": doc.doctor_id}).status_code == 409
    e2 = w.as_(second).post("/api/v1/waitlist", json={"doctor_id": doc.doctor_id}).json()
    assert e2["position"] == 2

    assert w.as_(booked).post(f"/api/v1/appointments/{appt.appointment_id}/cancel", json={}).status_code == 200

    mine = w.as_(first).get("/api/v1/waitlist").json()[0]
    assert mine["status"] == "OFFERED" and mine["offered_slot_id"] == appt.slot_id and mine["offer_expires_at"]
    offer_sms = [x for x in w.outbox("waitlist_offer", first.patient_id) if x.channel == "SMS"]
    assert offer_sms and "held for you" in offer_sms[0].body

    # The held slot is invisible and unbookable for everyone else...
    assert appt.slot_id not in [s["slot_id"] for s in w.as_(second).get(f"/api/v1/slots?doctor_id={doc.doctor_id}").json()]
    assert w.as_(second).post("/api/v1/appointments", json={"slot_id": appt.slot_id}).status_code == 409
    # ...but marked as held for the holder.
    mine_slots = w.as_(first).get(f"/api/v1/slots?doctor_id={doc.doctor_id}").json()
    assert any(s["slot_id"] == appt.slot_id and s["held_for_me"] for s in mine_slots)

    r = w.as_(first).post(f"/api/v1/waitlist/{mine['entry_id']}/accept")
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "BOOKED" and r.json()["appointment_id"]
    slot = w.refresh(w.db.get(TimeSlot, appt.slot_id))
    assert slot.status == SlotStatus.BOOKED and slot.held_for_patient_id is None
    assert w.as_(second).get("/api/v1/waitlist").json()[0]["position"] == 1


def test_declined_offer_moves_to_next_patient(w):
    doc, booked, first, second = w.doctor(), w.patient("Booked"), w.patient("First"), w.patient("Second")
    appt = w.visit(doc, booked, days_ahead(2))
    e1 = w.as_(first).post("/api/v1/waitlist", json={"doctor_id": doc.doctor_id}).json()
    w.as_(second).post("/api/v1/waitlist", json={"doctor_id": doc.doctor_id})
    w.as_(booked).post(f"/api/v1/appointments/{appt.appointment_id}/cancel", json={})

    r = w.as_(first).post(f"/api/v1/waitlist/{e1['entry_id']}/decline")
    assert r.status_code == 200 and r.json()["status"] == "WAITING"
    nxt = w.as_(second).get("/api/v1/waitlist").json()[0]
    assert nxt["status"] == "OFFERED" and nxt["offered_slot_id"] == appt.slot_id


def test_expired_offer_moves_on_and_holder_can_no_longer_accept(w):
    doc, booked, first, second = w.doctor(), w.patient("Booked"), w.patient("First"), w.patient("Second")
    appt = w.visit(doc, booked, days_ahead(2))
    e1 = w.as_(first).post("/api/v1/waitlist", json={"doctor_id": doc.doctor_id}).json()
    w.as_(second).post("/api/v1/waitlist", json={"doctor_id": doc.doctor_id})
    w.as_(booked).post(f"/api/v1/appointments/{appt.appointment_id}/cancel", json={})

    past = datetime.now(timezone.utc) - timedelta(minutes=1)
    entry = w.db.get(WaitlistEntry, e1["entry_id"])
    entry.offer_expires_at = past
    w.db.get(TimeSlot, appt.slot_id).held_until = past
    w.db.commit()

    assert w.as_(first).post(f"/api/v1/waitlist/{e1['entry_id']}/accept").status_code == 409
    assert w.as_(first).get("/api/v1/waitlist").json()[0]["status"] == "WAITING"
    assert w.as_(second).get("/api/v1/waitlist").json()[0]["status"] == "OFFERED"


def test_wanted_before_and_new_slots(w):
    doc, early, anytime = w.doctor(), w.patient("Early"), w.patient("Anytime")
    admin = w.admin()
    # Joined first but only wants something within 3 days.
    w.as_(early).post("/api/v1/waitlist", json={"doctor_id": doc.doctor_id,
                                                "wanted_before": (care.clinic_today() + timedelta(days=3)).isoformat()})
    w.as_(anytime).post("/api/v1/waitlist", json={"doctor_id": doc.doctor_id})
    assert w.as_(early).post("/api/v1/waitlist", json={"doctor_id": doc.doctor_id,
                                                       "wanted_before": "2020-01-01"}).status_code in (409, 422)

    start = days_ahead(10)
    r = w.as_(admin).post("/api/v1/slots", json={"doctor_id": doc.doctor_id,
                                                  "start_time": start.isoformat(),
                                                  "end_time": (start + timedelta(minutes=30)).isoformat()})
    assert r.status_code == 200, r.text
    assert w.as_(early).get("/api/v1/waitlist").json()[0]["status"] == "WAITING"  # day 10 is too late
    assert w.as_(anytime).get("/api/v1/waitlist").json()[0]["status"] == "OFFERED"


def test_holder_booking_from_slots_page_settles_the_entry_and_leaving_releases(w):
    doc, booked, first, second = w.doctor(), w.patient("Booked"), w.patient("First"), w.patient("Second")
    appt = w.visit(doc, booked, days_ahead(2))
    e1 = w.as_(first).post("/api/v1/waitlist", json={"doctor_id": doc.doctor_id}).json()
    w.as_(second).post("/api/v1/waitlist", json={"doctor_id": doc.doctor_id})
    w.as_(booked).post(f"/api/v1/appointments/{appt.appointment_id}/cancel", json={})

    # Leaving the waitlist while holding an offer hands the slot to the next patient.
    assert w.as_(first).post(f"/api/v1/waitlist/{e1['entry_id']}/cancel").json()["status"] == "CANCELLED"
    nxt = w.as_(second).get("/api/v1/waitlist").json()[0]
    assert nxt["status"] == "OFFERED"

    # Booking the held slot directly (not via "accept") also closes the entry.
    assert w.as_(second).post("/api/v1/appointments", json={"slot_id": appt.slot_id}).status_code == 200
    assert w.as_(second).get("/api/v1/waitlist?active_only=false").json()[0]["status"] == "BOOKED"
