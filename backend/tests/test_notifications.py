"""Safety tests for prescription notifications.

Core guarantee: with delivery flags OFF (the default until the site is fully
built), the system only logs — zero SMTP/HTTP calls may happen. These tests
fail loudly if anyone accidentally wires real sending into the default path.
"""
import pytest

from app.core.config import settings
from app.services import notifications as svc


class _Row:
    def __init__(self, channel, recipient, body="Take your drug.", subject=None):
        self.channel = channel
        self.recipient = recipient
        self.body = body
        self.subject = subject
        self.status = "PENDING"
        self.error = None
        self.sent_at = None


class _DB:
    def commit(self):
        pass


def _no_network(monkeypatch):
    def _boom(*a, **k):
        raise AssertionError("network call attempted while delivery is disabled")
    monkeypatch.setattr(svc, "_send_email", _boom)
    monkeypatch.setattr(svc, "_send_sms", _boom)


def test_defaults_are_off():
    assert settings.NOTIFY_EMAIL_ENABLED is False
    assert settings.NOTIFY_SMS_ENABLED is False


def test_disabled_channels_only_log_and_never_send(monkeypatch):
    _no_network(monkeypatch)
    assert svc.send_outbox_row(_DB(), _Row("EMAIL", "real.person@gmail.com")) == "LOGGED"
    assert svc.send_outbox_row(_DB(), _Row("SMS", "+995555000001")) == "LOGGED"


def test_allowlist_skips_non_listed_even_when_enabled(monkeypatch):
    monkeypatch.setattr(settings, "NOTIFY_EMAIL_ENABLED", True)
    monkeypatch.setattr(settings, "NOTIFY_SMS_ENABLED", True)
    monkeypatch.setattr(settings, "SMTP_USER", "x@gmail.com")
    monkeypatch.setattr(settings, "SMTP_PASS", "secret")
    monkeypatch.setattr(settings, "TWILIO_ACCOUNT_SID", "sid")
    monkeypatch.setattr(settings, "TWILIO_AUTH_TOKEN", "tok")
    monkeypatch.setattr(settings, "TWILIO_FROM", "+1000")
    monkeypatch.setattr(settings, "NOTIFY_ALLOWLIST", "me@gmail.com,+995555000099")
    _no_network(monkeypatch)
    assert svc.send_outbox_row(_DB(), _Row("EMAIL", "stranger@gmail.com")) == "SKIPPED"
    assert svc.send_outbox_row(_DB(), _Row("SMS", "+995555000001")) == "SKIPPED"


def test_allowlisted_recipient_attempts_send(monkeypatch):
    monkeypatch.setattr(settings, "NOTIFY_EMAIL_ENABLED", True)
    monkeypatch.setattr(settings, "SMTP_USER", "x@gmail.com")
    monkeypatch.setattr(settings, "SMTP_PASS", "secret")
    monkeypatch.setattr(settings, "NOTIFY_ALLOWLIST", "me@gmail.com")
    monkeypatch.setattr(svc, "_send_email", lambda *a, **k: None)
    assert svc.send_outbox_row(_DB(), _Row("EMAIL", "me@gmail.com")) == "SENT"


def test_enqueue_writes_rows_without_sending(monkeypatch):
    _no_network(monkeypatch)

    class _CollectDB:
        def __init__(self):
            self.added = []

        def add(self, o):
            self.added.append(o)

    db = _CollectDB()
    svc.enqueue_prescription_change(
        db, action="substituted", patient_email="p@t.ge", patient_phone="+9951",
        patient_id=5, prescription_id=9, drug_name="Ibuprofen", dosage="400mg",
        frequency="twice a day", duration_note="for about a month",
        start_date=None, end_date=None, doctor_name="Davit M",
        old_drug_name="Paracetamol")
    assert len(db.added) == 2
    channels = {r.channel for r in db.added}
    assert channels == {"EMAIL", "SMS"}
    sms = next(r for r in db.added if r.channel == "SMS")
    assert "Paracetamol" in sms.body and "twice a day" in sms.body


def test_message_bodies_carry_minimal_info():
    email, sms = svc.build_prescription_messages(
        action="created", drug_name="Metoprolol", dosage="25mg",
        frequency="once daily", duration_note="for about a month",
        start_date="2026-10-10", end_date=None, doctor_name="Davit M")
    assert "Metoprolol" in email and "for about a month" in email
    assert "ongoing" in email and len(sms) <= 300
