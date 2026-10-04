"""seed 2 hardcoded hospitals (+ region/specializations) for registration forms.

Revision ID: 0003
Revises: 0002
"""

revision = "0003"
down_revision = "0002"

from alembic import op


def upgrade():
    # Region (id=1) so hospital rows have a valid optional FK.
    op.execute(
        "INSERT INTO regions (region_id, name, country_code) VALUES "
        "(1, 'Tbilisi', 'GE') "
        "ON CONFLICT (region_id) DO UPDATE SET name = EXCLUDED.name;"
    )
    # Two hardcoded hospitals with FIXED ids — frontend fallback uses the same ids.
    op.execute(
        "INSERT INTO hospitals (hospital_id, name, region_id, city, address, phone, email, is_active) VALUES "
        "(1, 'Tbilisi Central Hospital', 1, 'Tbilisi', '1 Rustaveli Ave', '+995322000001', 'info@tch.ge', TRUE), "
        "(2, 'Batumi Seaside Clinic', 1, 'Batumi', '2 Seaside St', '+995422000002', 'info@batumi-clinic.ge', TRUE) "
        "ON CONFLICT (hospital_id) DO UPDATE SET name = EXCLUDED.name, city = EXCLUDED.city, "
        "address = EXCLUDED.address, phone = EXCLUDED.phone, email = EXCLUDED.email, is_active = TRUE;"
    )
    op.execute("SELECT setval('hospitals_hospital_id_seq', (SELECT MAX(hospital_id) FROM hospitals));")
    op.execute("SELECT setval('regions_region_id_seq', (SELECT MAX(region_id) FROM regions));")
    # Minimal specializations so the doctor form dropdown is not empty.
    op.execute(
        "INSERT INTO specializations (specialization_id, name, description) VALUES "
        "(1, 'Cardiology', 'Heart and cardiovascular care'), "
        "(2, 'Pediatrics', 'Child health care') "
        "ON CONFLICT (specialization_id) DO NOTHING;"
    )
    op.execute("SELECT setval('specializations_specialization_id_seq', (SELECT MAX(specialization_id) FROM specializations));")


def downgrade():
    op.execute("DELETE FROM hospitals WHERE hospital_id IN (1, 2);")
