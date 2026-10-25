"""
Test Suite for EventRadar FastAPI Application.
Validates API contracts, Pydantic V2 schemas, status codes,
OpenAPI 3.1 generation, and observability headers using TestClient.
"""

import pytest
from fastapi.testclient import TestClient
from fastapi_app.main import app

client = TestClient(app)


def test_health_check():
    """Verify system health check endpoint and dependency status."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "eventradar-fastapi"
    assert data["version"] == "1.0.0"
    assert data["dependencies"]["pydantic"] == "v2"
    assert data["dependencies"]["crawl4ai"] == "operational"


def test_openapi_spec_generation():
    """Verify OpenAPI 3.1 JSON specification generation."""
    response = client.get("/openapi.json")
    assert response.status_code == 200
    spec = response.json()
    assert spec["openapi"].startswith("3.1")
    assert spec["info"]["title"] == "EventRadar API (FastAPI Pro)"
    assert "/api/events" in spec["paths"]
    assert "/api/cv-match" in spec["paths"]
    assert "/api/scrape" in spec["paths"]
    assert "/health" in spec["paths"]


def test_events_search_valid():
    """Verify GET /api/events with valid parameters returns 200 and schema."""
    response = client.get("/api/events?topic=AI%20hackathon&location=Bangalore&online=false")
    assert response.status_code == 200
    data = response.json()
    assert data["query"]["topic"] == "AI hackathon"
    assert data["query"]["location"] == "Bangalore"
    assert data["query"]["online"] is False
    assert isinstance(data["events"], list)
    assert len(data["events"]) > 0
    assert isinstance(data["sources"], list)
    assert data["tookMs"] >= 0

    # Validate EventItem structure
    event = data["events"][0]
    assert "name" in event
    assert "date_text" in event
    assert "source_url" in event
    assert "source_name" in event


def test_events_search_missing_topic():
    """Verify GET /api/events without required 'topic' returns 422."""
    response = client.get("/api/events")
    assert response.status_code == 422
    data = response.json()
    assert data["code"] == "UNPROCESSABLE_ENTITY"
    assert "details" in data


def test_cv_match_valid():
    """Verify POST /api/cv-match parses resume text into structured profile."""
    payload = {
        "text": (
            "Abhishek Srivastava\n"
            "Fullstack AI Engineer | Python, React, Next.js, PyTorch | Bangalore\n"
            "Built interactive geospatial dashboard with Mapbox GL and real-time LLM agents."
        )
    }
    response = client.post("/api/cv-match", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "profile" in data
    profile = data["profile"]
    assert "Abhishek" in profile["candidate_name"]
    assert "AI" in profile["primary_role"] or "Engineer" in profile["primary_role"]
    assert isinstance(profile["top_skills"], list)
    assert len(profile["top_skills"]) > 0
    assert profile["best_search_query"]["location"] == "Bangalore"


def test_cv_match_invalid_short_text():
    """Verify POST /api/cv-match rejects texts below minimum length with 422."""
    response = client.post("/api/cv-match", json={"text": "short"})
    assert response.status_code == 422
    data = response.json()
    assert data["code"] == "UNPROCESSABLE_ENTITY"


def test_scrape_endpoint_structure():
    """Verify POST /api/scrape accepts URLs and returns structured crawl responses."""
    payload = {"urls": ["https://mlh.io/events"]}
    response = client.post("/api/scrape", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "pages" in data
    assert isinstance(data["pages"], list)
    assert len(data["pages"]) > 0
    assert "url" in data["pages"][0]
    assert "text" in data["pages"][0]


def test_observability_middleware_headers():
    """Verify custom observability middleware attaches timing and request ID headers."""
    response = client.get("/health", headers={"X-Request-ID": "test-req-12345"})
    assert response.status_code == 200
    assert "x-process-time" in response.headers
    assert response.headers.get("x-request-id") == "test-req-12345"


def test_cors_headers():
    """Verify CORS middleware permits cross-origin requests."""
    response = client.options(
        "/api/events",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") in ["*", "http://localhost:3000"]
