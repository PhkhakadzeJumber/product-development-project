"""doctor multi-hospital join table + admin split names.

Revision ID: 0006
Revises: 0005
"""

revision = "0006"
down_revision = "0005"

from alembic import op


def upgrade():
    op.execute(
        "CREATE TABLE IF NOT EXISTS doctor_hospitals ("
        "doctor_id INTEGER NOT NULL REFERENCES doctors(doctor_id) ON DELETE CASCADE, "
        "hospital_id INTEGER NOT NULL REFERENCES hospitals(hospital_id) ON DELETE CASCADE, "
        "PRIMARY KEY (doctor_id, hospital_id))"
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_doctor_hospitals_hospital_id ON doctor_hospitals (hospital_id)")
    # Backfill join rows from the current single-hospital column.
    op.execute(
        "INSERT INTO doctor_hospitals (doctor_id, hospital_id) "
        "SELECT doctor_id, hospital_id FROM doctors "
        "ON CONFLICT DO NOTHING"
    )
    op.execute("ALTER TABLE hospital_admins ADD COLUMN IF NOT EXISTS first_name VARCHAR(100) NOT NULL DEFAULT ''")
    op.execute("ALTER TABLE hospital_admins ADD COLUMN IF NOT EXISTS last_name VARCHAR(100) NOT NULL DEFAULT ''")
    # Backfill split names from full_name ("First Last...").
    op.execute(
        "UPDATE hospital_admins SET "
        "first_name = split_part(full_name, ' ', 1), "
        "last_name = NULLIF(substr(full_name, strpos(full_name, ' ') + 1), '') "
        "WHERE (first_name = '' OR last_name = '') AND full_name IS NOT NULL AND full_name <> ''"
    )
    op.execute("UPDATE hospital_admins SET last_name = '' WHERE last_name IS NULL")


def downgrade():
    op.execute("DROP TABLE IF EXISTS doctor_hospitals")
    op.execute("ALTER TABLE hospital_admins DROP COLUMN IF EXISTS first_name")
    op.execute("ALTER TABLE hospital_admins DROP COLUMN IF EXISTS last_name")
