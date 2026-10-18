from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/hospital_db"
    JWT_SECRET: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60
    CANCEL_CUTOFF_HOURS: int = 2
    # Comma-separated list of allowed browser origins, e.g. "http://localhost:3000"
    CORS_ORIGINS: str = "http://localhost:3000"

    # --- Prescription notifications (email + SMS) ---
    # SAFETY: both channels are OFF by default. With them off, the system only
    # writes the outbox row and logs to console — provider SDKs are never
    # initialized, so no real message can leave the server. Turn on only with
    # real credentials in local .env when ready to test with your own address.
    NOTIFY_EMAIL_ENABLED: bool = False
    NOTIFY_SMS_ENABLED: bool = False
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASS: str = ""
    SMTP_FROM: str = ""
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_FROM: str = ""
    # Comma-separated allowlist, e.g. "me@gmail.com,+9955xxxxxxx".
    # When non-empty and delivery is on, only listed recipients get real
    # messages; everyone else is logged only. Recommended during testing.
    NOTIFY_ALLOWLIST: str = ""

    # --- Between-visit care features ---
    # Clinics are in Georgia (UTC+4, no daylight saving). "Today" for running-late
    # and check-in is the clinic's calendar day, not the server's.
    CLINIC_UTC_OFFSET_HOURS: int = 4
    # A delay notice goes out only from this many minutes, and again only when the
    # delay moves by at least DELAY_RENOTIFY_STEP_MINUTES (no SMS for every tap).
    DELAY_NOTIFY_MIN_MINUTES: int = 15
    DELAY_RENOTIFY_STEP_MINUTES: int = 10
    # A freed slot offered from the waitlist is held for one patient this long.
    WAITLIST_HOLD_MINUTES: int = 120
    # Open questions a patient may have with one doctor at the same time.
    MAX_OPEN_QUESTIONS_PER_DOCTOR: int = 3


settings = Settings()
