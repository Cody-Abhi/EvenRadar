"use client";

import { useState, useRef, type ChangeEvent, type DragEvent } from "react";
import type { CvProfile } from "@/lib/cv_match";
import type { SearchQuery } from "@/lib/types";

interface CvUploadCardProps {
  onCvProfileLoaded: (profile: CvProfile) => void;
  onSearchWithCv: (query: SearchQuery) => void;
  activeProfile: CvProfile | null;
  onClearProfile: () => void;
  isSearchingEvents?: boolean;
}

const SAMPLE_RESUME_TEXT = `Abhishek Srivastava
Software Engineer & AI Specialist
Bangalore, Karnataka, India | abhishek@example.dev

PROFESSIONAL SUMMARY:
Fullstack developer with 3+ years experience building web applications and AI-driven microservices. Passionate about participating in open-source hackathons, AI builder summits, and tech meetups.

CORE SKILLS:
- Languages: Python, TypeScript, JavaScript, SQL, Go
- Web Frameworks: React, Next.js (App Router), Tailwind CSS, Node.js, Express, FastAPI
- AI & ML: LangChain, Retrieval Augmented Generation (RAG), OpenAI API, HuggingFace, PyTorch
- Tools & Cloud: Docker, Git, PostgreSQL, Mapbox GL, Redis, AWS

EXPERIENCE & PROJECTS:
- Fullstack AI Engineer at BuildAI Tech (2023 - Present)
  * Architected autonomous LLM agents and multi-source web scrapers.
  * Integrated interactive Mapbox dashboards with real-time geospatial filtering.
- Hackathon Winner - Bangalore TechFest 2024
  * Built real-time developer collaboration tool using WebSockets and Next.js.
  * Won 2nd Runner Up out of 120 teams.

EDUCATION:
B.Tech in Computer Science & Engineering (2020 - 2024)`;

export default function CvUploadCard({
  onCvProfileLoaded,
  onSearchWithCv,
  activeProfile,
  onClearProfile,
  isSearchingEvents = false,
}: CvUploadCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"file" | "text">("file");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setError(null);
    }
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const validTypes = [
        "application/pdf",
        "text/plain",
        "text/markdown",
      ];
      if (
        validTypes.includes(file.type) ||
        file.name.endsWith(".pdf") ||
        file.name.endsWith(".txt") ||
        file.name.endsWith(".md")
      ) {
        setSelectedFile(file);
        setError(null);
      } else {
        setError("Please upload a PDF (.pdf) or text document (.txt, .md).");
      }
    }
  }

  async function handleAnalyze() {
    setError(null);
    if (mode === "file" && !selectedFile) {
      setError("Please select or drop a CV file first.");
      return;
    }
    if (mode === "text" && !pastedText.trim()) {
      setError("Please paste your resume or LinkedIn text.");
      return;
    }

    setAnalyzing(true);
    try {
      let res: Response;
      if (mode === "file" && selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        res = await fetch("/api/cv-match", {
          method: "POST",
          body: formData,
        });
      } else {
        res = await fetch("/api/cv-match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: pastedText }),
        });
      }

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || `Analysis failed (${res.status})`);
      }

      onCvProfileLoaded(json.profile);
      setIsOpen(true); // Keep open to show results
    } catch (err: any) {
      setError(err?.message || "Failed to analyze CV. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  }

  function loadSampleResume() {
    setMode("text");
    setPastedText(SAMPLE_RESUME_TEXT);
    setError(null);
  }

  return (
    <div className="brutal mb-6 border-[3px] border-black bg-white shadow-[6px_6px_0_0_#000]">
      {/* Banner Header with Collapsible Trigger */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-[3px] border-black bg-brut-yellow p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-black bg-white text-xl shadow-[2px_2px_0_0_#000]">
            🎯
          </span>
          <div>
            <h2 className="display text-lg uppercase leading-none sm:text-xl">
              Match Events to Your CV / Resume
            </h2>
            <p className="mt-1 text-xs font-semibold text-black/80">
              Upload your CV to auto-discover hackathons, conferences &amp; meetups matching your exact skills.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeProfile && (
            <span className="brutal-sm bg-brut-lime px-2.5 py-1 text-xs font-bold uppercase">
              ✓ CV Active: {activeProfile.candidate_name || "Candidate"}
            </span>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="brutal-press bg-white px-3 py-1.5 text-xs font-bold uppercase"
          >
            {isOpen ? "▲ Collapse" : activeProfile ? "▼ View CV Profile" : "▼ Upload & Match CV"}
          </button>
        </div>
      </div>

      {/* Expanded Content Drawer */}
      {isOpen && (
        <div className="p-4 sm:p-6">
          {!activeProfile ? (
            /* Upload / Paste View */
            <div className="space-y-4">
              {/* Tab Selector */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-black pb-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMode("file");
                      setError(null);
                    }}
                    className={`brutal-press px-3 py-1.5 text-xs font-bold uppercase ${
                      mode === "file" ? "bg-black text-white" : "bg-paper"
                    }`}
                  >
                    📁 Upload PDF / TXT
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("text");
                      setError(null);
                    }}
                    className={`brutal-press px-3 py-1.5 text-xs font-bold uppercase ${
                      mode === "text" ? "bg-black text-white" : "bg-paper"
                    }`}
                  >
                    ✍ Paste Text
                  </button>
                </div>

                <button
                  type="button"
                  onClick={loadSampleResume}
                  className="brutal-sm bg-brut-cyan px-2.5 py-1 text-xs font-bold uppercase transition hover:bg-cyan-300"
                  title="Test feature immediately with a sample AI developer resume"
                >
                  ⚡ Try Demo AI Engineer CV
                </button>
              </div>

              {/* Mode: File Upload */}
              {mode === "file" && (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`cursor-pointer border-3 border-dashed p-6 text-center transition-all ${
                    isDragging
                      ? "border-black bg-yellow-100 scale-[0.99]"
                      : selectedFile
                      ? "border-black bg-lime-50"
                      : "border-black/50 bg-paper hover:border-black hover:bg-yellow-50"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.txt,.md,text/plain,application/pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center border-2 border-black bg-brut-orange text-2xl shadow-[2px_2px_0_0_#000]">
                    📄
                  </div>
                  {selectedFile ? (
                    <div>
                      <p className="text-sm font-bold text-black">
                        Selected: <span className="underline">{selectedFile.name}</span>
                      </p>
                      <p className="mt-1 text-xs text-black/60 font-semibold">
                        {(selectedFile.size / 1024).toFixed(1)} KB · Click or drag to replace
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-bold text-black">
                        Drag and drop your CV here, or{" "}
                        <span className="bg-brut-yellow px-1 underline">browse files</span>
                      </p>
                      <p className="mt-1 text-xs text-black/60 font-semibold">
                        Supports PDF (.pdf) and plain text (.txt, .md) documents
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Mode: Paste Text */}
              {mode === "text" && (
                <div>
                  <textarea
                    rows={6}
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="Paste your resume, skills summary, or LinkedIn experience here..."
                    className="brutal-sm w-full border-[2px] border-black p-3 font-mono text-xs outline-none focus:ring-2 focus:ring-black"
                  />
                  <div className="mt-1 flex justify-between text-[11px] font-semibold text-black/60">
                    <span>Includes languages, frameworks, target roles, or hackathon history.</span>
                    <span>{pastedText.length} characters</span>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="brutal-sm bg-brut-red p-2.5 text-xs font-bold text-white">
                  ⚠ {error}
                </div>
              )}

              {/* Action Button */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <span className="text-xs font-semibold text-black/70">
                  ⚡ Gemini extracts your core skills and generates match scores for every live event.
                </span>
                <button
                  type="button"
                  disabled={analyzing}
                  onClick={handleAnalyze}
                  className="brutal-press flex items-center gap-2 bg-brut-lime px-5 py-2.5 text-xs font-bold uppercase disabled:opacity-60"
                >
                  {analyzing ? (
                    <>
                      <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-black border-t-transparent" />
                      Analyzing CV with AI...
                    </>
                  ) : (
                    "🚀 Analyze CV & Find Suitable Events"
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Active Candidate Profile Card */
            <div className="space-y-4">
              {/* Profile summary header */}
              <div className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-black pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="display text-xl uppercase">
                      {activeProfile.candidate_name || "Candidate Profile"}
                    </h3>
                    <span className="border-2 border-black bg-brut-purple px-2 py-0.5 text-[10px] font-bold uppercase text-white shadow-[1px_1px_0_0_#000]">
                      {activeProfile.experience_level}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-bold text-black">
                    💼 {activeProfile.primary_role}
                  </p>
                  {activeProfile.summary && (
                    <p className="mt-1.5 max-w-2xl text-xs font-medium text-black/80">
                      {activeProfile.summary}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onClearProfile();
                    setSelectedFile(null);
                    setPastedText("");
                  }}
                  className="brutal-sm bg-paper px-2.5 py-1 text-xs font-bold uppercase hover:bg-red-100"
                >
                  ✕ Change / Clear CV
                </button>
              </div>

              {/* Top Skills Badges */}
              {activeProfile.top_skills.length > 0 && (
                <div>
                  <span className="text-[11px] font-bold uppercase text-black/70">
                    Detected Skills &amp; Stack:
                  </span>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {activeProfile.top_skills.map((skill) => (
                      <span
                        key={skill}
                        className="border-2 border-black bg-brut-cyan px-2 py-0.5 text-xs font-bold shadow-[1px_1px_0_0_#000]"
                      >
                        ✓ {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommended Topic Pills */}
              {activeProfile.recommended_topics.length > 0 && (
                <div>
                  <span className="text-[11px] font-bold uppercase text-black/70">
                    Recommended Event Tracks (Click to search):
                  </span>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {activeProfile.recommended_topics.map((topic) => (
                      <button
                        key={topic}
                        type="button"
                        onClick={() =>
                          onSearchWithCv({
                            topic,
                            location: activeProfile.best_search_query.location || "Bangalore",
                            online: false,
                          })
                        }
                        className="brutal-press bg-brut-orange px-3 py-1 text-xs font-bold uppercase"
                        title={`Search events for track: ${topic}`}
                      >
                        🔍 {topic}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Primary Search CTA Banner */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-[2px] border-black bg-paper p-3 shadow-[3px_3px_0_0_#000]">
                <div>
                  <span className="text-[11px] font-bold uppercase text-black/60">
                    AI Scout Recommendation
                  </span>
                  <p className="text-xs font-bold text-black sm:text-sm">
                    Search <span className="bg-brut-yellow px-1">“{activeProfile.best_search_query.topic}”</span> in{" "}
                    <span className="bg-brut-lime px-1">{activeProfile.best_search_query.location || "Bangalore"}</span>
                  </p>
                </div>

                <button
                  type="button"
                  disabled={isSearchingEvents}
                  onClick={() =>
                    onSearchWithCv({
                      topic: activeProfile.best_search_query.topic,
                      location: activeProfile.best_search_query.location || "Bangalore",
                      online: false,
                    })
                  }
                  className="brutal-press bg-brut-lime px-4 py-2 text-xs font-bold uppercase disabled:opacity-60"
                >
                  {isSearchingEvents ? (
                    <>Scanning matching events...</>
                  ) : (
                    `🎯 Search Best Matching Events →`
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
