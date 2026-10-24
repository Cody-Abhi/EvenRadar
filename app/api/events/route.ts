import { NextResponse } from "next/server";
import { runPipeline } from "@/lib/pipeline";
import type { SearchQuery } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 160; // allow the long (≤150s) Fetch budget

/**
 * GET /api/events?topic=&location=&online=
 * Runs the EventRadar pipeline and returns events + per-source status.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const topic = (searchParams.get("topic") ?? "").trim();
  const location = (searchParams.get("location") ?? "India").trim() || "India";
  const online = searchParams.get("online") === "true";

  if (!topic) {
    return NextResponse.json(
      { error: "Missing required query param: topic" },
      { status: 400 }
    );
  }

  const query: SearchQuery = { topic, location, online };

  try {
    const result = await runPipeline(query);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Configuration / fatal errors (e.g. missing API keys) surface here.
    return NextResponse.json(
      { error: message, query },
      { status: 500 }
    );
  }
}
