import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { cvProfileSchema, type CvProfile } from "@/lib/cv_match";

const CANDIDATE_MODELS = [
  process.env.GEMINI_MODEL,
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-flash-latest",
].filter(Boolean) as string[];

let _geminiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set — add it to .env.local"
    );
  }
  if (!_geminiClient) {
    _geminiClient = new GoogleGenAI({ apiKey });
  }
  return _geminiClient;
}

const CV_PROMPT = `You are an expert AI Career Scout and Tech Event Matchmaker.
Analyze the provided candidate CV/Resume or profile text.
Identify the candidate's core technical profile, key skills, experience level, and recommend the best tech events (hackathons, conferences, meetups, workshops) for them.

You MUST return ONLY a JSON object matching this schema:
{
  "candidate_name": string or null,
  "primary_role": string (e.g., "Fullstack AI Engineer", "Frontend Developer", "Data Scientist", "Mobile App Engineer"),
  "experience_level": "student" | "junior" | "mid" | "senior",
  "top_skills": string[] (up to 10 top technologies, languages, tools, e.g. ["Python", "React", "Next.js", "PyTorch", "PostgreSQL"]),
  "recommended_topics": string[] (3 to 5 high-impact topics for event search, e.g. ["AI & Generative AI", "Web Development", "Cloud & DevOps"]),
  "best_search_query": {
    "topic": string (the single highest-leverage search term for tech events, e.g. "AI Hackathon", "Fullstack", "Web3"),
    "location": string (the candidate's detected city/region, or "Bangalore" if in India or unknown, e.g. "Bangalore", "Delhi", "Mumbai", "Hyderabad")
  },
  "match_keywords": string[] (10-15 keywords to match against event titles, descriptions, and tags),
  "summary": string (1-2 crisp sentences describing their background and why these events fit them)
}

RULES:
- Do NOT wrap in markdown \`\`\`json fences. Return valid JSON only.
- If the name is unclear, set candidate_name to null.
- Ensure recommended_topics are practical event search categories.`;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

/**
 * OPTIONS /api/cv-match
 * Handles CORS preflight requests.
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

/**
 * GET /api/cv-match
 * Returns API usage documentation for CV matching.
 */
export async function GET() {
  return NextResponse.json(
    {
      name: "EventRadar CV Matchmaker API",
      method: "POST",
      endpoint: "/api/cv-match",
      description: "Extracts technical profile, key skills, and best event recommendations from candidate CV/resume text or PDF file.",
      supported_content_types: [
        "application/json (body: { \"text\": \"...\" })",
        "multipart/form-data (fields: 'file' [PDF/Text] or 'text')",
      ],
      response_schema: {
        success: "boolean",
        profile: {
          candidate_name: "string | null",
          primary_role: "string",
          experience_level: "student | junior | mid | senior",
          top_skills: "string[]",
          recommended_topics: "string[]",
          best_search_query: "{ topic: string, location: string }",
          match_keywords: "string[]",
          summary: "string",
        },
      },
    },
    {
      status: 200,
      headers: CORS_HEADERS,
    }
  );
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let cvText = "";
    let inlineData: { mimeType: string; data: string } | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const textParam = formData.get("text") as string | null;

      if (file && file.size > 0) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const isPdf =
          file.type === "application/pdf" ||
          file.name.toLowerCase().endsWith(".pdf");

        if (isPdf) {
          // Gemini supports base64 inline PDF documents natively!
          inlineData = {
            mimeType: "application/pdf",
            data: buffer.toString("base64"),
          };
        } else {
          // Plain text / markdown
          cvText = buffer.toString("utf-8");
        }
      } else if (textParam && textParam.trim()) {
        cvText = textParam.trim();
      } else {
        return NextResponse.json(
          {
            error: "No CV file or text provided.",
            code: "MISSING_INPUT",
            details: "Provide either a 'file' (PDF or text) or a 'text' parameter in multipart/form-data.",
          },
          { status: 400, headers: CORS_HEADERS }
        );
      }
    } else {
      // JSON body
      const body = await req.json().catch(() => ({}));
      if (!body.text || typeof body.text !== "string" || !body.text.trim()) {
        return NextResponse.json(
          {
            error: "Please provide resume text in the 'text' field.",
            code: "MISSING_TEXT_FIELD",
            details: "JSON payload must contain a non-empty 'text' string field.",
          },
          { status: 400, headers: CORS_HEADERS }
        );
      }
      cvText = body.text.trim();
    }

    const ai = getGemini();

    // Prepare contents payload for Gemini
    const contents: Array<string | { inlineData: { mimeType: string; data: string } }> = [];
    if (inlineData) {
      contents.push({ inlineData });
      contents.push(CV_PROMPT);
    } else {
      // Truncate overly long text CVs to stay safe
      const cleanCvText = cvText.slice(0, 20_000);
      contents.push(`${CV_PROMPT}\n\n--- CV CONTENT ---\n${cleanCvText}`);
    }

    let lastError: unknown = null;
    let rawResponse = "";

    // Fallback rotation across candidate models
    for (const model of CANDIDATE_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
          config: {
            responseMimeType: "application/json",
          },
        });

        rawResponse = response.text || "";
        if (rawResponse) break;
      } catch (err: any) {
        lastError = err;
        console.warn(`[cv-match] Model ${model} failed: ${err.message}. Trying next fallback...`);
      }
    }

    if (!rawResponse) {
      throw lastError || new Error("Failed to analyze CV with AI models.");
    }

    // Parse JSON
    let parsedJson: any;
    try {
      parsedJson = JSON.parse(rawResponse);
    } catch {
      // Strip markdown code fences if model accidentally emitted them
      const cleaned = rawResponse
        .replace(/^```json\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();
      parsedJson = JSON.parse(cleaned);
    }

    const validated = cvProfileSchema.safeParse(parsedJson);
    if (!validated.success) {
      console.error("[cv-match] Schema validation error:", validated.error);
      return NextResponse.json(
        {
          error: "Failed to parse structured CV profile.",
          code: "VALIDATION_ERROR",
          details: validated.error.format(),
        },
        { status: 422, headers: CORS_HEADERS }
      );
    }

    return NextResponse.json(
      {
        success: true,
        profile: validated.data,
      },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (error: any) {
    console.error("[cv-match] Unhandled error:", error);
    return NextResponse.json(
      {
        error: error?.message || "Internal server error while processing CV.",
        code: "INTERNAL_SERVER_ERROR",
      },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
