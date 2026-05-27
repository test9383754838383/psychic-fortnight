from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./dev.db"
    SESSION_SECRET: str = "dev-secret-change-me"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
