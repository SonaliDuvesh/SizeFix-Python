import json
import mimetypes
import shutil
import time
import uuid
from pathlib import Path
from typing import Optional, Literal
from fastapi import APIRouter, UploadFile, File, Form, BackgroundTasks, status
from fastapi.responses import FileResponse, JSONResponse

from app.core.config import settings
from app.core.errors import AppError, CorruptedFileError, FileTooLargeError
from app.core.security import sanitize_filename, validate_file_size
from app.models.analysis import FileAnalysisResult, SupportedFormatsResponse
from app.models.processing import ProcessRequestOptions, ProcessResult
from app.services.analyzer import analyze_file
from app.services.optimizer import optimizer_service

router = APIRouter()

def cleanup_file(filepath: Path):
    if filepath and filepath.exists():
        try:
            filepath.unlink()
        except OSError:
            pass

def prune_old_temp_files(max_age_seconds: int = 3600):
    try:
        now = time.time()
        for p in settings.TEMP_DIR.iterdir():
            if p.is_file() and p.name != ".gitkeep" and (now - p.stat().st_mtime) > max_age_seconds:
                try:
                    p.unlink()
                except OSError:
                    pass
    except Exception:
        pass

@router.get("/health", tags=["System"])
def health_check():
    return {"status": "ok", "service": settings.PROJECT_NAME}

@router.get("/supported-formats", response_model=SupportedFormatsResponse, tags=["Metadata"])
def get_supported_formats():
    return SupportedFormatsResponse(
        images=sorted(list(settings.SUPPORTED_IMAGE_EXTENSIONS)),
        documents=sorted(list(settings.SUPPORTED_DOC_EXTENSIONS)),
        planned_formats=sorted(list(settings.FUTURE_EXTENSIONS)),
        supported_operations=[
            "reduce_file_size",
            "increase_file_size",
            "resize_dimensions",
            "adjust_quality",
            "pdf_compression",
            "format_conversion",
            "target_exact_size",
            "target_maximum_size",
            "target_size_range"
        ]
    )

@router.post("/analyze", response_model=FileAnalysisResult, tags=["Analysis"])
async def analyze_uploaded_file(file: UploadFile = File(...)):
    safe_name = sanitize_filename(file.filename)
    unique_id = uuid.uuid4().hex
    temp_input = settings.TEMP_DIR / f"upload_{unique_id}_{safe_name}"

    try:
        with open(temp_input, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        validate_file_size(temp_input.stat().st_size)
        result = analyze_file(temp_input, safe_name)
        return result
    finally:
        cleanup_file(temp_input)

@router.post("/process", tags=["Processing"])
async def process_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    target_size: Optional[str] = Form(None),
    target_value: Optional[float] = Form(None),
    target_unit: Optional[str] = Form(None),
    target_mode: str = Form("maximum"),
    min_size: Optional[str] = Form(None),
    max_size: Optional[str] = Form(None),
    output_format: Optional[str] = Form(None),
    quality: Optional[int] = Form(None),
    width: Optional[int] = Form(None),
    height: Optional[int] = Form(None),
    maintain_aspect_ratio: bool = Form(True),
    remove_metadata: bool = Form(True),
    progressive: bool = Form(True),
    pdf_compression_level: Optional[str] = Form("balanced"),
    pdf_optimize_images: bool = Form(True),
    pdf_downsample_dpi: Optional[int] = Form(None),
    pdf_preserve_text: bool = Form(True),
    pdf_image_mode: Optional[str] = Form("separate"),
    response_mode: Literal["file", "json"] = Form("json")
):
    safe_name = sanitize_filename(file.filename)
    unique_id = uuid.uuid4().hex
    temp_input = settings.TEMP_DIR / f"in_{unique_id}_{safe_name}"
    
    orig_ext = Path(safe_name).suffix.lower().lstrip(".")
    out_ext = output_format.lower().lstrip(".") if output_format and output_format != "original" else orig_ext
    temp_output = settings.TEMP_DIR / f"out_{unique_id}_{Path(safe_name).stem}.{out_ext}"

    try:
        with open(temp_input, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        validate_file_size(temp_input.stat().st_size)
        analysis = analyze_file(temp_input, safe_name)

        options = ProcessRequestOptions(
            target_size=target_size,
            target_value=target_value,
            target_unit=target_unit,
            target_mode=target_mode,
            min_size=min_size,
            max_size=max_size,
            output_format=output_format,
            quality=quality,
            width=width,
            height=height,
            maintain_aspect_ratio=maintain_aspect_ratio,
            remove_metadata=remove_metadata,
            progressive=progressive,
            pdf_compression_level=pdf_compression_level,
            pdf_optimize_images=pdf_optimize_images,
            pdf_downsample_dpi=pdf_downsample_dpi,
            pdf_preserve_text=pdf_preserve_text,
            pdf_image_mode=pdf_image_mode
        )

        result = optimizer_service.optimize(
            input_path=temp_input,
            output_path=temp_output,
            analysis=analysis,
            options=options
        )
        
        actual_output_name = result.output_filename or temp_output.name
        actual_output = settings.TEMP_DIR / actual_output_name
        result.output_file_id = actual_output_name

        if response_mode == "file":
            background_tasks.add_task(cleanup_file, temp_input)
            background_tasks.add_task(cleanup_file, actual_output)
            background_tasks.add_task(prune_old_temp_files)
            
            headers = {
                "X-Processing-Result": json.dumps(result.model_dump())
            }
            media_type, _ = mimetypes.guess_type(str(actual_output))
            dl_ext = Path(actual_output_name).suffix.lstrip(".")
            return FileResponse(
                path=actual_output,
                filename=f"optimized_{safe_name.rsplit('.', 1)[0]}.{dl_ext}",
                media_type=media_type or "application/octet-stream",
                headers=headers
            )
        else:
            background_tasks.add_task(cleanup_file, temp_input)
            background_tasks.add_task(prune_old_temp_files)
            return result
    except Exception:
        cleanup_file(temp_input)
        cleanup_file(temp_output)
        raise

@router.get("/download/{file_id}", tags=["Processing"])
async def download_processed_file(file_id: str, background_tasks: BackgroundTasks):
    safe_id = sanitize_filename(file_id)
    file_path = settings.TEMP_DIR / safe_id

    if not file_path.exists():
        raise AppError("FILE_NOT_FOUND", "The requested processed file was not found or has expired.", status.HTTP_404_NOT_FOUND)

    media_type, _ = mimetypes.guess_type(str(file_path))
    if not media_type:
        media_type = "application/octet-stream"

    parts = safe_id.split("_", 2)
    if len(parts) >= 3 and parts[0] == "out" and len(parts[1]) == 32:
        download_name = f"optimized_{parts[2]}"
    else:
        download_name = safe_id

    return FileResponse(
        path=file_path,
        filename=download_name,
        media_type=media_type
    )
