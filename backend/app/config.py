from pydantic_settings import BaseSettings
class Settings(BaseSettings):
    mongodb_uri: str = ""
    database_name: str = "etaura"
    jwt_secret: str = "change-this-in-production"
    cors_origins: str = "http://localhost:5173"
    class Config:
        env_file = ".env"
settings = Settings()
