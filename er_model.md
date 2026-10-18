# ER Model — Hospital Appointment & Treatment Tracking App

## 1. Actors and scope

Three roles share one login table (`USER_ACCOUNT`) and are specialised into `PATIENT`, `DOCTOR` and `HOSPITAL_ADMIN`.

- **Patient** — browses doctors of any hospital, books/cancels appointments, sees current prescriptions, chats with doctors.
- **Doctor** — sees a timetable, records consultations, tracks treatment and condition, prescribes drugs, chats.
- **Hospital admin** — creates and manages doctors' time slots, sees private doctor feedback/rating/popularity.

## 2. ER diagram (Mermaid)

```mermaid
erDiagram
    REGION ||--o{ HOSPITAL : "located in"
    REGION ||--o{ PATIENT : "lives in"
    HOSPITAL ||--o{ DOCTOR : employs
    HOSPITAL ||--o{ DOCTOR_HOSPITAL : "employs via"
    DOCTOR ||--o{ DOCTOR_HOSPITAL : "works in"
    HOSPITAL ||--o{ HOSPITAL_ADMIN : "administered by"
    SPECIALIZATION ||--o{ DOCTOR : "classifies"

    USER_ACCOUNT ||--o| PATIENT : "is a"
    USER_ACCOUNT ||--o| DOCTOR : "is a"
    USER_ACCOUNT ||--o| HOSPITAL_ADMIN : "is a"

    DOCTOR ||--o{ TIME_SLOT : "offers"
    HOSPITAL_ADMIN ||--o{ TIME_SLOT : "creates"
    TIME_SLOT ||--o{ APPOINTMENT : "booked via"
    PATIENT ||--o{ APPOINTMENT : "books"
    DOCTOR ||--o{ APPOINTMENT : "attends"

    APPOINTMENT ||--o| CONSULTATION : "results in"
    APPOINTMENT ||--o| DOCTOR_REVIEW : "rated by"
    DOCTOR ||--o{ DOCTOR_REVIEW : "receives"
    PATIENT ||--o{ DOCTOR_REVIEW : "writes"
    DOCTOR ||--|| DOCTOR_PERFORMANCE : "summarised in"

    PATIENT ||--o{ TREATMENT_CASE : "undergoes"
    DOCTOR ||--o{ TREATMENT_CASE : "leads"
    TREATMENT_CASE ||--o{ CONSULTATION : "tracked by"
    CONSULTATION ||--o{ PRESCRIPTION : "produces"
    TREATMENT_CASE ||--o{ PRESCRIPTION : "includes"
    DRUG ||--o{ PRESCRIPTION : "prescribed as"
    PATIENT ||--o{ PRESCRIPTION : "takes"
    DOCTOR ||--o{ PRESCRIPTION : "issues"

    PATIENT ||--o{ CONVERSATION : "participates"
    DOCTOR ||--o{ CONVERSATION : "participates"
    CONVERSATION ||--o{ MESSAGE : contains
    USER_ACCOUNT ||--o{ MESSAGE : sends

    REGION {
        int region_id PK
        string name
        string country_code
    }
    HOSPITAL {
        int hospital_id PK
        string name
        int region_id FK
        string city
        string address
        string phone
        string email
        bool is_active
    }
    USER_ACCOUNT {
        int user_id PK
        string email
        string phone "required at registration"
        string password_hash
        enum role
        bool is_active
        timestamp created_at
    }
    PATIENT {
        int patient_id PK,FK
        string first_name
        string last_name
        date date_of_birth
        enum gender
        int region_id FK
        string city
        string address
    }
    SPECIALIZATION {
        int specialization_id PK
        string name
        string description
    }
    DOCTOR {
        int doctor_id PK,FK
        int hospital_id FK "primary hospital"
        int specialization_id FK
        string first_name
        string last_name
        string bio
        string qualifications
        int years_of_experience
        string license_number
        string photo_url "null until file upload lands; UI shows initials"
        bool is_active
    }
    DOCTOR_HOSPITAL {
        int doctor_id PK,FK
        int hospital_id PK,FK
    }
    HOSPITAL_ADMIN {
        int admin_id PK,FK
        int hospital_id FK
        string first_name
        string last_name
        string full_name "compat, First + Last"
    }
    DOCTOR_PERFORMANCE {
        int doctor_id PK,FK
        decimal average_rating
        int review_count
        decimal popularity_score
        timestamp updated_at
    }
    DOCTOR_REVIEW {
        int review_id PK
        int appointment_id FK
        int doctor_id FK
        int patient_id FK
        int rating
        string comment
        timestamp created_at
    }
    TIME_SLOT {
        int slot_id PK
        int doctor_id FK
        int created_by_admin_id FK
        timestamp start_time
        timestamp end_time
        enum consultation_mode
        enum status
    }
    APPOINTMENT {
        int appointment_id PK
        int slot_id FK
        int doctor_id FK
        int patient_id FK
        enum status
        string reason
        timestamp booked_at
        timestamp cancelled_at
        enum cancelled_by
        string cancel_reason
    }
    TREATMENT_CASE {
        int treatment_id PK
        int patient_id FK
        int doctor_id FK
        string title
        string diagnosis
        string icd_code
        enum severity
        enum status
        date started_on
        date ended_on
    }
    CONSULTATION {
        int consultation_id PK
        int appointment_id FK
        int treatment_id FK
        string chief_complaint
        string symptoms
        string examination_notes
        enum condition_status
        json vitals
        string follow_up_plan
        timestamp created_at
    }
    DRUG {
        int drug_id PK
        string name
        string generic_name
        string form
        string strength
    }
    PRESCRIPTION {
        int prescription_id PK
        int consultation_id FK
        int treatment_id FK
        int patient_id FK
        int doctor_id FK
        int drug_id FK
        string dosage
        string frequency
        string route
        date start_date "required, defaults to today"
        date end_date "optional, NULL = ongoing until doctor updates"
        string duration_note "human text, e.g. for about a month"
        string instructions
        string discontinue_reason
        int supersedes_id FK "substitute chain, self-ref"
        enum status
        timestamp completed_at
    }
    NOTIFICATION_OUTBOX {
        int notification_id PK
        string channel "EMAIL | SMS"
        string recipient
        string subject
        string body "minimal: drug + schedule + doctor, no exam notes"
        string status "PENDING | SENT | LOGGED | SKIPPED | FAILED"
        int prescription_id FK
        int patient_id
        string error
        timestamp created_at
        timestamp sent_at
    }
    CONVERSATION {
        int conversation_id PK
        int patient_id FK
        int doctor_id FK
        timestamp created_at
    }
    MESSAGE {
        bigint message_id PK
        int conversation_id FK
        int sender_id FK
        enum message_type
        string body
        string attachment_url
        timestamp sent_at
        timestamp read_at
    }
```

### Between-visit care (migration 0008)

```mermaid
erDiagram
    DOCTOR ||--o{ DOCTOR_DELAY : "runs late on"
    PRESCRIPTION ||--o{ PRESCRIPTION_RENEWAL : "renewal requested for"
    PRESCRIPTION_RENEWAL |o--o| PRESCRIPTION : "issues new"
    PATIENT ||--o{ PATIENT_QUESTION : asks
    DOCTOR ||--o{ PATIENT_QUESTION : answers
    TREATMENT_CASE |o--o{ PATIENT_QUESTION : "about"
    PATIENT ||--o{ WAITLIST_ENTRY : joins
    DOCTOR ||--o{ WAITLIST_ENTRY : "has waitlist"
    TIME_SLOT |o--o{ WAITLIST_ENTRY : "offered as"
    WAITLIST_ENTRY |o--o| APPOINTMENT : "becomes"

    DOCTOR_DELAY {
        int delay_id PK
        int doctor_id FK
        date day "clinic day, UNIQUE with doctor_id"
        int delay_minutes
        string note
        int notified_minutes "last value patients were told"
    }
    PRESCRIPTION_RENEWAL {
        int renewal_id PK
        int prescription_id FK
        int patient_id FK
        int doctor_id FK
        string status "PENDING / APPROVED / DECLINED / CANCELLED"
        string patient_note
        string doctor_note
        int new_prescription_id FK
        timestamp decided_at
    }
    PATIENT_QUESTION {
        int question_id PK
        int patient_id FK
        int doctor_id FK
        int treatment_id FK
        string urgency "ROUTINE / SOON"
        string body
        string status "OPEN / ANSWERED / CLOSED"
        string answer
        timestamp doctor_seen_at
        timestamp patient_seen_at
    }
    WAITLIST_ENTRY {
        int entry_id PK
        int patient_id FK
        int doctor_id FK
        date wanted_before
        string status "WAITING / OFFERED / BOOKED / CANCELLED"
        int offered_slot_id FK
        timestamp offer_expires_at
        int appointment_id FK
    }
```

New columns on existing tables: `APPOINTMENT.checked_in_at`, `TIME_SLOT.held_for_patient_id` + `held_until` (waitlist hold), `DOCTOR.questions_open` + `reply_within_hours` + `reply_note`, `NOTIFICATION_OUTBOX.kind`.

## 3. Key design decisions

1. **Supertype/subtype for users.** One `USER_ACCOUNT` (login, role) with 1:0..1 subtype tables. Chat messages can then reference a single sender key regardless of role.
2. **Region is independent of booking.** A patient's `region_id` is only profile data; slots belong to doctors, so a patient from a remote region books any hospital's slot with no phone numbers involved. `consultation_mode` (`IN_PERSON` / `ONLINE`) lets remote patients take online visits.
3. **Slots are managed by admins only.** `TIME_SLOT.created_by_admin_id` records who made it. A doctor's slots may not overlap (exclusion constraint in the SQL).
4. **Cancellation keeps history.** A cancelled appointment stays as a row with `status = CANCELLED`, and its slot returns to `AVAILABLE`. A partial unique index guarantees a slot has at most one non-cancelled appointment, which prevents double booking.
5. **Appointment status lifecycle:** `SCHEDULED → COMPLETED | CANCELLED | NO_SHOW`.
6. **Treatment tracking.** `TREATMENT_CASE` is the long-running condition being treated (diagnosis, severity, status). Each `CONSULTATION` (1:0..1 with an appointment) belongs to a case and records symptoms, notes, vitals and `condition_status` (`IMPROVING / STABLE / WORSENING / RESOLVED`). Reading the consultations of a case in time order gives the full progression of the patient's condition.
7. **Prescriptions.** One row per prescribed drug, linked to the consultation, the case, the drug catalogue entry, patient and doctor. Status is `ACTIVE → COMPLETED | DISCONTINUED`. Marking a drug done never deletes it: the patient view filters `status = 'ACTIVE'`, the doctor view shows everything.
8. **Private doctor metrics are separate entities.** `DOCTOR_REVIEW` and `DOCTOR_PERFORMANCE` (rating, popularity) are split from `DOCTOR` so that the public profile (specialization, bio, qualifications, experience) can be exposed to patients without any risk of leaking rating data. Only hospital admins may read them; patients may only insert a review for their own completed appointment (one per appointment).
9. **Chat.** One `CONVERSATION` per patient–doctor pair, many `MESSAGE`s. `message_type` (`TEXT / IMAGE / VOICE / FILE`) with `attachment_url` covers "speaking" via voice notes. Real-time calls would be handled by a separate service.
10. **Running late is per doctor per clinic day.** `DOCTOR_DELAY` holds one delay for today (clinic time, UTC+4); each scheduled visit today shows `expected_start = slot.start_time + delay`. `notified_minutes` stops a text for every small change. `APPOINTMENT.checked_in_at` records arrival without adding a status, so the status lifecycle above is unchanged.
11. **Renewal = new prescription.** Approving a `PRESCRIPTION_RENEWAL` creates a new `PRESCRIPTION` with the same drug, dose and frequency and `supersedes_id` pointing at the old one (same chain as substitution); an active old one becomes `COMPLETED`. History is never edited.
12. **Questions are not chat.** `PATIENT_QUESTION` is one short question and one answer, with an urgency, a reply window the doctor sets (`DOCTOR.reply_within_hours`) and "seen" receipts. The doctor gets no texts; the patient gets a text that an answer exists, never the clinical text itself.
13. **Waitlist holds instead of first-come booking.** A freed or new slot is held for the first matching `WAITLIST_ENTRY` (FIFO, `wanted_before` respected) via `TIME_SLOT.held_for_patient_id/held_until`; others cannot book it until the hold lapses. Lapsed holds are expired lazily and passed to the next patient.

## 4. Business rules not expressible as plain keys (enforce in service layer or triggers)

- `appointment.patient_id` must equal `treatment_case.patient_id` of its consultation.
- A doctor only creates treatment cases, consultations and prescriptions for patients who have an appointment with them.
- A review requires `appointment.status = COMPLETED`.
- Conversation creation requires at least one non-cancelled appointment between the pair.
- A patient may cancel only while `status = SCHEDULED` and before a cutoff time (policy parameter).
- Booking = one transaction: lock the slot row, check `AVAILABLE`, insert appointment, set slot `BOOKED`. Cancellation reverses it.
- Prescription becomes `COMPLETED` when the doctor marks it, or automatically by a job once `end_date` has passed.
- A delay can be set by the doctor (own) or a hospital admin (own hospital's doctors); delay texts go out from 15 minutes and again only after a 10-minute change.
- Check-in only for a `SCHEDULED` visit on its clinic day, by the patient, the doctor or reception.
- At most one `PENDING` renewal per prescription; no renewal for a `DISCONTINUED` drug or a `RESOLVED`/`CLOSED` case.
- A patient may question only a doctor they have a non-cancelled appointment with, at most 3 open questions per doctor, and only while the doctor has `questions_open`.
- One active (`WAITING`/`OFFERED`) waitlist entry per patient per doctor. Booking a held slot is refused for everyone except the holder until `held_until`.

## 5. Access matrix

| Data | Patient | Doctor | Hospital admin |
|---|---|---|---|
| Doctor public profile (specialization, bio, qualifications, experience) | read | read/edit own | read/edit |
| Doctor rating, reviews, popularity | no | no | read |
| Time slots | read available | read own (timetable) | create/update/delete |
| Appointments | own: create, cancel, read | own: read, update status | read for hospital |
| Treatment cases, consultations | no | read/write own patients | no |
| Prescriptions | own, `ACTIVE` only | all, read/write | no |
| Chat | own conversations | own conversations | no |
| Doctor delay (running late) | read | read/write own | read/write own hospital |
| Check-in | own visits | own visits | own hospital's visits |
| Prescription renewals | own: request, cancel, read | own: approve, decline, read | no |
| Patient questions | own: ask, close, read | own: answer, close, read | no |
| Waitlist | own: join, accept, decline, leave | read own | read own hospital |

Implement the "no" cells with database views plus role-based checks in the API (and optionally Row-Level Security); the SQL file provides the views `v_doctor_public_profile` and `v_patient_active_prescription`.
