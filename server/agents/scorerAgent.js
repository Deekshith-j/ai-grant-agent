// ─────────────────────────────────────────────
//  Eligibility Scorer Agent
//  Scores each scholarship 0-100% against profile
//  Returns top 10-15, discards < 40%
// ─────────────────────────────────────────────
import { generate, parseJSON } from "../utils/geminiClient.js";

/**
 * Score a batch of scholarships against the student profile.
 */
async function scoreBatch(scholarships, profile, threshold = 40) {
  const prompt = `
You are a rigorous scholarship eligibility analyst.

Score each scholarship for this student profile. Be accurate and strict.

Student Profile:
${JSON.stringify(profile, null, 2)}

Today's date: ${new Date().toISOString().split("T")[0]}

Scholarships to score:
${JSON.stringify(scholarships, null, 2)}

Scoring criteria (total = 100 points):
1. Nationality match (hard requirement — if restricted and doesn't match: score = 0)
   - Weight: 30 points
2. Field of study relevance: 25 points
3. Education level match: 20 points
4. GPA requirement met (if profile GPA >= requirement): 10 points
5. Location/country fit: 10 points
6. Deadline urgency (further deadline = slightly lower priority): 5 points

Rules:
- If deadline is in the past → score = 0
- If nationality is explicitly restricted and student doesn't match → score = 0
- Score < ${threshold} → still include in output (we'll filter after)
- Provide a 1-2 sentence reason for each score

Return ONLY a valid JSON array with objects containing:
{
  "title": string,
  "provider": string,
  "match_score": number (0-100),
  "reason": string,
  "deadline": string,
  "application_link": string,
  "eligibility": string,
  "nationality_eligible": boolean,
  "passed_threshold": boolean
}

No markdown fences. No extra text.
`;

  const text = await generate(prompt, "pro");
  try {
    return parseJSON(text);
  } catch {
    return scholarships.map((s) => ({
      title: s.title,
      provider: s.provider || "Unknown",
      match_score: 50,
      reason: "Scoring unavailable — manual review recommended.",
      deadline: s.deadline,
      application_link: s.application_link,
      eligibility: s.eligibility,
      nationality_eligible: true,
      passed_threshold: true,
    }));
  }
}

/**
 * Main scoring entry point.
 * Returns top 10-15 scholarships with scores.
 */
export async function scoreScholarships(scholarships, profile, emit = () => {}) {
  if (!scholarships || scholarships.length === 0) return [];

  let threshold = 40;
  let scored = [];

  emit(`Scoring ${scholarships.length} scholarships...`);

  // Process in batches of 10
  const BATCH = 10;
  for (let i = 0; i < scholarships.length; i += BATCH) {
    const batch = scholarships.slice(i, i + BATCH);
    emit(`Scoring batch ${Math.floor(i / BATCH) + 1}/${Math.ceil(scholarships.length / BATCH)}...`);
    const results = await scoreBatch(batch, profile, threshold);
    scored.push(...results);
  }

  // Filter by threshold
  let qualified = scored.filter((s) => s.match_score >= threshold);

  // Fallback: relax threshold
  if (qualified.length === 0) {
    emit("No results above 40%. Relaxing threshold to 30% and retrying...");
    threshold = 30;
    qualified = scored.filter((s) => s.match_score >= threshold);
  }

  if (qualified.length === 0) {
    return { scholarships: [], needsProfileRefinement: true };
  }

  // Sort descending, return top 15
  const top = qualified
    .sort((a, b) => b.match_score - a.match_score)
    .slice(0, 15);

  emit(`✅ Found ${top.length} eligible scholarships.`);
  return { scholarships: top, needsProfileRefinement: false };
}
