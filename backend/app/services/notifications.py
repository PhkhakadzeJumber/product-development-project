"""Prescription change notifications (Gmail SMTP + Twilio SMS).

SAFETY MODEL — read before touching:
- Both channels default OFF (config NOTIFY_EMAIL_ENABLED / NOTIFY_SMS_ENABLED).
  When off, `send_outbox_row` only logs to console and marks the row LOGGED.
  Provider clients are constructed lazily and ONLY when the channel is on
  AND credentials are present — otherwise sending is impossible by construction.
- Allowlist: when NOTIFY_ALLOWLIST is non-empty and delivery is on, only
  listed recipients get real messages; everyone else is marked SKIPPED
  (still logged). Use this when testing with your own address.
- Bodies carry minimal info (drug + schedule + doctor), never exam notes.
- `enqueue_prescription_change` only writes inert DB rows; it never sends.
"""
import logging
import smtplib
from email.message import EmailMessage

import httpx

from app.core.config import settings

log = logging.getLogger("notifications")

EMAIL_SUBJECT = "Your prescription was updated"


def _allowlist() -> set[str]:
    return {x.strip().lower() for x in settings.NOTIFY_ALLOWLIST.split(",") if x.strip()}


def _allowed(recipient: str) -> bool:
    allow = _allowlist()
    return not allow or recipient.strip().lower() in allow


def _email_configured() -> bool:
    return bool(settings.NOTIFY_EMAIL_ENABLED and settings.SMTP_USER and settings.SMTP_PASS)


def _sms_configured() -> bool:
    return bool(settings.NOTIFY_SMS_ENABLED and settings.TWILIO_ACCOUNT_SID
                and settings.TWILIO_AUTH_TOKEN and settings.TWILIO_FROM)


def build_prescription_messages(*, action: str, drug_name: str, dosage: str | None,
                                frequency: str | None, duration_note: str | None,
                                start_date, end_date, doctor_name: str,
                                old_drug_name: str | None = None) -> tuple[str, str]:
    """Returns (email_body, sms_body). Shared so templates stay consistent."""
    schedule = " ".join(x for x in [frequency, duration_note] if x) or "as directed"
    if dosage:
        schedule = f"{dosage}, {schedule}"
    dates = f"from {start_date}" if start_date else "starting now"
    if end_date:
        dates += f" until {end_date}"
    else:
        dates += " (ongoing until your doctor updates it)"
    headline = {
        "created": f"Dr. {doctor_name} prescribed {drug_name}.",
        "edited": f"Dr. {doctor_name} updated your {drug_name} prescription.",
        "discontinued": f"Dr. {doctor_name} stopped {drug_name}.",
        "substituted": f"Dr. {doctor_name} replaced {old_drug_name or 'your previous drug'} with {drug_name}.",
        "ended": f"Dr. {doctor_name} set an end date for {drug_name}.",
    }.get(action, f"Dr. {doctor_name} updated your prescription for {drug_name}.")
    email_body = (
        f"{headline}\n\nSchedule: {schedule}.\nUsage: {dates}.\n\n"
        "If anything is unclear or you cannot access the drug, contact your doctor "
        "or your hospital. Do not stop treatment on your own."
    )
    sms_body = f"{headline} Schedule: {schedule}. {dates}."[:300]
    return email_body, sms_body


def enqueue_prescription_change(db, *, action: str, patient_email: str | None,
                                patient_phone: str | None, patient_id: int | None,
                                prescription_id: int | None, **msg_kwargs) -> None:
    """Write outbox rows in the current transaction. Never sends anything."""
    email_body, sms_body = build_prescription_messages(action=action, **msg_kwargs)
    if patient_email:
        db.add(_outbox("EMAIL", patient_email, email_body, prescription_id, patient_id))
    if patient_phone:
        db.add(_outbox("SMS", patient_phone, sms_body, prescription_id, patient_id))


def _outbox(channel: str, recipient: str, body: str,
            prescription_id: int | None, patient_id: int | None):
    from app.models.notifications import NotificationOutbox
    return NotificationOutbox(channel=channel, recipient=recipient,
                              subject=EMAIL_SUBJECT if channel == "EMAIL" else None,
                              body=body, status="PENDING",
                              prescription_id=prescription_id, patient_id=patient_id)


def send_outbox_row(db, row) -> str:
    """Deliver one outbox row (or log it). Returns the final status.

    Never raises: failures are recorded on the row as FAILED.
    """
    from datetime import datetime, timezone
    try:
        if row.channel == "EMAIL":
            if not _email_configured():
                log.info("[notify:email:logged] to=%s body=%s", row.recipient, row.body)
                row.status = "LOGGED"
            elif not _allowed(row.recipient):
                log.info("[notify:email:skipped-allowlist] to=%s", row.recipient)
                row.status = "SKIPPED"
            else:
                _send_email(row.recipient, row.subject or EMAIL_SUBJECT, row.body)
                row.status = "SENT"
        elif row.channel == "SMS":
            if not _sms_configured():
                log.info("[notify:sms:logged] to=%s body=%s", row.recipient, row.body)
                row.status = "LOGGED"
            elif not _allowed(row.recipient):
                log.info("[notify:sms:skipped-allowlist] to=%s", row.recipient)
                row.status = "SKIPPED"
            else:
                _send_sms(row.recipient, row.body)
                row.status = "SENT"
        else:
            row.status = "FAILED"
            row.error = f"Unknown channel {row.channel}"
        if row.status in ("SENT", "LOGGED", "SKIPPED"):
            row.sent_at = datetime.now(timezone.utc)
    except Exception as exc:  # delivery must never break the request
        log.warning("[notify:failed] channel=%s to=%s err=%s", row.channel, row.recipient, exc)
        row.status = "FAILED"
        row.error = str(exc)[:1000]
    db.commit()
    return row.status


def _send_email(to: str, subject: str, body: str) -> None:
    msg = EmailMessage()
    msg["From"] = settings.SMTP_FROM or settings.SMTP_USER
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body)
    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as smtp:
        smtp.starttls()
        smtp.login(settings.SMTP_USER, settings.SMTP_PASS)
        smtp.send_message(msg)


def _send_sms(to: str, body: str) -> None:
    url = (f"https://api.twilio.com/2010-04-01/Accounts/"
           f"{settings.TWILIO_ACCOUNT_SID}/Messages.json")
    resp = httpx.post(url, auth=(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN),
                      data={"From": settings.TWILIO_FROM, "To": to, "Body": body},
                      timeout=15)
    resp.raise_for_status()


def process_pending(db, *, limit: int = 50) -> dict:
    """Send pending outbox rows. Used by BackgroundTasks (v1)."""
    from app.models.notifications import NotificationOutbox
    rows = (db.query(NotificationOutbox).filter_by(status="PENDING")
            .order_by(NotificationOutbox.notification_id).limit(limit).all())
    counts: dict[str, int] = {}
    for row in rows:
        status = send_outbox_row(db, row)
        counts[status] = counts.get(status, 0) + 1
    return counts
