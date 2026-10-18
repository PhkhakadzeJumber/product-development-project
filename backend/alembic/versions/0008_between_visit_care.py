"""between-visit care: running late + check-in, prescription renewals,
patient questions, appointment waitlist.

Revision ID: 0008
Revises: 0007
"""

revision = "0008"
down_revision = "0007"

from alembic import op


def upgrade():
    # Running late + check-in
    op.execute(
        "CREATE TABLE IF NOT EXISTS doctor_delays ("
        "delay_id SERIAL PRIMARY KEY, "
        "doctor_id INTEGER NOT NULL REFERENCES doctors(doctor_id) ON DELETE CASCADE, "
        "day DATE NOT NULL, "
        "delay_minutes INTEGER NOT NULL DEFAULT 0, "
        "note VARCHAR(200), "
        "notified_minutes INTEGER NOT NULL DEFAULT 0, "
        "updated_by INTEGER REFERENCES user_accounts(user_id), "
        "updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), "
        "CONSTRAINT uq_doctor_delay_day UNIQUE (doctor_id, day))"
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_doctor_delays_doctor_id ON doctor_delays (doctor_id)")
    op.execute("ALTER TABLE appointments ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ")

    # Prescription renewals
    op.execute(
        "CREATE TABLE IF NOT EXISTS prescription_renewals ("
        "renewal_id SERIAL PRIMARY KEY, "
        "prescription_id INTEGER NOT NULL REFERENCES prescriptions(prescription_id), "
        "patient_id INTEGER NOT NULL REFERENCES patients(patient_id), "
        "doctor_id INTEGER NOT NULL REFERENCES doctors(doctor_id), "
        "status VARCHAR(16) NOT NULL DEFAULT 'PENDING', "
        "patient_note VARCHAR(500), "
        "doctor_note VARCHAR(500), "
        "new_prescription_id INTEGER REFERENCES prescriptions(prescription_id), "
        "created_at TIMESTAMPTZ NOT NULL DEFAULT now(), "
        "decided_at TIMESTAMPTZ)"
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_prescription_renewals_doctor_status ON prescription_renewals (doctor_id, status)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_prescription_renewals_patient_id ON prescription_renewals (patient_id)")
    # At most one pending request per prescription (the API checks too).
    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_renewal_one_pending ON prescription_renewals (prescription_id) "
        "WHERE status = 'PENDING'"
    )

    # Patient questions + doctor reply settings
    op.execute(
        "CREATE TABLE IF NOT EXISTS patient_questions ("
        "question_id SERIAL PRIMARY KEY, "
        "patient_id INTEGER NOT NULL REFERENCES patients(patient_id), "
        "doctor_id INTEGER NOT NULL REFERENCES doctors(doctor_id), "
        "treatment_id INTEGER REFERENCES treatment_cases(treatment_id), "
        "urgency VARCHAR(16) NOT NULL DEFAULT 'ROUTINE', "
        "body VARCHAR(1000) NOT NULL, "
        "status VARCHAR(16) NOT NULL DEFAULT 'OPEN', "
        "answer VARCHAR(2000), "
        "created_at TIMESTAMPTZ NOT NULL DEFAULT now(), "
        "answered_at TIMESTAMPTZ, "
        "doctor_seen_at TIMESTAMPTZ, "
        "patient_seen_at TIMESTAMPTZ)"
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_patient_questions_doctor_status ON patient_questions (doctor_id, status)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_patient_questions_patient_id ON patient_questions (patient_id)")
    op.execute("ALTER TABLE doctors ADD COLUMN IF NOT EXISTS questions_open BOOLEAN NOT NULL DEFAULT TRUE")
    op.execute("ALTER TABLE doctors ADD COLUMN IF NOT EXISTS reply_within_hours INTEGER NOT NULL DEFAULT 48")
    op.execute("ALTER TABLE doctors ADD COLUMN IF NOT EXISTS reply_note VARCHAR(200)")

    # Waitlist + slot holds
    op.execute(
        "CREATE TABLE IF NOT EXISTS waitlist_entries ("
        "entry_id SERIAL PRIMARY KEY, "
        "patient_id INTEGER NOT NULL REFERENCES patients(patient_id), "
        "doctor_id INTEGER NOT NULL REFERENCES doctors(doctor_id), "
        "wanted_before DATE, "
        "note VARCHAR(500), "
        "status VARCHAR(16) NOT NULL DEFAULT 'WAITING', "
        "offered_slot_id INTEGER REFERENCES time_slots(slot_id), "
        "offered_at TIMESTAMPTZ, "
        "offer_expires_at TIMESTAMPTZ, "
        "appointment_id INTEGER REFERENCES appointments(appointment_id), "
        "created_at TIMESTAMPTZ NOT NULL DEFAULT now())"
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_waitlist_doctor_status ON waitlist_entries (doctor_id, status)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_waitlist_patient_id ON waitlist_entries (patient_id)")
    # One active (waiting or offered) entry per patient per doctor.
    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_waitlist_one_active ON waitlist_entries (patient_id, doctor_id) "
        "WHERE status IN ('WAITING', 'OFFERED')"
    )
    op.execute("ALTER TABLE time_slots ADD COLUMN IF NOT EXISTS held_for_patient_id INTEGER REFERENCES patients(patient_id)")
    op.execute("ALTER TABLE time_slots ADD COLUMN IF NOT EXISTS held_until TIMESTAMPTZ")

    # Outbox now carries more than prescription messages.
    op.execute("ALTER TABLE notification_outbox ADD COLUMN IF NOT EXISTS kind VARCHAR(32)")
    op.execute("UPDATE notification_outbox SET kind = 'prescription' WHERE kind IS NULL AND prescription_id IS NOT NULL")


def downgrade():
    op.execute("ALTER TABLE notification_outbox DROP COLUMN IF EXISTS kind")
    op.execute("ALTER TABLE time_slots DROP COLUMN IF EXISTS held_until")
    op.execute("ALTER TABLE time_slots DROP COLUMN IF EXISTS held_for_patient_id")
    op.execute("DROP TABLE IF EXISTS waitlist_entries")
    op.execute("ALTER TABLE doctors DROP COLUMN IF EXISTS reply_note")
    op.execute("ALTER TABLE doctors DROP COLUMN IF EXISTS reply_within_hours")
    op.execute("ALTER TABLE doctors DROP COLUMN IF EXISTS questions_open")
    op.execute("DROP TABLE IF EXISTS patient_questions")
    op.execute("DROP TABLE IF EXISTS prescription_renewals")
    op.execute("ALTER TABLE appointments DROP COLUMN IF EXISTS checked_in_at")
    op.execute("DROP TABLE IF EXISTS doctor_delays")
