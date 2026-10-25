import { NextRequest, NextResponse } from "next/server";
import { runPipeline } from "@/lib/pipeline";
import type { SearchQuery } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 160; // allow the long (≤150s) Fetch budget

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

/**
 * OPTIONS /api/events
 * Handles CORS preflight requests.
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

/**
 * GET /api/events?topic=&location=&online=
 * Runs the EventRadar pipeline and returns events + per-source status.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const topic = (searchParams.get("topic") ?? "").trim();
  const location = (searchParams.get("location") ?? "India").trim() || "India";
  const online = searchParams.get("online") === "true";

  if (!topic) {
    return NextResponse.json(
      {
        error: "Missing required query param: topic",
        code: "INVALID_ARGUMENT",
        details: "A non-empty 'topic' parameter is required to search tech events.",
      },
      {
        status: 400,
        headers: CORS_HEADERS,
      }
    );
  }

  const query: SearchQuery = { topic, location, online };

  try {
    const result = await runPipeline(query);
    return NextResponse.json(result, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Configuration / fatal errors (e.g. missing API keys) surface here.
    return NextResponse.json(
      {
        error: message,
        code: "INTERNAL_PIPELINE_ERROR",
        query,
      },
      {
        status: 500,
        headers: CORS_HEADERS,
      }
    );
  }
}
