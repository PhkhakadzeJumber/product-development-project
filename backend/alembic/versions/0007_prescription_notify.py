"""prescription schedule fields + notification outbox.

Revision ID: 0007
Revises: 0006
"""

revision = "0007"
down_revision = "0006"

from alembic import op


def upgrade():
    op.execute("ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS duration_note VARCHAR(120)")
    op.execute("ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS discontinue_reason VARCHAR(1000)")
    op.execute("ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS supersedes_id INTEGER REFERENCES prescriptions(prescription_id)")
    op.execute(
        "CREATE TABLE IF NOT EXISTS notification_outbox ("
        "notification_id SERIAL PRIMARY KEY, "
        "channel VARCHAR(8) NOT NULL, "
        "recipient VARCHAR(255) NOT NULL, "
        "subject VARCHAR(255), "
        "body VARCHAR(4000) NOT NULL, "
        "status VARCHAR(16) NOT NULL DEFAULT 'PENDING', "
        "prescription_id INTEGER REFERENCES prescriptions(prescription_id), "
        "patient_id INTEGER, "
        "error VARCHAR(1000), "
        "created_at TIMESTAMPTZ NOT NULL DEFAULT now(), "
        "sent_at TIMESTAMPTZ)"
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_notification_outbox_status ON notification_outbox (status)")


def downgrade():
    op.execute("DROP TABLE IF EXISTS notification_outbox")
    op.execute("ALTER TABLE prescriptions DROP COLUMN IF EXISTS supersedes_id")
    op.execute("ALTER TABLE prescriptions DROP COLUMN IF EXISTS discontinue_reason")
    op.execute("ALTER TABLE prescriptions DROP COLUMN IF EXISTS duration_note")
