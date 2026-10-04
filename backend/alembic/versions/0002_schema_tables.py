"""create all tables from models + views/exclusion constraint.

Revision ID: 0002
Revises: 0001
"""

revision = "0002"
down_revision = "0001"

from alembic import op


def upgrade():
    # Import here (after env.py has set up sys.path) so Base.metadata
    # includes every model module.
    from app.db.base import Base
    from app.models import (  # noqa: F401
        catalog,
        chat,
        clinical,
        feedback,
        scheduling,
        subtypes,
        user_account,
    )

    bind = op.get_bind()
    # Creates all tables defined on Base.metadata (regions, hospitals,
    # user_accounts, patients, doctors, time_slots, appointments, ...).
    # checkfirst=True (default) keeps this idempotent.
    Base.metadata.create_all(bind=bind)

    op.execute("CREATE EXTENSION IF NOT EXISTS btree_gist;")
    # Prevent overlapping slots for the same doctor. Safe to re-run.
    op.execute("ALTER TABLE time_slots DROP CONSTRAINT IF EXISTS no_overlapping_slots;")
    op.execute(
        "ALTER TABLE time_slots ADD CONSTRAINT no_overlapping_slots "
        "EXCLUDE USING gist (doctor_id WITH =, tstzrange(start_time, end_time) WITH &&);"
    )
    op.execute(
        "CREATE OR REPLACE VIEW v_doctor_public_profile AS "
        "SELECT d.doctor_id, d.hospital_id, d.specialization_id, d.first_name, d.last_name, "
        "d.bio, d.qualifications, d.years_of_experience, s.name AS specialization "
        "FROM doctors d LEFT JOIN specializations s USING (specialization_id);"
    )
    op.execute(
        "CREATE OR REPLACE VIEW v_patient_active_prescription AS "
        "SELECT * FROM prescriptions WHERE status = 'ACTIVE';"
    )


def downgrade():
    op.execute("DROP VIEW IF EXISTS v_patient_active_prescription;")
    op.execute("DROP VIEW IF EXISTS v_doctor_public_profile;")
    op.execute("ALTER TABLE time_slots DROP CONSTRAINT IF EXISTS no_overlapping_slots;")
    from app.db.base import Base
    from app.models import (  # noqa: F401
        catalog,
        chat,
        clinical,
        feedback,
        scheduling,
        subtypes,
        user_account,
    )

    bind = op.get_bind()
    Base.metadata.drop_all(bind=bind)
