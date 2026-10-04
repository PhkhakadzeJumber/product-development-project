"""add drugs.description for drug detail pages.

Revision ID: 0005
Revises: 0004
"""

revision = "0005"
down_revision = "0004"

from alembic import op


def upgrade():
    op.execute("ALTER TABLE drugs ADD COLUMN IF NOT EXISTS description VARCHAR(2000)")


def downgrade():
    op.execute("ALTER TABLE drugs DROP COLUMN IF EXISTS description")
