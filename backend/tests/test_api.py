from pathlib import Path
from fastapi.testclient import TestClient

def test_health_endpoint(client: TestClient):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_supported_formats_endpoint(client: TestClient):
    response = client.get("/supported-formats")
    assert response.status_code == 200
    data = response.json()
    assert "jpg" in data["images"]
    assert "heic" in data["images"]
    assert "pdf" in data["documents"]
    assert "docx" in data["documents"]

def test_analyze_endpoint(client: TestClient, sample_jpeg_path: Path):
    with open(sample_jpeg_path, "rb") as f:
        response = client.post(
            "/analyze",
            files={"file": ("photo.jpg", f, "image/jpeg")}
        )
    assert response.status_code == 200
    data = response.json()
    assert data["category"] == "image"
    assert data["dimensions"]["width"] == 1200
    assert data["dimensions"]["height"] == 800

def test_image_to_pdf_conversion(client: TestClient, sample_jpeg_path: Path):
    with open(sample_jpeg_path, "rb") as f:
        response = client.post(
            "/process",
            files={"file": ("photo.jpg", f, "image/jpeg")},
            data={"output_format": "pdf", "response_mode": "json"}
        )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["format"] == "pdf"

def test_pdf_to_image_conversion(client: TestClient, sample_pdf_path: Path):
    # Multi-page PDF exports all pages as a zip by default
    with open(sample_pdf_path, "rb") as f:
        response = client.post(
            "/process",
            files={"file": ("doc.pdf", f, "application/pdf")},
            data={"output_format": "jpg", "response_mode": "json"}
        )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["format"] == "zip"
    assert data["pages"] == 2
    assert "page_01.jpg" in str(data.get("output_filename", "")) or data["output_filename"].endswith(".zip")

    # If first_page mode is requested, returns single jpg
    with open(sample_pdf_path, "rb") as f:
        response_first = client.post(
            "/process",
            files={"file": ("doc.pdf", f, "application/pdf")},
            data={"output_format": "jpg", "pdf_image_mode": "first_page", "response_mode": "json"}
        )
    assert response_first.status_code == 200
    data_first = response_first.json()
    assert data_first["success"] is True
    assert data_first["format"] == "jpg"

def test_pdf_to_txt_conversion(client: TestClient, sample_pdf_path: Path):
    with open(sample_pdf_path, "rb") as f:
        response = client.post(
            "/process",
            files={"file": ("doc.pdf", f, "application/pdf")},
            data={"output_format": "txt", "response_mode": "json"}
        )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["format"] == "txt"

def test_process_endpoint_json_mode(client: TestClient, sample_jpeg_path: Path):
    with open(sample_jpeg_path, "rb") as f:
        response = client.post(
            "/process",
            files={"file": ("photo.jpg", f, "image/jpeg")},
            data={
                "target_size": "80 KB",
                "target_mode": "maximum",
                "response_mode": "json"
            }
        )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["output_size"] > 0
    assert data["output_file_id"] is not None

    dl_response = client.get(f"/download/{data['output_file_id']}")
    assert dl_response.status_code == 200
    assert len(dl_response.content) == data["output_size"]

def test_process_endpoint_file_mode(client: TestClient, sample_jpeg_path: Path):
    with open(sample_jpeg_path, "rb") as f:
        response = client.post(
            "/process",
            files={"file": ("photo.jpg", f, "image/jpeg")},
            data={
                "output_format": "webp",
                "quality": 75,
                "response_mode": "file"
            }
        )
    assert response.status_code == 200
    assert response.headers.get("x-processing-result") is not None
    assert len(response.content) > 0

def test_error_corrupted_file(client: TestClient, sample_corrupted_path: Path):
    with open(sample_corrupted_path, "rb") as f:
        response = client.post(
            "/analyze",
            files={"file": ("bad.jpg", f, "image/jpeg")}
        )
    assert response.status_code == 400
    data = response.json()
    assert data["success"] is False
    assert data["error_code"] == "CORRUPTED_FILE"

def test_error_invalid_target_size(client: TestClient, sample_jpeg_path: Path):
    with open(sample_jpeg_path, "rb") as f:
        response = client.post(
            "/process",
            files={"file": ("photo.jpg", f, "image/jpeg")},
            data={"target_size": "-500 KB"}
        )
    assert response.status_code == 400
    data = response.json()
    assert data["success"] is False
    assert data["error_code"] == "INVALID_TARGET_SIZE"
