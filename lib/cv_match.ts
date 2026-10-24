import { z } from "zod";
import type { EventItem } from "./types";

export const cvProfileSchema = z.object({
  candidate_name: z.string().nullable().default(null),
  primary_role: z.string().default("Tech Enthusiast / Developer"),
  experience_level: z.enum(["student", "junior", "mid", "senior"]).default("mid"),
  top_skills: z.array(z.string()).default([]),
  recommended_topics: z.array(z.string()).default([]),
  best_search_query: z
    .object({
      topic: z.string().default("Tech Hackathon"),
      location: z.string().default("Bangalore"),
    })
    .default({ topic: "Tech Hackathon", location: "Bangalore" }),
  match_keywords: z.array(z.string()).default([]),
  summary: z.string().default(""),
});

export type CvProfile = z.infer<typeof cvProfileSchema>;

export interface EventMatchResult {
  score: number; // 0 to 100
  matchingSkills: string[];
  reason: string;
  level: "high" | "medium" | "low";
}

/**
 * Normalizes a keyword string for case-insensitive and punctuation-free matching.
 */
function cleanTerm(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9+#\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Computes a relevant match score (0-100%) and explains why an event fits the candidate's CV.
 */
export function scoreEventForCv(
  event: EventItem,
  cv: CvProfile
): EventMatchResult {
  if (!cv || !cv.top_skills || cv.top_skills.length === 0) {
    return { score: 0, matchingSkills: [], reason: "No CV uploaded", level: "low" };
  }

  // Aggregate event searchable text
  const rawCorpus = [
    event.name,
    event.event_type,
    ...(event.themes || []),
    event.eligibility || "",
    event.venue_or_city || "",
    event.mode || "",
  ].join(" ");

  const corpus = cleanTerm(rawCorpus);

  const matchingSkills: string[] = [];
  let score = 0;

  // 1. Direct and Substring Skills Matching
  for (const skill of cv.top_skills) {
    const raw = skill.trim();
    const clean = cleanTerm(raw);
    if (!clean || clean.length < 2) continue;

    // Check if the skill appears as a word or phrase in the event corpus
    const escaped = clean.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(^|\\s)${escaped}(\\s|$)`, "i");

    if (regex.test(corpus) || corpus.includes(clean)) {
      if (!matchingSkills.some((s) => s.toLowerCase() === raw.toLowerCase())) {
        matchingSkills.push(raw);
        score += 20;
      }
    }
  }

  // Domain intelligence: associate related ecosystem terms
  const hasAiSkills = cv.top_skills.some((s) =>
    /ai|ml|pytorch|tensorflow|langchain|llm|huggingface|rag|nlp|computer vision/i.test(s)
  ) || /ai|ml|data|machine learning/i.test(cv.primary_role);

  if (hasAiSkills) {
    if (/\b(ai|artificial intelligence|machine learning|deep learning|genai|generative ai|llm|nvidia|opencv|computer vision|robotics)\b/i.test(corpus)) {
      if (!matchingSkills.includes("AI / ML")) {
        matchingSkills.push("AI / ML");
      }
      score += 25;
    }
  }

  const hasWebSkills = cv.top_skills.some((s) =>
    /react|next|javascript|typescript|node|vue|frontend|fullstack|web/i.test(s)
  ) || /web|fullstack|frontend/i.test(cv.primary_role);

  if (hasWebSkills) {
    if (/\b(react|next\.?js|javascript|typescript|node|web|frontend|fullstack|api)\b/i.test(corpus)) {
      if (!matchingSkills.includes("Web / Fullstack")) {
        matchingSkills.push("Web / Fullstack");
      }
      score += 20;
    }
  }

  // 2. Match Keywords & Recommended Topics
  let topicMatches = 0;
  const allKeywords = [...(cv.match_keywords || []), ...(cv.recommended_topics || [])];
  for (const kw of allKeywords) {
    const clean = cleanTerm(kw);
    if (!clean || clean.length < 3) continue;

    // Match either full phrase or significant words
    const words = clean.split(" ").filter((w) => w.length > 3);
    const phraseMatch = corpus.includes(clean);
    const wordsMatchCount = words.filter((w) => corpus.includes(w)).length;

    if (phraseMatch) {
      topicMatches++;
      score += 12;
    } else if (wordsMatchCount >= 2) {
      topicMatches++;
      score += 8;
    }
  }

  // 3. Match Event Type alignment (Hackathons, Conferences, Meetups)
  const isHackathonSeeker =
    (cv.best_search_query?.topic || "").toLowerCase().includes("hackathon") ||
    (cv.summary || "").toLowerCase().includes("hackathon") ||
    cv.experience_level === "student" ||
    cv.experience_level === "junior";

  if (isHackathonSeeker && event.event_type === "hackathon") {
    score += 15;
  }

  // 4. Role relevance
  const roleClean = cv.primary_role.toLowerCase();
  if (
    roleClean.includes("ai") &&
    (/\b(ai|ml|data|model|llm|intelligence)\b/i.test(corpus))
  ) {
    score += 15;
  } else if (
    roleClean.includes("fullstack") &&
    (/\b(hackathon|fullstack|web|developer|builder)\b/i.test(corpus))
  ) {
    score += 12;
  }

  // 4. Match Location or Online mode bonus
  const preferredLoc = (cv.best_search_query?.location || "").toLowerCase().trim();
  if (preferredLoc && event.venue_or_city && event.venue_or_city.toLowerCase().includes(preferredLoc)) {
    score += 10;
  } else if (event.mode === "online" || event.mode === "hybrid") {
    score += 5;
  }

  // 5. Experience level & event type alignment
  if (cv.experience_level === "student" && (event.event_type === "hackathon" || (event.eligibility && event.eligibility.toLowerCase().includes("student")))) {
    score += 10;
  } else if (cv.experience_level === "senior" && (event.event_type === "conference" || event.event_type === "meetup")) {
    score += 8;
  }

  // Base relevance baseline if it's in the same broader domain
  if (matchingSkills.length > 0 || topicMatches > 0) {
    score = Math.max(score, 35);
  }

  // Clamp 0 to 98 (reserve 100 for absolute perfection)
  const finalScore = Math.min(Math.max(score, 0), 98);

  // Formulate concise reason
  let reason = "";
  if (matchingSkills.length > 0) {
    reason = `Matches your skills in ${matchingSkills.slice(0, 3).join(", ")}`;
  } else if (topicMatches > 0) {
    reason = `Fits your recommended track in ${cv.recommended_topics.slice(0, 2).join(" & ")}`;
  } else if (finalScore >= 40) {
    reason = `Aligns with your ${cv.primary_role} background`;
  } else {
    reason = "General tech event";
  }

  const level: "high" | "medium" | "low" =
    finalScore >= 70 ? "high" : finalScore >= 40 ? "medium" : "low";

  return {
    score: finalScore,
    matchingSkills,
    reason,
    level,
  };
}
