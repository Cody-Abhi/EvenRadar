"""
Pydantic V2 Data Models for EventRadar FastAPI Application.
Follows modern FastAPI Pro and OpenAPI 3.1 standards with strict type checking,
field constraints, and realistic documentation examples.
"""

from typing import List, Optional, Any, Dict
from enum import Enum
from pydantic import BaseModel, Field, HttpUrl


class ModeEnum(str, Enum):
    online = "online"
    offline = "offline"
    hybrid = "hybrid"


class EventTypeEnum(str, Enum):
    hackathon = "hackathon"
    meetup = "meetup"
    conference = "conference"
    workshop = "workshop"
    other = "other"


class ExperienceLevelEnum(str, Enum):
    student = "student"
    junior = "junior"
    mid = "mid"
    senior = "senior"


class SearchQuery(BaseModel):
    topic: str = Field(
        ...,
        min_length=1,
        max_length=200,
        description="Search topic or keywords (e.g. 'AI hackathon', 'Web3', 'React')",
        examples=["AI hackathon"],
    )
    location: str = Field(
        default="India",
        max_length=100,
        description="Target city or country for in-person events",
        examples=["Bangalore"],
    )
    online: bool = Field(
        default=False,
        description="If True, filters exclusively for online and hybrid events",
        examples=[False],
    )


class EventItem(BaseModel):
    name: str = Field(..., description="Event title", examples=["Bangalore AI Hackfest 2026"])
    start_date: Optional[str] = Field(
        default=None,
        description="ISO start date YYYY-MM-DD",
        examples=["2026-11-15"],
    )
    end_date: Optional[str] = Field(
        default=None,
        description="ISO end date YYYY-MM-DD",
        examples=["2026-11-17"],
    )
    date_text: str = Field(
        ...,
        description="Raw date string verbatim from source page",
        examples=["Nov 15-17, 2026"],
    )
    mode: Optional[ModeEnum] = Field(
        default=None,
        description="Delivery mode: online, offline, or hybrid",
        examples=[ModeEnum.hybrid],
    )
    venue_or_city: Optional[str] = Field(
        default=None,
        description="Physical location or city",
        examples=["Bangalore, India"],
    )
    event_type: EventTypeEnum = Field(
        default=EventTypeEnum.other,
        description="Type of event",
        examples=[EventTypeEnum.hackathon],
    )
    themes: List[str] = Field(
        default_factory=list,
        description="Identified topics, tracks, and themes",
        examples=[["Artificial Intelligence", "LLMs", "Python"]],
    )
    eligibility: Optional[str] = Field(
        default=None,
        description="Eligibility constraints",
        examples=["Open to developers and students"],
    )
    registration_url: Optional[str] = Field(
        default=None,
        description="Direct link to event registration",
        examples=["https://devfolio.co/hackathons/example"],
    )
    source_url: str = Field(
        ...,
        description="Canonical URL where the event was discovered",
        examples=["https://devfolio.co"],
    )
    source_name: str = Field(
        ...,
        description="Source platform or domain name",
        examples=["Devfolio"],
    )
    fields_missing: List[str] = Field(
        default_factory=list,
        description="List of optional fields absent in the source document",
        examples=[[]],
    )
    fetched_at: str = Field(
        ...,
        description="ISO timestamp when the source was scraped",
        examples=["2026-10-25T12:00:00.000Z"],
    )


class SourceStatus(BaseModel):
    name: str = Field(..., description="Platform or source name", examples=["Devfolio"])
    url: str = Field(..., description="Source URL", examples=["https://devfolio.co/hackathons"])
    ok: bool = Field(..., description="Whether fetch and extraction succeeded", examples=[True])
    count: int = Field(..., ge=0, description="Number of events extracted", examples=[7])
    error: Optional[str] = Field(default=None, description="Error message if failed", examples=[None])


class EventsApiResponse(BaseModel):
    query: SearchQuery
    events: List[EventItem]
    sources: List[SourceStatus]
    errors: List[str] = Field(default_factory=list)
    tookMs: int = Field(..., ge=0, description="Pipeline runtime in milliseconds", examples=[8421])


class BestSearchQuery(BaseModel):
    topic: str = Field(..., description="Optimal search topic keyword", examples=["AI Hackathon"])
    location: str = Field(..., description="Detected candidate city/region", examples=["Bangalore"])


class CvProfile(BaseModel):
    candidate_name: Optional[str] = Field(
        default=None,
        description="Extracted candidate name",
        examples=["Abhishek Srivastava"],
    )
    primary_role: str = Field(
        ...,
        description="Candidate's primary technical specialization",
        examples=["Fullstack AI Engineer"],
    )
    experience_level: ExperienceLevelEnum = Field(
        ...,
        description="Experience level: student, junior, mid, senior",
        examples=[ExperienceLevelEnum.mid],
    )
    top_skills: List[str] = Field(
        ...,
        min_length=1,
        description="Top extracted programming languages, frameworks, and tools",
        examples=[["Python", "TypeScript", "React", "Next.js", "PyTorch"]],
    )
    recommended_topics: List[str] = Field(
        ...,
        description="Recommended event tracks to pursue",
        examples=[["AI & Generative AI", "Fullstack Web", "Cloud Architecture"]],
    )
    best_search_query: BestSearchQuery
    match_keywords: List[str] = Field(
        ...,
        description="10-15 keywords to match against event listings",
        examples=[["ai", "python", "fullstack", "react", "llm", "rag", "pytorch"]],
    )
    summary: str = Field(
        ...,
        description="Crisp background summary and event recommendation rationale",
        examples=["Experienced fullstack engineer specializing in AI and cloud applications."],
    )


class CvMatchRequest(BaseModel):
    text: str = Field(
        ...,
        min_length=10,
        max_length=50000,
        description="Plain text content of candidate resume or CV",
        examples=[
            "Abhishek Srivastava\nFullstack AI Developer | Python, React, Next.js, PyTorch | Bangalore\nBuilt interactive geospatial dashboard with Mapbox GL and real-time LLM agents."
        ],
    )


class CvMatchResponse(BaseModel):
    success: bool = Field(default=True, examples=[True])
    profile: CvProfile


class ScrapeRequest(BaseModel):
    urls: List[str] = Field(
        ...,
        min_length=1,
        max_length=20,
        description="List of target HTTP/HTTPS URLs to scrape",
        examples=[["https://mlh.io/events", "https://devfolio.co/hackathons"]],
    )


class ScrapePage(BaseModel):
    url: str
    title: Optional[str] = ""
    text: str
    links: List[str] = Field(default_factory=list)


class ScrapeResponse(BaseModel):
    pages: List[ScrapePage]
    errors: List[Dict[str, str]] = Field(default_factory=list)


class ErrorResponse(BaseModel):
    error: str = Field(..., description="Error summary message", examples=["Missing required parameter"])
    code: str = Field(..., description="Machine-readable error code", examples=["INVALID_ARGUMENT"])
    details: Optional[Any] = Field(default=None, description="Extended error debug details")


class HealthResponse(BaseModel):
    status: str = Field(default="ok", examples=["ok"])
    service: str = Field(default="eventradar-fastapi", examples=["eventradar-fastapi"])
    version: str = Field(default="1.0.0", examples=["1.0.0"])
    environment: str = Field(default="production", examples=["production"])
    dependencies: Dict[str, str] = Field(
        default_factory=lambda: {
            "crawl4ai": "operational",
            "gemini": "operational",
            "pydantic": "v2",
        }
    )
