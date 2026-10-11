import mimetypes
from pathlib import Path
from typing import Optional
from PIL import Image
import fitz

from app.core.config import settings
from app.core.errors import CorruptedFileError
from app.models.analysis import FileAnalysisResult, ImageDimensions
from app.services.size_parser import format_bytes

try:
    import pillow_heif
    pillow_heif.register_heif_opener()
    HEIF_SUPPORTED = True
except Exception:
    HEIF_SUPPORTED = False

def detect_mime_type(filepath: Path, filename: str) -> str:
    mime, _ = mimetypes.guess_type(filename)
    if mime:
        return mime
    
    ext = Path(filename).suffix.lower().lstrip(".")
    mime_map = {
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "png": "image/png",
        "webp": "image/webp",
        "heic": "image/heic",
        "heif": "image/heif",
        "gif": "image/gif",
        "bmp": "image/bmp",
        "tif": "image/tiff",
        "tiff": "image/tiff",
        "svg": "image/svg+xml",
        "pdf": "application/pdf",
        "txt": "text/plain",
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    }
    return mime_map.get(ext, "application/octet-stream")

def analyze_file(filepath: Path, original_filename: str) -> FileAnalysisResult:
    if not filepath.exists():
        raise CorruptedFileError("Uploaded file path does not exist on disk.")

    size_bytes = filepath.stat().st_size
    size_human = format_bytes(size_bytes)
    
    ext = Path(original_filename).suffix.lower().lstrip(".")
    if not ext:
        ext = filepath.suffix.lower().lstrip(".")
        
    mime_type = detect_mime_type(filepath, original_filename)
    
    is_image = ext in settings.SUPPORTED_IMAGE_EXTENSIONS or mime_type.startswith("image/")
    is_doc = ext in settings.SUPPORTED_DOC_EXTENSIONS or mime_type.startswith("application/") or mime_type.startswith("text/")
    
    category = "unsupported"
    is_supported = False
    supported_operations = []
    dimensions: Optional[ImageDimensions] = None
    color_mode: Optional[str] = None
    has_alpha: Optional[bool] = None
    is_animated: Optional[bool] = None
    frame_count: Optional[int] = None
    pdf_pages: Optional[int] = None
    pdf_metadata: Optional[dict] = None
    recommendations: dict = {}

    if is_image and ext != "svg":
        category = "image"
        is_supported = True
        supported_operations = ["compress", "resize", "quality_adjust", "convert", "target_size"]
        
        try:
            with Image.open(filepath) as img:
                w, h = img.size
                dimensions = ImageDimensions(width=w, height=h)
                color_mode = img.mode
                has_alpha = img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info)
                is_animated = bool(getattr(img, "is_animated", False) and getattr(img, "n_frames", 1) > 1)
                frame_count = getattr(img, "n_frames", 1) if is_animated else None
                
                if is_animated:
                    recommendations["format"] = f"Animated image detected ({frame_count} frames). Animation and frame timing will be preserved."
                elif ext in ("heic", "heif"):
                    recommendations["format"] = "HEIC photo detected. Convert to JPG or PNG for maximum web compatibility, or PDF for documents."
                elif ext == "png" and size_bytes > 500 * 1024:
                    recommendations["format"] = "Converting large PNGs to WEBP or JPEG can achieve 70-90% size reduction with minimal visual loss."
        except Exception as e:
            raise CorruptedFileError(f"Image analysis failed: file appears corrupted or invalid ({str(e)}).")

    elif ext == "svg":
        category = "image"
        is_supported = True
        supported_operations = ["convert", "target_size"]
        dimensions = ImageDimensions(width=800, height=800)

    elif ext == "pdf":
        category = "document"
        is_supported = True
        supported_operations = ["compress", "pdf_optimize", "image_recompression", "metadata_removal", "target_size", "convert_to_images", "convert_to_txt"]
        
        try:
            with fitz.open(filepath) as doc:
                pdf_pages = len(doc)
                raw_meta = doc.metadata or {}
                pdf_metadata = {k: v for k, v in raw_meta.items() if v}
                total_images = sum(len(page.get_images()) for page in doc)
                if total_images > 0:
                    recommendations["embedded_images"] = f"Detected {total_images} embedded image(s)."
        except Exception as e:
            raise CorruptedFileError(f"PDF analysis failed: file appears corrupted or unreadable ({str(e)}).")

    elif ext in ("txt", "docx", "xlsx", "pptx"):
        category = "document"
        is_supported = True
        supported_operations = ["convert", "compress"]

    return FileAnalysisResult(
        filename=original_filename,
        extension=ext,
        mime_type=mime_type,
        size_bytes=size_bytes,
        size_human=size_human,
        category=category,
        is_supported=is_supported,
        dimensions=dimensions,
        color_mode=color_mode,
        has_alpha=has_alpha,
        is_animated=is_animated,
        frame_count=frame_count,
        pdf_pages=pdf_pages,
        pdf_metadata=pdf_metadata,
        supported_operations=supported_operations,
        recommendations=recommendations or None
    )
