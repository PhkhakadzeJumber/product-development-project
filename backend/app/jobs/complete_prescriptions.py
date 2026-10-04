"""Mark ACTIVE prescriptions with past end_date as COMPLETED."""
from app.db.session import SessionLocal
from app.services.maintenance import complete_expired_prescriptions

db = SessionLocal()
print("completed:", complete_expired_prescriptions(db))
