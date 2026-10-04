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


settings = Settings()
