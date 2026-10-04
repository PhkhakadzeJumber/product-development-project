"""add avatar/image URL columns.

Revision ID: 0004
Revises: 0003

NOTE: 0002 creates all tables via Base.metadata.create_all(), which already
includes these columns on FRESH databases. IF NOT EXISTS keeps this
migration idempotent on both fresh and existing databases.
"""

revision = "0004"
down_revision = "0003"

from alembic import op


def upgrade():
    # doctors.photo_url already exists (see subtypes.py / er_model.md) — nothing to do.
    op.execute("ALTER TABLE patients ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500)")
    op.execute("ALTER TABLE drugs ADD COLUMN IF NOT EXISTS image_url VARCHAR(500)")


def downgrade():
    op.execute("ALTER TABLE drugs DROP COLUMN IF EXISTS image_url")
    op.execute("ALTER TABLE patients DROP COLUMN IF EXISTS avatar_url")
