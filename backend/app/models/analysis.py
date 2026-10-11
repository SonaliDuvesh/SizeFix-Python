from typing import Optional, Any
from pydantic import BaseModel, Field

class ImageDimensions(BaseModel):
    width: int
    height: int

class FileAnalysisResult(BaseModel):
    filename: str
    extension: str
    mime_type: str
    size_bytes: int
    size_human: str
    category: str
    is_supported: bool
    dimensions: Optional[ImageDimensions] = None
    color_mode: Optional[str] = None
    has_alpha: Optional[bool] = None
    is_animated: Optional[bool] = None
    frame_count: Optional[int] = None
    pdf_pages: Optional[int] = None
    pdf_metadata: Optional[dict[str, Any]] = None
    supported_operations: list[str] = Field(default_factory=list)
    recommendations: Optional[dict[str, Any]] = None

class SupportedFormatsResponse(BaseModel):
    images: list[str]
    documents: list[str]
    planned_formats: list[str]
    supported_operations: list[str]
