from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./dev.db"
    TESTING: bool = False
    SESSION_SECRET: str = "dev-secret-change-me"
    SESSION_IDLE_TIMEOUT_MINUTES: int = 30
    SESSION_ABSOLUTE_TIMEOUT_HOURS: int = 8
    SESSION_PURGE_INTERVAL_HOURS: int = 6
    LOGIN_RATE_LIMIT: str = "5/minute"
    COOKIE_SECURE: bool = False  # Set to True in production via env var

    # Argon2 production defaults (OWASP minimum: m=19456, t=2, p=1)
    ARGON2_TIME_COST: int = 2
    ARGON2_MEMORY_COST: int = 19456
    ARGON2_PARALLELISM: int = 1

    # File uploads
    UPLOAD_DIR: str = "uploads"
    UPLOAD_MAX_BYTES: int = 10 * 1024 * 1024  # 10 MB
    UPLOAD_ALLOWED_TYPES: list[str] = [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/tiff",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ]

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
