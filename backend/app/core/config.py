import os
import tempfile
from pathlib import Path
from pydantic import BaseModel

class Settings(BaseModel):
    PROJECT_NAME: str = "SizeFix-Python Processing & Conversion Engine"
    API_V1_STR: str = "/api/v1"
    
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    TEMP_DIR: Path = Path(os.environ.get("TEMP_STORAGE_DIR", str(Path(__file__).resolve().parent.parent.parent / "temp_storage")))
    
    MAX_FILE_SIZE_BYTES: int = 200 * 1024 * 1024
    
    SUPPORTED_IMAGE_EXTENSIONS: set[str] = {
        "jpg", "jpeg", "png", "webp", "avif", "heic", "heif", "gif", "bmp", "tiff", "tif", "svg"
    }
    
    SUPPORTED_DOC_EXTENSIONS: set[str] = {
        "pdf", "txt", "docx", "xlsx", "pptx"
    }

    FUTURE_EXTENSIONS: set[str] = {
        "csv", "zip", "rtf", "odt", "epub"
    }

settings = Settings()

try:
    os.makedirs(settings.TEMP_DIR, exist_ok=True)
except OSError:
    settings.TEMP_DIR = Path(tempfile.gettempdir()) / "sizefix_temp"
    os.makedirs(settings.TEMP_DIR, exist_ok=True)

