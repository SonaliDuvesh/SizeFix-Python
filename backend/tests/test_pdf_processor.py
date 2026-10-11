from pathlib import Path
import fitz
from app.services.analyzer import analyze_file
from app.processors.pdf_processor import PDFProcessor
from app.models.processing import ProcessRequestOptions

def test_pdf_structure_and_image_compression(sample_pdf_path: Path, tmp_path: Path):
    processor = PDFProcessor()
    out_path = tmp_path / "out_optimized.pdf"
    analysis = analyze_file(sample_pdf_path, "test_document.pdf")

    options = ProcessRequestOptions(
        pdf_compression_level="maximum",
        pdf_optimize_images=True,
        remove_metadata=True
    )

    result = processor.process(sample_pdf_path, out_path, analysis, options)
    assert result.success is True
    assert result.format == "pdf"
    assert out_path.exists()
    assert result.pages == 2

    with fitz.open(out_path) as doc:
        assert len(doc) == 2
        text_p1 = doc[0].get_text()
        assert "Official Application Document" in text_p1
        assert "searchable text must remain intact" in text_p1

def test_pdf_target_size_mode(sample_pdf_path: Path, tmp_path: Path):
    processor = PDFProcessor()
    out_path = tmp_path / "out_target.pdf"
    analysis = analyze_file(sample_pdf_path, "test_document.pdf")

    options = ProcessRequestOptions(
        target_size="25 KB",
        target_mode="maximum"
    )

    result = processor.process(sample_pdf_path, out_path, analysis, options)
    assert result.success is True
    assert result.format == "pdf"
    assert out_path.exists()
    assert out_path.stat().st_size <= 25 * 1024
    assert result.target_reached is True

def test_pdf_to_jpg_separate_all_pages(sample_pdf_path: Path, tmp_path: Path):
    import zipfile
    processor = PDFProcessor()
    out_path = tmp_path / "out_pdf_render.jpg"
    analysis = analyze_file(sample_pdf_path, "test_document.pdf")

    options = ProcessRequestOptions(
        output_format="jpg",
        pdf_image_mode="separate"
    )

    result = processor.process(sample_pdf_path, out_path, analysis, options)
    assert result.success is True
    assert result.format == "zip"
    assert result.pages == 2
    assert result.output_filename.endswith(".zip")
    
    zip_path = tmp_path / result.output_filename
    assert zip_path.exists()
    with zipfile.ZipFile(zip_path, "r") as zf:
        namelist = zf.namelist()
        assert len(namelist) == 2
        assert "page_01.jpg" in namelist
        assert "page_02.jpg" in namelist

def test_pdf_to_jpg_stitch(sample_pdf_path: Path, tmp_path: Path):
    from PIL import Image
    processor = PDFProcessor()
    out_path = tmp_path / "out_stitched.jpg"
    analysis = analyze_file(sample_pdf_path, "test_document.pdf")

    options = ProcessRequestOptions(
        output_format="jpg",
        pdf_image_mode="stitch"
    )

    result = processor.process(sample_pdf_path, out_path, analysis, options)
    assert result.success is True
    assert result.format == "jpg"
    assert out_path.exists()
    with Image.open(out_path) as img:
        assert img.format == "JPEG"
        # Stitched image should have combined height of both pages
        assert img.height > 1000

def test_pdf_to_jpg_first_page(sample_pdf_path: Path, tmp_path: Path):
    from PIL import Image
    processor = PDFProcessor()
    out_path = tmp_path / "out_first_page.jpg"
    analysis = analyze_file(sample_pdf_path, "test_document.pdf")

    options = ProcessRequestOptions(
        output_format="jpg",
        pdf_image_mode="first_page"
    )

    result = processor.process(sample_pdf_path, out_path, analysis, options)
    assert result.success is True
    assert result.format == "jpg"
    assert out_path.exists()
    with Image.open(out_path) as img:
        assert img.format == "JPEG"

