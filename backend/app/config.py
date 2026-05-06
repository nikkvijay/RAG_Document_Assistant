from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Server
    port: int = 5000
    environment: str = "development"

    # CORS
    frontend_url: str = "http://localhost:4200"

    # API keys
    gemini_api_key: str

    # File upload
    max_file_size: int = 10 * 1024 * 1024  # 10 MB
    upload_dir: Path = Path("uploads")

    # Rate limiting
    rate_limit_window_seconds: int = 900  # 15 minutes
    rate_limit_max_requests: int = 100

    # Logging
    log_level: str = "INFO"
    log_dir: Path = Path("logs")

    # RAG
    chunk_size: int = 1000
    chunk_overlap: int = 200
    max_documents: int = 10

    # AI model
    temperature: float = 0.7
    max_output_tokens: int = 1024

    @field_validator("upload_dir", "log_dir", mode="before")
    @classmethod
    def _ensure_dir(cls, v: str | Path) -> Path:
        p = Path(v)
        p.mkdir(parents=True, exist_ok=True)
        return p

    @property
    def is_development(self) -> bool:
        return self.environment.lower() == "development"

    @property
    def rate_limit_string(self) -> str:
        minutes = self.rate_limit_window_seconds // 60
        return f"{self.rate_limit_max_requests}/{minutes}minutes"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
