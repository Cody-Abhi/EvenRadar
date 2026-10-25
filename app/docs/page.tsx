"use client";

import React, { useState } from "react";
import Link from "next/link";

export default function ApiDocsPage() {
  const [activeTab, setActiveTab] = useState<"events" | "cv-match" | "spec">("events");
  const [testTopic, setTestTopic] = useState("AI hackathon");
  const [testLocation, setTestLocation] = useState("Bangalore");
  const [testOnline, setTestOnline] = useState(false);
  const [testCvText, setTestCvText] = useState(
    "Abhishek Srivastava\nFullstack AI Developer | Python, React, Next.js, PyTorch | Bangalore\nBuilt interactive geospatial dashboard with Mapbox GL and real-time LLM agents."
  );
  const [testResponse, setTestResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleTestEvents = async () => {
    setIsLoading(true);
    setTestResponse(null);
    try {
      const url = `/api/events?topic=${encodeURIComponent(testTopic)}&location=${encodeURIComponent(testLocation)}&online=${testOnline}`;
      const res = await fetch(url);
      const data = await res.json();
      setTestResponse(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setTestResponse(JSON.stringify({ error: err.message }, null, 2));
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestCv = async () => {
    setIsLoading(true);
    setTestResponse(null);
    try {
      const res = await fetch("/api/cv-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: testCvText }),
      });
      const data = await res.json();
      setTestResponse(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setTestResponse(JSON.stringify({ error: err.message }, null, 2));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-4 sm:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <header className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-[3px] border-black bg-[#ffd23f] p-5 shadow-[6px_6px_0_0_#000]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-black text-white text-xs font-mono font-bold px-2 py-0.5 uppercase tracking-wider">
              OpenAPI 3.1.0 Standard
            </span>
            <span className="bg-[#4deeea] text-black text-xs font-mono font-bold px-2 py-0.5 border border-black">
              RESTful
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-black font-mono">
            EVENTRADAR API REFERENCE
          </h1>
          <p className="text-sm font-medium text-black/80 mt-1">
            Production contract, live testing console, and SDK guides for EventRadar services.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/api/openapi.json"
            target="_blank"
            className="border-2 border-black bg-white px-3 py-1.5 text-xs font-bold font-mono hover:bg-black hover:text-white transition shadow-[2px_2px_0_0_#000]"
          >
            📥 openapi.json
          </a>
          <Link
            href="/"
            className="border-2 border-black bg-[#ff6ec7] text-white px-4 py-1.5 text-xs font-bold font-mono hover:bg-black transition shadow-[2px_2px_0_0_#000]"
          >
            ← Back to App
          </Link>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => { setActiveTab("events"); setTestResponse(null); }}
          className={`px-4 py-2 border-[3px] border-black font-mono font-bold text-sm shadow-[4px_4px_0_0_#000] transition ${
            activeTab === "events" ? "bg-[#4deeea] text-black" : "bg-white text-black hover:bg-neutral-100"
          }`}
        >
          GET /api/events
        </button>
        <button
          onClick={() => { setActiveTab("cv-match"); setTestResponse(null); }}
          className={`px-4 py-2 border-[3px] border-black font-mono font-bold text-sm shadow-[4px_4px_0_0_#000] transition ${
            activeTab === "cv-match" ? "bg-[#ff6ec7] text-white" : "bg-white text-black hover:bg-neutral-100"
          }`}
        >
          POST /api/cv-match
        </button>
        <button
          onClick={() => { setActiveTab("spec"); setTestResponse(null); }}
          className={`px-4 py-2 border-[3px] border-black font-mono font-bold text-sm shadow-[4px_4px_0_0_#000] transition ${
            activeTab === "spec" ? "bg-[#b08cff] text-white" : "bg-white text-black hover:bg-neutral-100"
          }`}
        >
          OpenAPI Specification & Models
        </button>
      </div>

      {/* Tab 1: /api/events */}
      {activeTab === "events" && (
        <section className="border-[3px] border-black bg-white p-6 shadow-[6px_6px_0_0_#000] mb-8 space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="bg-[#aeffb0] text-black text-xs font-mono font-bold px-3 py-1 border-2 border-black uppercase">
              GET
            </span>
            <code className="text-lg font-bold font-mono">/api/events</code>
            <span className="text-xs bg-neutral-200 border border-black px-2 py-0.5 font-mono">
              Rate: Dynamic Scraping + LLM
            </span>
          </div>

          <p className="text-sm text-neutral-800">
            Searches live tech events across multiple fixed platforms (Devfolio, MLH, Luma, Meetup, Devpost) plus search-discovered event pages. Uses Crawl4AI markdown extraction and Gemini AI for structured schema parsing, deduplication, and ranking.
          </p>

          {/* Parameters */}
          <div>
            <h3 className="font-mono font-bold text-sm uppercase tracking-wider mb-2 border-b-2 border-black pb-1">
              Query Parameters
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono border-2 border-black">
                <thead className="bg-[#ffd23f] border-b-2 border-black">
                  <tr>
                    <th className="p-2 border-r border-black">Parameter</th>
                    <th className="p-2 border-r border-black">Type</th>
                    <th className="p-2 border-r border-black">Required</th>
                    <th className="p-2 border-r border-black">Default</th>
                    <th className="p-2">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y border-black">
                  <tr>
                    <td className="p-2 font-bold border-r border-black">topic</td>
                    <td className="p-2 border-r border-black">string</td>
                    <td className="p-2 border-r border-black text-red-600 font-bold">YES</td>
                    <td className="p-2 border-r border-black">—</td>
                    <td className="p-2">Search topic or keyword (e.g. 'AI hackathon', 'Web3', 'React')</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-bold border-r border-black">location</td>
                    <td className="p-2 border-r border-black">string</td>
                    <td className="p-2 border-r border-black">No</td>
                    <td className="p-2 border-r border-black font-mono">India</td>
                    <td className="p-2">Target city or country. Supports aliases (Bangalore ≡ Bengaluru)</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-bold border-r border-black">online</td>
                    <td className="p-2 border-r border-black">boolean</td>
                    <td className="p-2 border-r border-black">No</td>
                    <td className="p-2 border-r border-black font-mono">false</td>
                    <td className="p-2">When true, restricts matches to online and hybrid events</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Code Snippets */}
          <div>
            <h3 className="font-mono font-bold text-sm uppercase tracking-wider mb-2 border-b-2 border-black pb-1">
              Code Examples
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border-2 border-black bg-neutral-900 text-white p-3 font-mono text-xs overflow-x-auto">
                <div className="text-neutral-400 mb-1">// cURL</div>
                <code>curl -X GET "http://localhost:3000/api/events?topic=AI%20hackathon&location=Bangalore&online=false"</code>
              </div>
              <div className="border-2 border-black bg-neutral-900 text-white p-3 font-mono text-xs overflow-x-auto">
                <div className="text-neutral-400 mb-1">// JavaScript (fetch)</div>
                <code>{`const res = await fetch('/api/events?topic=AI+hackathon&location=Bangalore');\nconst { events, sources, tookMs } = await res.json();`}</code>
              </div>
            </div>
          </div>

          {/* Interactive Console */}
          <div className="border-2 border-black bg-[#fdf0d5] p-4">
            <h3 className="font-mono font-bold text-sm uppercase tracking-wider mb-3">
              ⚡ Live API Tester
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-xs font-bold font-mono mb-1">topic:</label>
                <input
                  type="text"
                  value={testTopic}
                  onChange={(e) => setTestTopic(e.target.value)}
                  className="w-full border-2 border-black p-1.5 text-xs font-mono bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold font-mono mb-1">location:</label>
                <input
                  type="text"
                  value={testLocation}
                  onChange={(e) => setTestLocation(e.target.value)}
                  className="w-full border-2 border-black p-1.5 text-xs font-mono bg-white"
                />
              </div>
              <div className="flex items-center gap-2 pt-5">
                <input
                  type="checkbox"
                  id="onlineCheck"
                  checked={testOnline}
                  onChange={(e) => setTestOnline(e.target.checked)}
                  className="w-4 h-4 border-2 border-black accent-black"
                />
                <label htmlFor="onlineCheck" className="text-xs font-bold font-mono">
                  online: true
                </label>
              </div>
            </div>
            <button
              onClick={handleTestEvents}
              disabled={isLoading}
              className="px-4 py-2 bg-[#ffd23f] border-2 border-black font-mono font-bold text-xs uppercase hover:bg-black hover:text-white transition shadow-[2px_2px_0_0_#000] disabled:opacity-50"
            >
              {isLoading ? "Running Pipeline..." : "Send Request (GET /api/events)"}
            </button>

            {testResponse && (
              <div className="mt-4">
                <div className="text-xs font-bold font-mono mb-1">Response JSON:</div>
                <pre className="border-2 border-black bg-black text-[#aeffb0] p-3 text-xs font-mono max-h-80 overflow-y-auto">
                  {testResponse}
                </pre>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Tab 2: /api/cv-match */}
      {activeTab === "cv-match" && (
        <section className="border-[3px] border-black bg-white p-6 shadow-[6px_6px_0_0_#000] mb-8 space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="bg-[#ff6ec7] text-white text-xs font-mono font-bold px-3 py-1 border-2 border-black uppercase">
              POST
            </span>
            <code className="text-lg font-bold font-mono">/api/cv-match</code>
            <span className="text-xs bg-neutral-200 border border-black px-2 py-0.5 font-mono">
              AI Matchmaker (Gemini Flash)
            </span>
          </div>

          <p className="text-sm text-neutral-800">
            Accepts candidate resume text or PDF document. Gemini extracts the candidate&apos;s name, core role, top skills, experience level, and produces optimal event search keywords.
          </p>

          {/* Request Formats */}
          <div>
            <h3 className="font-mono font-bold text-sm uppercase tracking-wider mb-2 border-b-2 border-black pb-1">
              Accepted Request Encodings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border-2 border-black p-3 bg-neutral-50 text-xs font-mono">
                <span className="font-bold text-black">1. application/json</span>
                <pre className="mt-2 bg-neutral-900 text-white p-2 border border-black">
{`{
  "text": "Full resume text string..."
}`}
                </pre>
              </div>
              <div className="border-2 border-black p-3 bg-neutral-50 text-xs font-mono">
                <span className="font-bold text-black">2. multipart/form-data</span>
                <pre className="mt-2 bg-neutral-900 text-white p-2 border border-black">
{`FormData:
- file: <Resume.pdf>
- text: "Optional text fallback"`}
                </pre>
              </div>
            </div>
          </div>

          {/* Live Tester */}
          <div className="border-2 border-black bg-[#fdf0d5] p-4">
            <h3 className="font-mono font-bold text-sm uppercase tracking-wider mb-3">
              ⚡ Live CV Match Tester
            </h3>
            <div className="mb-3">
              <label className="block text-xs font-bold font-mono mb-1">Resume Text:</label>
              <textarea
                rows={4}
                value={testCvText}
                onChange={(e) => setTestCvText(e.target.value)}
                className="w-full border-2 border-black p-2 text-xs font-mono bg-white"
              />
            </div>
            <button
              onClick={handleTestCv}
              disabled={isLoading}
              className="px-4 py-2 bg-[#ff6ec7] text-white border-2 border-black font-mono font-bold text-xs uppercase hover:bg-black transition shadow-[2px_2px_0_0_#000] disabled:opacity-50"
            >
              {isLoading ? "Analyzing CV..." : "Send Request (POST /api/cv-match)"}
            </button>

            {testResponse && (
              <div className="mt-4">
                <div className="text-xs font-bold font-mono mb-1">Response JSON:</div>
                <pre className="border-2 border-black bg-black text-[#aeffb0] p-3 text-xs font-mono max-h-80 overflow-y-auto">
                  {testResponse}
                </pre>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Tab 3: OpenAPI Spec */}
      {activeTab === "spec" && (
        <section className="border-[3px] border-black bg-white p-6 shadow-[6px_6px_0_0_#000] mb-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold font-mono">OpenAPI 3.1.0 Contract Details</h2>
            <div className="flex gap-2">
              <a
                href="/docs/openapi.json"
                download="openapi.json"
                className="bg-[#ffd23f] border-2 border-black px-3 py-1 text-xs font-mono font-bold shadow-[2px_2px_0_0_#000]"
              >
                Download JSON
              </a>
              <a
                href="/docs/openapi.yaml"
                download="openapi.yaml"
                className="bg-[#4deeea] border-2 border-black px-3 py-1 text-xs font-mono font-bold shadow-[2px_2px_0_0_#000]"
              >
                Download YAML
              </a>
            </div>
          </div>

          <div className="space-y-4 text-xs font-mono">
            <div className="border-2 border-black p-3 bg-neutral-50">
              <div className="font-bold text-sm mb-1">Design Conventions:</div>
              <ul className="list-disc pl-5 space-y-1 text-neutral-700">
                <li>HTTP 200: Successful operation returning canonical schema</li>
                <li>HTTP 400: Client argument error with code &apos;INVALID_ARGUMENT&apos; or &apos;MISSING_INPUT&apos;</li>
                <li>HTTP 405: Method Not Allowed for disallowed verbs</li>
                <li>HTTP 422: Schema validation failure on parsed structures</li>
                <li>HTTP 500: Server or upstream AI engine pipeline exception</li>
                <li>Full CORS support enabled with OPTIONS preflight on all endpoints</li>
              </ul>
            </div>

            <div className="border-2 border-black p-3 bg-black text-white">
              <div className="text-neutral-400 mb-2">// Raw OpenAPI 3.1 Endpoint</div>
              <p>You can import the live specification into Postman, Swagger Editor, or Insomnia via:</p>
              <code className="text-[#4deeea] block mt-1">http://localhost:3000/api/openapi.json</code>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
