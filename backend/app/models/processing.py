from typing import Optional, Literal
from pydantic import BaseModel, Field

TargetUnit = Literal["B", "bytes", "KB", "MB", "GB"]
TargetMode = Literal["maximum", "exact", "range"]

class TargetSizeConfig(BaseModel):
    target_bytes: int
    target_human: str
    mode: TargetMode = "maximum"
    min_bytes: Optional[int] = None
    max_bytes: Optional[int] = None
    tolerance_pct: float = 0.02

class ProcessRequestOptions(BaseModel):
    target_size: Optional[str] = None
    target_value: Optional[float] = None
    target_unit: Optional[TargetUnit] = None
    target_mode: TargetMode = "maximum"
    min_size: Optional[str] = None
    max_size: Optional[str] = None
    
    output_format: Optional[str] = None
    quality: Optional[int] = Field(default=None, ge=1, le=100)
    width: Optional[int] = Field(default=None, ge=1)
    height: Optional[int] = Field(default=None, ge=1)
    maintain_aspect_ratio: bool = True
    remove_metadata: bool = True
    progressive: bool = True
    
    pdf_compression_level: Optional[Literal["low", "balanced", "maximum"]] = "balanced"
    pdf_optimize_images: bool = True
    pdf_downsample_dpi: Optional[int] = None
    pdf_preserve_text: bool = True
    pdf_image_mode: Optional[Literal["separate", "stitch", "first_page"]] = "separate"

class ProcessResult(BaseModel):
    success: bool
    original_filename: str
    output_filename: str
    original_size: int
    original_size_human: str
    output_size: int
    output_size_human: str
    target_size: Optional[int] = None
    target_size_human: Optional[str] = None
    target_reached: bool
    compression_ratio: float
    saved_bytes: int
    saved_bytes_human: str
    format: str
    
    mode: str
    closest_size: Optional[int] = None
    difference_bytes: Optional[int] = None
    reason: Optional[str] = None
    
    quality: Optional[int] = None
    width: Optional[int] = None
    height: Optional[int] = None
    original_width: Optional[int] = None
    original_height: Optional[int] = None
    
    pages: Optional[int] = None
    images_optimized: Optional[int] = None
    
    output_file_id: Optional[str] = None
    error_code: Optional[str] = None
    message: Optional[str] = None
