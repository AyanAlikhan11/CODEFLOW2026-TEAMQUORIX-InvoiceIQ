import os
from dotenv import load_dotenv

# Always load .env from the project root (one level above this file)
_env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env")
load_dotenv(dotenv_path=_env_path, override=True)


def get_gemini_api_key() -> str:
    return os.getenv("GEMINI_API_KEY", "")


def get_gemini_model() -> str:
    return os.getenv("GEMINI_MODEL", "gemini-2.5-flash")


# File upload limits
MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024   # 20 MB

ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
    "application/pdf",
}