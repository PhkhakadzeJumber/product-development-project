from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health():
    assert client.get("/health").status_code == 200


def test_booking_double_book_guard():
    # Unit-level: booking service rejects non-AVAILABLE slot without DB.
    from unittest.mock import MagicMock
    from app.services.booking import book_appointment
    from app.models.enums import SlotStatus
    import pytest
    from fastapi import HTTPException
    db = MagicMock()
    slot = MagicMock(status=SlotStatus.BOOKED)
    db.execute.return_value.scalar_one_or_none.return_value = slot
    with pytest.raises(HTTPException):
        book_appointment(db, patient_id=1, slot_id=1, reason=None)
