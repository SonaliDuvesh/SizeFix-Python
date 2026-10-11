import io
import pytest
from pathlib import Path
from PIL import Image, ImageDraw
import fitz
from fastapi.testclient import TestClient

from app.main import app

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def sample_jpeg_path(tmp_path: Path) -> Path:
    img_path = tmp_path / "test_photo.jpg"
    img = Image.new("RGB", (1200, 800), color=(240, 100, 120))
    draw = ImageDraw.Draw(img)
    for i in range(0, 800, 20):
        draw.line([(0, i), (1200, 800 - i)], fill=(i % 255, (i * 2) % 255, (i * 3) % 255), width=3)
    img.save(img_path, format="JPEG", quality=95)
    return img_path

@pytest.fixture
def sample_png_path(tmp_path: Path) -> Path:
    img_path = tmp_path / "test_graphic.png"
    img = Image.new("RGBA", (800, 600), color=(255, 200, 220, 180))
    draw = ImageDraw.Draw(img)
    draw.rectangle([50, 50, 400, 300], fill=(200, 50, 90, 255), outline=(100, 20, 40, 255))
    img.save(img_path, format="PNG")
    return img_path

@pytest.fixture
def sample_webp_path(tmp_path: Path) -> Path:
    img_path = tmp_path / "test_image.webp"
    img = Image.new("RGB", (600, 400), color=(180, 220, 255))
    img.save(img_path, format="WEBP", quality=90)
    return img_path

@pytest.fixture
def sample_bmp_path(tmp_path: Path) -> Path:
    img_path = tmp_path / "test_image.bmp"
    img = Image.new("RGB", (400, 400), color=(100, 150, 200))
    img.save(img_path, format="BMP")
    return img_path

@pytest.fixture
def sample_animated_gif_path(tmp_path: Path) -> Path:
    gif_path = tmp_path / "test_animation.gif"
    frames = []
    for i in range(5):
        frame = Image.new("RGBA", (120, 120), (0, 0, 0, 0))
        draw = ImageDraw.Draw(frame)
        draw.ellipse([10 + i * 15, 20, 40 + i * 15, 50], fill=(220, 60, 100 + i * 30, 255))
        frames.append(frame)
    frames[0].save(
        gif_path,
        format="GIF",
        save_all=True,
        append_images=frames[1:],
        duration=150,
        loop=0,
        optimize=True
    )
    return gif_path

@pytest.fixture
def sample_pdf_path(tmp_path: Path) -> Path:
    pdf_path = tmp_path / "test_document.pdf"
    doc = fitz.open()
    
    page1 = doc.new_page()
    page1.insert_text((50, 72), "Official Application Document", fontsize=18)
    page1.insert_text((50, 110), "This searchable text must remain intact after compression.", fontsize=11)
    
    img_buf = io.BytesIO()
    img = Image.new("RGB", (600, 400), color=(220, 80, 100))
    draw = ImageDraw.Draw(img)
    draw.text((30, 30), "Embedded Raster Image", fill=(255, 255, 255))
    img.save(img_buf, format="JPEG", quality=95)
    
    rect = fitz.Rect(50, 140, 350, 340)
    page1.insert_image(rect, stream=img_buf.getvalue())
    
    page2 = doc.new_page()
    page2.insert_text((50, 72), "Page 2: Secondary Metadata and Tables", fontsize=14)
    page2.insert_text((50, 100), "Preserved document integrity test.", fontsize=10)
    
    doc.set_metadata({
        "title": "Test Invoice Document",
        "author": "Antigravity Engineering",
        "subject": "Optimization Benchmark"
    })
    
    doc.save(str(pdf_path))
    doc.close()
    return pdf_path

@pytest.fixture
def sample_corrupted_path(tmp_path: Path) -> Path:
    corrupted_path = tmp_path / "corrupted.jpg"
    corrupted_path.write_bytes(b"NOT_A_VALID_JPEG_IMAGE_DATA_CORRUPTED_STREAM_12345")
    return corrupted_path

@pytest.fixture
def sample_unsupported_path(tmp_path: Path) -> Path:
    unsupported_path = tmp_path / "archive.xyz"
    unsupported_path.write_bytes(b"DUMMY_UNKNOWN_BINARY_FORMAT")
    return unsupported_path
