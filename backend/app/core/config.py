from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    project_name: str = "NovaCode"
    secret_key: str = "change-me-in-env"
    database_url: str = "sqlite:///./novacode.db"

    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "auto"

    admin_email: str = "admin@example.com"
    admin_password: str = "Admin123!"

    default_language: str = "ru"
    supported_languages: str = "en,ru"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def supported_languages_list(self) -> list[str]:
        return [lang.strip() for lang in self.supported_languages.split(",") if lang.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
