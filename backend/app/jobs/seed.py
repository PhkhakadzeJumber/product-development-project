"""Comprehensive demo seed for UI testing. Idempotent — safe to re-run.

Covers: regions/hospitals/specializations/drugs, 5 patients, 6 doctors,
2 admins, realistic daytime slots (30-min, Tbilisi time), appointments in
every status, treatment cases/consultations/prescriptions, reviews +
performance, conversations/messages.

All logins share password Test123!
Run:  $env:PYTHONPATH='.'; python -m app.jobs.seed
"""
from datetime import date, datetime, timedelta, timezone

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.catalog import Hospital, Region, Specialization
from app.models.chat import Conversation, Message
from app.models.clinical import Consultation, Drug, Prescription, TreatmentCase
from app.models.enums import (
    AppointmentStatus,
    CancelledBy,
    CaseStatus,
    ConditionStatus,
    ConsultationMode,
    Gender,
    MessageType,
    PrescriptionStatus,
    Severity,
    SlotStatus,
    UserRole,
)
from app.models.feedback import DoctorPerformance, DoctorReview
from app.models.scheduling import Appointment, TimeSlot
from app.models.subtypes import Doctor, HospitalAdmin, Patient
from app.models.user_account import UserAccount
from app.services.maintenance import refresh_performance

DEMO_PASSWORD = "Test123!"
TBILISI = timezone(timedelta(hours=4))  # Asia/Tbilisi (no DST)

# 8 slots/day: morning ONLINE, afternoon IN_PERSON. Lunch break 12:30-14:00, no nights/weekends.
DAY_GRID = [
    (9, 0, ConsultationMode.ONLINE),
    (9, 30, ConsultationMode.ONLINE),
    (10, 0, ConsultationMode.ONLINE),
    (10, 30, ConsultationMode.ONLINE),
    (14, 0, ConsultationMode.IN_PERSON),
    (14, 30, ConsultationMode.IN_PERSON),
    (15, 0, ConsultationMode.IN_PERSON),
    (15, 30, ConsultationMode.IN_PERSON),
]

db = SessionLocal()


def get_or_create(model, defaults=None, **filters):
    obj = db.query(model).filter_by(**filters).first()
    if obj:
        return obj, False
    obj = model(**filters, **(defaults or {}))
    db.add(obj)
    db.flush()
    return obj, True


def weekday_dates(start: date, count: int, direction: int):
    """Next/previous `count` weekdays (Mon-Fri) from `start` (exclusive)."""
    out, cur = [], start
    while len(out) < count:
        cur = cur + timedelta(days=direction)
        if cur.weekday() < 5:
            out.append(cur)
    return sorted(out)


# ---------------------------------------------------------------- catalog
for name in ["Tbilisi", "Batumi", "Kutaisi"]:
    get_or_create(Region, defaults={"country_code": "GE"}, name=name)
db.commit()

for name, desc in [
    ("Cardiology", "Heart and cardiovascular system"),
    ("Neurology", "Brain, spine and nervous system"),
    ("Pediatrics", "Children's health"),
    ("Dermatology", "Skin conditions"),
    ("Orthopedics", "Bones, joints and muscles"),
    ("Ophthalmology", "Eye care"),
    ("General Practice", "Primary care"),
]:
    get_or_create(Specialization, defaults={"description": desc}, name=name)
db.commit()

for name, generic, form, strength in [
    ("Amoxicillin", "amoxicillin", "capsule", "500mg"),
    ("Ibuprofen", "ibuprofen", "tablet", "400mg"),
    ("Metoprolol", "metoprolol", "tablet", "50mg"),
    ("Atorvastatin", "atorvastatin", "tablet", "20mg"),
    ("Salbutamol", "salbutamol", "inhaler", "100mcg"),
    ("Cetirizine", "cetirizine", "tablet", "10mg"),
    ("Omeprazole", "omeprazole", "capsule", "20mg"),
    ("Paracetamol", "paracetamol", "tablet", "500mg"),
]:
    obj, _ = get_or_create(Drug, defaults={"generic_name": generic, "form": form, "strength": strength}, name=name)
    # Specific thumbnail per drug (local public asset, served by frontend).
    obj.image_url = f"/drugs/{name.lower()}.svg"
db.commit()

DRUG_DESCRIPTIONS = {
    "Amoxicillin": "Broad-spectrum penicillin antibiotic for bacterial infections (respiratory, ear, urinary). Take the full course even if you feel better.",
    "Ibuprofen": "Non-steroidal anti-inflammatory (NSAID) for pain, fever and inflammation. Take with food and do not exceed the prescribed dose.",
    "Metoprolol": "Beta-blocker that lowers heart rate and blood pressure. Used for hypertension, angina and rate control. Do not stop abruptly.",
    "Atorvastatin": "Statin that lowers LDL cholesterol and cardiovascular risk. Usually taken once daily in the evening.",
    "Salbutamol": "Short-acting bronchodilator inhaler for quick relief of wheezing and asthma attacks. Rinse technique matters — ask your doctor to check it.",
    "Cetirizine": "Once-daily antihistamine for allergy symptoms (sneezing, itching, rash). May cause mild drowsiness in some people.",
    "Omeprazole": "Proton-pump inhibitor that reduces stomach acid. Used for reflux, gastritis and ulcer prevention. Take before breakfast.",
    "Paracetamol": "First-line pain and fever reliever. Effective within 30–60 minutes. Do not combine with other paracetamol-containing products.",
}
for _name, _desc in DRUG_DESCRIPTIONS.items():
    _d = db.query(Drug).filter_by(name=_name).first()
    if _d and not _d.description:
        _d.description = _desc
db.commit()

tbilisi = db.query(Region).filter_by(name="Tbilisi").first()
batumi = db.query(Region).filter_by(name="Batumi").first()
central, _ = get_or_create(
    Hospital,
    defaults={"region_id": tbilisi.region_id, "city": "Tbilisi", "address": "1 Rustaveli Ave",
              "phone": "+995 322 00 00 01", "email": "info@tch.ge", "is_active": True},
    name="Tbilisi Central Hospital",
)
seaside, _ = get_or_create(
    Hospital,
    defaults={"region_id": batumi.region_id, "city": "Batumi", "address": "12 Seaside Ave",
              "phone": "+995 422 27 44 55", "email": "info@seaside.demo.ge", "is_active": True},
    name="Batumi Seaside Clinic",
)
db.commit()


def spec(name: str) -> Specialization:
    return db.query(Specialization).filter_by(name=name).one()


# ---------------------------------------------------------------- users
PATIENTS = [
    ("patient@demo.ge", "Demo", "Patient", date(1990, 5, 14), Gender.FEMALE, "Tbilisi"),
    ("nino@demo.ge", "Nino", "Beridze", date(1988, 3, 22), Gender.FEMALE, "Tbilisi"),
    ("giorgi@demo.ge", "Giorgi", "Kapanadze", date(1995, 11, 2), Gender.MALE, "Tbilisi"),
    ("ana@demo.ge", "Ana", "Maisuradze", date(2000, 7, 30), Gender.FEMALE, "Batumi"),
    ("luka@demo.ge", "Luka", "Tsiklauri", date(1998, 1, 17), Gender.MALE, "Kutaisi"),
]
DOCTORS = [
    # email, first, last, hospital, spec, exp, bio
    ("doctor@demo.ge", "Davit", "Mkheidze", "central", "Cardiology", 12, "Interventional cardiologist. Hypertension & chest pain."),
    ("neuro.doctor@demo.ge", "Mariam", "Abashidze", "central", "Neurology", 9, "Migraine and headache specialist."),
    ("pedia.doctor@demo.ge", "Irakli", "Gogoladze", "central", "Pediatrics", 7, "Pediatrician, child respiratory infections."),
    ("gp.doctor@demo.ge", "Salome", "Kordzaia", "central", "General Practice", 5, "Family doctor, primary care and referrals."),
    ("derma.doctor@demo.ge", "Tamar", "Lomidze", "seaside", "Dermatology", 8, "Dermatologist, eczema and allergy rashes."),
    ("ortho.doctor@demo.ge", "Levan", "Nozadze", "seaside", "Orthopedics", 10, "Sports injuries and back pain."),
]
ADMINS = [
    ("admin@demo.ge", "Demo Admin", "central"),
    ("batumi.admin@demo.ge", "Batumi Admin", "seaside"),
]

user_ids: dict[str, int] = {}


def ensure_user(email: str, role: UserRole) -> int:
    u = db.query(UserAccount).filter_by(email=email).first()
    if not u:
        u = UserAccount(email=email, password_hash=hash_password(DEMO_PASSWORD), role=role, is_active=True)
        db.add(u)
        db.flush()
        db.commit()
    user_ids[email] = u.user_id
    return u.user_id


for email, first, last, dob, gender, city in PATIENTS:
    uid = ensure_user(email, UserRole.PATIENT)
    region = batumi if city == "Batumi" else tbilisi
    p = db.get(Patient, uid)
    avatar = f"/avatars/patients/{first.lower()}.svg"
    if not p:
        db.add(Patient(patient_id=uid, first_name=first, last_name=last,
                       date_of_birth=dob, gender=gender, region_id=region.region_id, city=city,
                       avatar_url=avatar))
        db.commit()
    elif not p.avatar_url:
        p.avatar_url = avatar
        db.commit()

hosp_map = {"central": central, "seaside": seaside}
for email, first, last, hosp, spec_name, exp, bio in DOCTORS:
    uid = ensure_user(email, UserRole.DOCTOR)
    h = hosp_map[hosp]
    d = db.get(Doctor, uid)
    photo = f"/avatars/doctors/{first.lower()}.svg"
    if not d:
        db.add(Doctor(doctor_id=uid, hospital_id=h.hospital_id,
                      specialization_id=spec(spec_name).specialization_id,
                      first_name=first, last_name=last, bio=bio,
                      qualifications=f"MD, {spec_name}", years_of_experience=exp,
                      license_number=f"GE-MED-{uid:05d}", is_active=True,
                      photo_url=photo))
        db.commit()
    elif not d.photo_url:
        d.photo_url = photo
        db.commit()

admin_ids: dict[str, int] = {}
for email, full, hosp in ADMINS:
    uid = ensure_user(email, UserRole.HOSPITAL_ADMIN)
    admin_ids[email] = uid
    a = db.get(HospitalAdmin, uid)
    if not a:
        db.add(HospitalAdmin(admin_id=uid, hospital_id=hosp_map[hosp].hospital_id, full_name=full))
        db.commit()

central_admin = user_ids["admin@demo.ge"]
seaside_admin = user_ids["batumi.admin@demo.ge"]
hero_doc = user_ids["doctor@demo.ge"]

# ---------------------------------------------------------------- slots (realistic daytime grid)
today = datetime.now(TBILISI).date()
future_days = weekday_dates(today, 5, +1)  # e.g. Fri + Mon-Thu
past_days = weekday_dates(today, 5, -1)
# hero doctor: full grid every day; others: 2 future + 2 past days, first 6 slots
doctor_day_plan: dict[str, tuple[list, list]] = {}
for email, *_ in DOCTORS:
    if email == "doctor@demo.ge":
        doctor_day_plan[email] = (future_days, past_days)
    else:
        doctor_day_plan[email] = (future_days[:2], past_days[-2:])


def ensure_slot(doctor_id: int, day: date, h: int, m: int, mode: ConsultationMode, admin_id: int) -> TimeSlot:
    start = datetime(day.year, day.month, day.day, h, m, tzinfo=TBILISI)
    end = start + timedelta(minutes=30)
    s = db.query(TimeSlot).filter_by(doctor_id=doctor_id, start_time=start).first()
    if not s:
        s = TimeSlot(doctor_id=doctor_id, created_by_admin_id=admin_id,
                     start_time=start, end_time=end,
                     consultation_mode=mode, status=SlotStatus.AVAILABLE)
        db.add(s)
        db.flush()
    return s


for email, *_rest in DOCTORS:
    did = user_ids[email]
    doc = db.get(Doctor, did)
    admin_id = central_admin if doc.hospital_id == central.hospital_id else seaside_admin
    fut, past = doctor_day_plan[email]
    grid = DAY_GRID if email == "doctor@demo.ge" else DAY_GRID[:6]
    for day in fut + past:
        for h, m, mode in grid:
            ensure_slot(did, day, h, m, mode, admin_id)
db.commit()


def slot_at(doctor_email: str, day: date, h: int, m: int) -> TimeSlot:
    did = user_ids[doctor_email]
    start = datetime(day.year, day.month, day.day, h, m, tzinfo=TBILISI)
    return db.query(TimeSlot).filter_by(doctor_id=did, start_time=start).one()


def book(slot: TimeSlot, patient_email: str, status: AppointmentStatus,
         reason: str, cancel_by: CancelledBy | None = None, cancel_reason: str | None = None) -> Appointment:
    pid = user_ids[patient_email]
    appt = db.query(Appointment).filter_by(slot_id=slot.slot_id).first()
    if appt:
        return appt
    appt = Appointment(slot_id=slot.slot_id, doctor_id=slot.doctor_id, patient_id=pid,
                       status=status, reason=reason,
                       cancelled_by=cancel_by, cancel_reason=cancel_reason,
                       cancelled_at=(datetime.now(TBILISI) if status == AppointmentStatus.CANCELLED else None))
    db.add(appt)
    slot.status = SlotStatus.AVAILABLE if status == AppointmentStatus.CANCELLED else SlotStatus.BOOKED
    db.flush()
    return appt


F1, F2, F3 = future_days[0], future_days[1], future_days[2]
P1, P2 = past_days[-1], past_days[-2]  # most recent past days

# Hero doctor timetable: 2 future SCHEDULED + 1 future CANCELLED + past mix
a_sched1 = book(slot_at("doctor@demo.ge", F1, 9, 0), "patient@demo.ge",
                AppointmentStatus.SCHEDULED, "Chest discomfort, check blood pressure")
a_sched2 = book(slot_at("doctor@demo.ge", F1, 9, 30), "nino@demo.ge",
                AppointmentStatus.SCHEDULED, "Palpitations in the evening")
a_sched3 = book(slot_at("doctor@demo.ge", F2, 14, 0), "giorgi@demo.ge",
                AppointmentStatus.SCHEDULED, "Annual heart check, family history")
a_cancel_future = book(slot_at("doctor@demo.ge", F3, 10, 0), "ana@demo.ge",
                       AppointmentStatus.CANCELLED, "Follow-up visit",
                       cancel_by=CancelledBy.PATIENT, cancel_reason="Feeling better, will reschedule")
a_done1 = book(slot_at("doctor@demo.ge", P1, 9, 0), "patient@demo.ge",
               AppointmentStatus.COMPLETED, "Chest discomfort and shortness of breath")
a_done2 = book(slot_at("doctor@demo.ge", P1, 9, 30), "nino@demo.ge",
               AppointmentStatus.COMPLETED, "Recurring headaches, referred to neuro but cardio first")
a_done3 = book(slot_at("doctor@demo.ge", P2, 10, 0), "giorgi@demo.ge",
               AppointmentStatus.COMPLETED, "Acute cough and fever")
a_noshow = book(slot_at("doctor@demo.ge", P2, 14, 0), "ana@demo.ge",
                AppointmentStatus.NO_SHOW, "Skin rash consult (wrong spec, did not show)")
a_cancel_past = book(slot_at("doctor@demo.ge", P2, 14, 30), "luka@demo.ge",
                     AppointmentStatus.CANCELLED, "Back pain",
                     cancel_by=CancelledBy.DOCTOR, cancel_reason="Doctor on emergency call")
# Other doctors: at least 1 SCHEDULED + 1 COMPLETED each so every timetable is non-empty
book(slot_at("neuro.doctor@demo.ge", F1, 9, 0), "nino@demo.ge", AppointmentStatus.SCHEDULED, "Migraine aura, monthly attacks")
n_done = book(slot_at("neuro.doctor@demo.ge", P1, 9, 0), "giorgi@demo.ge", AppointmentStatus.COMPLETED, "Tension headache for 2 weeks")
book(slot_at("pedia.doctor@demo.ge", F1, 9, 30), "ana@demo.ge", AppointmentStatus.SCHEDULED, "Child fever 38.5 (booking for daughter)")
book(slot_at("pedia.doctor@demo.ge", P1, 9, 30), "luka@demo.ge", AppointmentStatus.COMPLETED, "Child cough")
book(slot_at("gp.doctor@demo.ge", F2, 9, 0), "luka@demo.ge", AppointmentStatus.SCHEDULED, "Sick leave certificate + fatigue")
book(slot_at("gp.doctor@demo.ge", P1, 9, 0), "patient@demo.ge", AppointmentStatus.COMPLETED, "Flu symptoms")
book(slot_at("derma.doctor@demo.ge", F1, 14, 0), "ana@demo.ge", AppointmentStatus.SCHEDULED, "Eczema flare on hands")
book(slot_at("derma.doctor@demo.ge", P1, 14, 0), "nino@demo.ge", AppointmentStatus.COMPLETED, "Allergic rash after nuts")
book(slot_at("ortho.doctor@demo.ge", F2, 14, 0), "luka@demo.ge", AppointmentStatus.SCHEDULED, "Knee pain after football")
book(slot_at("ortho.doctor@demo.ge", P1, 14, 0), "giorgi@demo.ge", AppointmentStatus.COMPLETED, "Lower back pain")
db.commit()

# ---------------------------------------------------------------- clinical
def ensure_case(patient_email: str, doctor_email: str, title: str, **kw) -> TreatmentCase:
    c = db.query(TreatmentCase).filter_by(
        patient_id=user_ids[patient_email], doctor_id=user_ids[doctor_email], title=title).first()
    if not c:
        c = TreatmentCase(patient_id=user_ids[patient_email], doctor_id=user_ids[doctor_email],
                          title=title, **kw)
        db.add(c)
        db.flush()
    return c


case_hyper = ensure_case("patient@demo.ge", "doctor@demo.ge", "Hypertension management",
                         diagnosis="Essential hypertension, stage 1", icd_code="I10",
                         severity=Severity.MODERATE, status=CaseStatus.IN_TREATMENT,
                         started_on=P2)
case_migr = ensure_case("nino@demo.ge", "doctor@demo.ge", "Palpitations workup",
                        diagnosis="Suspected supraventricular extrasystoles, cardio workup",
                        icd_code="R00.2", severity=Severity.MILD, status=CaseStatus.OPEN, started_on=P1)
case_bronch = ensure_case("giorgi@demo.ge", "doctor@demo.ge", "Acute bronchitis (resolved)",
                          diagnosis="Acute bronchitis", icd_code="J20.9",
                          severity=Severity.MILD, status=CaseStatus.RESOLVED,
                          started_on=P2, ended_on=P1)
case_neuro = ensure_case("giorgi@demo.ge", "neuro.doctor@demo.ge", "Tension headache",
                         diagnosis="Tension-type headache", icd_code="G44.2",
                         severity=Severity.MODERATE, status=CaseStatus.IN_TREATMENT, started_on=P1)
db.commit()


def ensure_consult(appt: Appointment, case: TreatmentCase, complaint: str, **kw) -> Consultation:
    c = db.query(Consultation).filter_by(appointment_id=appt.appointment_id).first()
    if not c:
        c = Consultation(appointment_id=appt.appointment_id, treatment_id=case.treatment_id,
                         chief_complaint=complaint, **kw)
        db.add(c)
        db.flush()
    return c


con1 = ensure_consult(a_done1, case_hyper, "Chest tightness on stairs, mild dyspnea",
                      symptoms="BP 150/95, HR 88, mild ankle edema",
                      examination_notes="Heart sounds regular, lungs clear. ECG: sinus rhythm, no ST changes.",
                      condition_status=ConditionStatus.STABLE,
                      vitals={"bp": "150/95", "hr": 88, "spo2": 97, "temp_c": 36.7},
                      follow_up_plan="Start low-dose ACE inhibitor, home BP diary, return in 2 weeks.")
con2 = ensure_consult(a_done2, case_migr, "Evening palpitations, no syncope",
                      symptoms="HR 92 irregular occasionally, anxiety",
                      examination_notes="Holter ordered, thyroid panel ordered.",
                      condition_status=ConditionStatus.STABLE,
                      vitals={"bp": "125/80", "hr": 92, "spo2": 98},
                      follow_up_plan="Holter 24h, avoid caffeine, review in 1 week.")
con3 = ensure_consult(a_done3, case_bronch, "Productive cough 5 days, fever 38.2",
                      symptoms="Wheezing, sore throat", examination_notes="Lungs: scattered rhonchi. Resolving.",
                      condition_status=ConditionStatus.IMPROVING,
                      vitals={"bp": "120/75", "hr": 84, "spo2": 96, "temp_c": 38.1},
                      follow_up_plan="Symptomatic care, fluids, return if worsening.")
con4 = ensure_consult(n_done, case_neuro, "Dull headache afternoons, screen work",
                      symptoms="Neck stiffness, photophobia mild",
                      examination_notes="Neuro exam normal. Likely tension-type.",
                      condition_status=ConditionStatus.WORSENING,
                      vitals={"bp": "130/85", "hr": 78},
                      follow_up_plan="Posture breaks, hydration, pain diary.")
db.commit()

# ---------------------------------------------------------------- progression filler
# Give each open/in-treatment case a real visit sequence (2-4 entries) so the
# case timeline page shows development instead of a single entry. Idempotent:
# book()/ensure_consult() return existing rows on re-run.
OLD0, OLD1, OLD2 = past_days[0], past_days[1], past_days[2]

a_hyper_early = book(slot_at("doctor@demo.ge", OLD0, 9, 0), "patient@demo.ge",
                     AppointmentStatus.COMPLETED, "First high BP reading, morning headaches")
a_hyper_mid = book(slot_at("doctor@demo.ge", OLD1, 9, 0), "patient@demo.ge",
                   AppointmentStatus.COMPLETED, "BP diary review, dose adjustment")
a_migr_early = book(slot_at("doctor@demo.ge", OLD1, 9, 30), "nino@demo.ge",
                    AppointmentStatus.COMPLETED, "First palpitations episode, anxiety")
a_bronch_early = book(slot_at("doctor@demo.ge", OLD0, 10, 0), "giorgi@demo.ge",
                      AppointmentStatus.COMPLETED, "Dry cough onset, mild fever 37.4")
a_neuro_early = book(slot_at("neuro.doctor@demo.ge", P2, 9, 0), "giorgi@demo.ge",
                     AppointmentStatus.COMPLETED, "First headache assessment, stress at work")
db.commit()


def stamp(consult: Consultation, day: date, h: int, m: int):
    consult.created_at = datetime(day.year, day.month, day.day, h, m, tzinfo=TBILISI)
    return consult


con_hyper0 = ensure_consult(a_hyper_early, case_hyper, "Morning headaches, flushing, BP 165/102 at pharmacy",
                            symptoms="BP 165/102, HR 94, tense, no chest pain",
                            examination_notes="Alert, mild systolic murmur. ECG: sinus tachycardia. Labs ordered (lipids, creatinine).",
                            condition_status=ConditionStatus.WORSENING,
                            vitals={"bp": "165/102", "hr": 94, "spo2": 97, "temp_c": 36.8},
                            follow_up_plan="Lifestyle counselling, home BP diary twice daily, return in 1 week.")
stamp(con_hyper0, OLD0, 9, 0)
con_hyper1 = ensure_consult(a_hyper_mid, case_hyper, "Home readings 148-155/92-96, tolerating medication",
                            symptoms="BP 152/94, HR 86, mild dizziness in mornings",
                            examination_notes="Lungs clear, edema resolved. Dose titrated, kidney labs normal.",
                            condition_status=ConditionStatus.STABLE,
                            vitals={"bp": "152/94", "hr": 86, "spo2": 97, "temp_c": 36.6},
                            follow_up_plan="Continue ACE inhibitor + add low-dose statin, salt <5g/day, recheck in 2 weeks.")
stamp(con_hyper1, OLD1, 9, 0)
# Latest visit (already seeded) becomes the improving endpoint.
stamp(con1, P1, 9, 0)
con1.condition_status = ConditionStatus.IMPROVING
con1.follow_up_plan = "BP trending down (138/86). Continue therapy, home diary, cardio review in 1 month."

con_migr0 = ensure_consult(a_migr_early, case_migr, "Sudden rapid heartbeat at rest, 10 minutes",
                           symptoms="HR 104, pale, anxious, no chest pain",
                           examination_notes="Vitals settling after rest. ECG: occasional SV extrasystoles. Reassured.",
                           condition_status=ConditionStatus.WORSENING,
                           vitals={"bp": "132/84", "hr": 104, "spo2": 98},
                           follow_up_plan="Avoid stimulants, 24h Holter + echo scheduled.")
stamp(con_migr0, OLD1, 9, 30)
stamp(con2, P1, 9, 30)

con_bronch0 = ensure_consult(a_bronch_early, case_bronch, "Dry cough 2 days, scratchy throat",
                             symptoms="Temp 37.4, throat red, lungs clear",
                             examination_notes="Viral prodrome. Fluids, rest, safety-netting explained.",
                             condition_status=ConditionStatus.STABLE,
                             vitals={"bp": "118/74", "hr": 82, "spo2": 98, "temp_c": 37.4},
                             follow_up_plan="Symptomatic care, return if fever or productive cough.")
stamp(con_bronch0, OLD0, 10, 0)
stamp(con3, P2, 10, 0)
con3.condition_status = ConditionStatus.RESOLVED
con3.follow_up_plan = "Cough resolved, lungs clear. Course finished, no further follow-up needed."

con_neuro0 = ensure_consult(a_neuro_early, case_neuro, "Pressure-like headache after long shifts",
                            symptoms="Bilateral tightness, VAS 5/10, no nausea",
                            examination_notes="Neuro exam normal, pericranial tenderness. Stress and posture discussed.",
                            condition_status=ConditionStatus.STABLE,
                            vitals={"bp": "128/82", "hr": 80},
                            follow_up_plan="Ergonomic breaks every 45 min, sleep hygiene, headache diary started.")
stamp(con_neuro0, P2, 9, 0)
stamp(con4, P1, 9, 0)
db.commit()


def drug(name: str) -> Drug:
    return db.query(Drug).filter_by(name=name).one()


def ensure_rx(consult: Consultation, case: TreatmentCase, patient_email: str, doctor_email: str,
              drug_name: str, dosage: str, freq: str, status: PrescriptionStatus, **kw) -> Prescription:
    q = db.query(Prescription).filter_by(consultation_id=consult.consultation_id, drug_id=drug(drug_name).drug_id)
    p = q.first()
    if not p:
        p = Prescription(consultation_id=consult.consultation_id, treatment_id=case.treatment_id,
                         patient_id=user_ids[patient_email], doctor_id=user_ids[doctor_email],
                         drug_id=drug(drug_name).drug_id, dosage=dosage, frequency=freq,
                         status=status, **kw)
        db.add(p)
        db.flush()
    return p


ensure_rx(con1, case_hyper, "patient@demo.ge", "doctor@demo.ge", "Metoprolol",
          "25mg", "once daily", PrescriptionStatus.ACTIVE, route="oral",
          start_date=date.today(), end_date=date.today() + timedelta(days=30),
          instructions="Take in the morning with water. Monitor pulse.")
ensure_rx(con1, case_hyper, "patient@demo.ge", "doctor@demo.ge", "Atorvastatin",
          "20mg", "once daily at night", PrescriptionStatus.ACTIVE, route="oral",
          start_date=date.today(), end_date=date.today() + timedelta(days=30),
          instructions="Lipid control alongside BP management.")
ensure_rx(con3, case_bronch, "giorgi@demo.ge", "doctor@demo.ge", "Paracetamol",
          "500mg", "3x daily as needed", PrescriptionStatus.COMPLETED, route="oral",
          start_date=P2, end_date=P1, instructions="Fever control. Course finished.")
ensure_rx(con3, case_bronch, "giorgi@demo.ge", "doctor@demo.ge", "Amoxicillin",
          "500mg", "3x daily", PrescriptionStatus.DISCONTINUED, route="oral",
          start_date=P2, end_date=P1, instructions="Stopped after 2 days — mild rash, switched to symptomatic care.")
ensure_rx(con4, case_neuro, "giorgi@demo.ge", "neuro.doctor@demo.ge", "Ibuprofen",
          "400mg", "as needed, max 3/day", PrescriptionStatus.ACTIVE, route="oral",
          start_date=date.today(), end_date=date.today() + timedelta(days=14),
          instructions="Take with food. Keep headache diary.")
ensure_rx(con2, case_migr, "nino@demo.ge", "doctor@demo.ge", "Cetirizine",
          "10mg", "once daily", PrescriptionStatus.COMPLETED, route="oral",
          start_date=P1 - timedelta(days=10), end_date=P1 - timedelta(days=3),
          instructions="Trial for possible allergic trigger. Completed.")
db.commit()

# ---------------------------------------------------------------- reviews + performance
def ensure_review(appt: Appointment, rating: int, comment: str):
    r = db.query(DoctorReview).filter_by(appointment_id=appt.appointment_id).first()
    if not r:
        r = DoctorReview(appointment_id=appt.appointment_id, doctor_id=appt.doctor_id,
                         patient_id=appt.patient_id, rating=rating, comment=comment)
        db.add(r)
        db.flush()
        refresh_performance(db, appt.doctor_id)


ensure_review(a_done1, 5, "Dr. Mkheidze explained everything, felt heard. BP plan is clear.")
ensure_review(a_done2, 4, "Thorough exam, waiting ~10 min but worth it.")
ensure_review(a_done3, 5, "Quick recovery, good follow-up advice.")
ensure_review(n_done, 5, "Finally understood my headaches. Great doctor.")
db.commit()

# ---------------------------------------------------------------- chat
def ensure_conversation(patient_email: str, doctor_email: str) -> Conversation:
    c = db.query(Conversation).filter_by(
        patient_id=user_ids[patient_email], doctor_id=user_ids[doctor_email]).first()
    if not c:
        c = Conversation(patient_id=user_ids[patient_email], doctor_id=user_ids[doctor_email])
        db.add(c)
        db.flush()
    return c


def ensure_message(conv: Conversation, sender_email: str, body: str,
                   mtype: MessageType = MessageType.TEXT, attachment: str | None = None):
    exists = db.query(Message).filter_by(conversation_id=conv.conversation_id, body=body).first()
    if not exists:
        db.add(Message(conversation_id=conv.conversation_id, sender_id=user_ids[sender_email],
                       message_type=mtype, body=body, attachment_url=attachment))


conv1 = ensure_conversation("patient@demo.ge", "doctor@demo.ge")
ensure_message(conv1, "patient@demo.ge", "Hello doctor, my home BP today was 142/90. Should I keep the same dose?")
ensure_message(conv1, "doctor@demo.ge", "Hello! Yes, keep it and bring the diary on your visit. Less salt this week.")
ensure_message(conv1, "patient@demo.ge", "Sending today's ECG photo from the pharmacy device.",
               MessageType.IMAGE, "https://demo.local/files/ecg-1402.png")
ensure_message(conv1, "doctor@demo.ge", "Thanks — rhythm looks regular. See you at 09:00.",
               MessageType.VOICE, "https://demo.local/files/voice-note-77.ogg")
conv2 = ensure_conversation("nino@demo.ge", "neuro.doctor@demo.ge")
ensure_message(conv2, "nino@demo.ge", "Migraine diary: 2 attacks this week, both after long screen days.")
ensure_message(conv2, "neuro.doctor@demo.ge", "Thanks Nino. Keep hydration + breaks, we'll review triggers on your visit.")
conv3 = ensure_conversation("ana@demo.ge", "derma.doctor@demo.ge")
ensure_message(conv3, "ana@demo.ge", "The cream helps, but itching returns at night. Photo attached.",
               MessageType.IMAGE, "https://demo.local/files/rash-ana-3.png")
ensure_message(conv3, "derma.doctor@demo.ge", "Use a thin layer + moisturizer. If no improvement in 3 days, we'll switch.",
               MessageType.FILE, "https://demo.local/files/eczema-care-plan.pdf")
db.commit()

# ---------------------------------------------------------------- report
print("seeded OK")
print(f"hospitals={db.query(Hospital).count()} doctors={db.query(Doctor).count()} "
      f"patients={db.query(Patient).count()} slots={db.query(TimeSlot).count()} "
      f"appts={db.query(Appointment).count()} cases={db.query(TreatmentCase).count()} "
      f"consults={db.query(Consultation).count()} rx={db.query(Prescription).count()} "
      f"reviews={db.query(DoctorReview).count()} convs={db.query(Conversation).count()} "
      f"msgs={db.query(Message).count()}")
print(f"ALL logins password={DEMO_PASSWORD}:")
for e in ["patient@demo.ge", "nino@demo.ge", "giorgi@demo.ge", "ana@demo.ge", "luka@demo.ge",
          "doctor@demo.ge", "neuro.doctor@demo.ge", "pedia.doctor@demo.ge", "gp.doctor@demo.ge",
          "derma.doctor@demo.ge", "ortho.doctor@demo.ge", "admin@demo.ge", "batumi.admin@demo.ge"]:
    print(f"  {e} (id={user_ids[e]})")
db.close()
