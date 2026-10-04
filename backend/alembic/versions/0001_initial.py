"""initial schema from er_model.md
Revision ID: 0001
"""
revision = "0001"
down_revision = None

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

USER_ROLE = postgresql.ENUM("PATIENT", "DOCTOR", "HOSPITAL_ADMIN", name="user_role", create_type=False)
GENDER = postgresql.ENUM("MALE", "FEMALE", "OTHER", name="gender", create_type=False)
CONSULT_MODE = postgresql.ENUM("IN_PERSON", "ONLINE", name="consultation_mode", create_type=False)
SLOT_STATUS = postgresql.ENUM("AVAILABLE", "BOOKED", "CANCELLED", name="slot_status", create_type=False)
APPT_STATUS = postgresql.ENUM("SCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW", name="appointment_status", create_type=False)
CANCELLED_BY = postgresql.ENUM("PATIENT", "DOCTOR", "ADMIN", name="cancelled_by", create_type=False)
SEVERITY = postgresql.ENUM("MILD", "MODERATE", "SEVERE", "CRITICAL", name="severity", create_type=False)
CASE_STATUS = postgresql.ENUM("OPEN", "IN_TREATMENT", "RESOLVED", "CLOSED", name="case_status", create_type=False)
COND_STATUS = postgresql.ENUM("IMPROVING", "STABLE", "WORSENING", "RESOLVED", name="condition_status", create_type=False)
RX_STATUS = postgresql.ENUM("ACTIVE", "COMPLETED", "DISCONTINUED", name="prescription_status", create_type=False)
MSG_TYPE = postgresql.ENUM("TEXT", "IMAGE", "VOICE", "FILE", name="message_type", create_type=False)


def upgrade():
    for e in (USER_ROLE, GENDER, CONSULT_MODE, SLOT_STATUS, APPT_STATUS, CANCELLED_BY, SEVERITY, CASE_STATUS, COND_STATUS, RX_STATUS, MSG_TYPE):
        e.create(op.get_bind(), checkfirst=True)
    op.execute("CREATE EXTENSION IF NOT EXISTS btree_gist;")
    # NOTE: tables are created in 0002 (Base.metadata.create_all),
    # views + exclusion constraint in 0002 after tables exist.
    # (0001 used to create views here, which failed on fresh DBs because
    # doctors/prescriptions tables did not exist yet.)


def downgrade():
    op.execute("DROP VIEW IF EXISTS v_patient_active_prescription; DROP VIEW IF EXISTS v_doctor_public_profile;")
