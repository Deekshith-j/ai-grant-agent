// ─────────────────────────────────────────────
//  Essay Writer Agent
//  Draft → Critique → Rewrite (up to 3 iterations)
//  Uses Gemini Pro for both writing and self-critique
// ─────────────────────────────────────────────
import { generate } from "../utils/geminiClient.js";

const MAX_ITERATIONS = 3;
const WEAK_THRESHOLD = 6; // critique score out of 10; below this = retry

/**
 * Generate initial essay draft.
 */
async function draftEssay(profile, scholarship) {
  const prompt = `
You are an expert scholarship essay writer helping a student craft a compelling personal statement.

Student Profile:
${JSON.stringify(profile, null, 2)}

Scholarship Details:
- Title: ${scholarship.title}
- Provider: ${scholarship.provider}
- Eligibility: ${scholarship.eligibility}
- Reason this student qualified: ${scholarship.reason}

Write a scholarship application essay (400-600 words) that:
1. Opens with a compelling personal story or hook
2. Clearly connects the student's background, skills, and goals to the scholarship's mission
3. Demonstrates specific achievements (use details from profile)
4. Expresses genuine motivation and future impact
5. Ends with a confident, memorable closing

Write as if the student wrote it — in first person, authentic voice.
Return ONLY the essay text, no labels or headers.
`;
  return generate(prompt, "pro");
}

/**
 * Critique the essay as a strict reviewer.
 */
async function critiqueEssay(essay, scholarship) {
  const prompt = `
You are a strict scholarship committee reviewer evaluating this application essay.

Scholarship: ${scholarship.title} by ${scholarship.provider}

Essay to review:
"""
${essay}
"""

Evaluate the essay on these dimensions:
1. Clarity (1-10): Is the writing clear, concise, and well-structured?
2. Specificity (1-10): Does it use concrete details and achievements, not generic claims?
3. Alignment (1-10): Does it clearly connect to this scholarship's goals and values?
4. Authenticity (1-10): Does it feel genuine and personal?
5. Impact (1-10): Will it stand out to reviewers?

Return a JSON object:
{
  "overall_score": number (average of above),
  "clarity": number,
  "specificity": number,
  "alignment": number,
  "authenticity": number,
  "impact": number,
  "weaknesses": [list of specific weaknesses as strings],
  "suggestions": [list of concrete improvement suggestions as strings]
}

Return ONLY valid JSON. No markdown.
`;
  const text = await generate(prompt, "pro");
  try {
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return { overall_score: 7, weaknesses: [], suggestions: [] };
  }
}

/**
 * Rewrite the essay based on critique feedback.
 */
async function rewriteEssay(essay, critique, profile, scholarship) {
  const prompt = `
You are an expert scholarship essay editor.

Original essay:
"""
${essay}
"""

Critique received:
- Weaknesses: ${critique.weaknesses?.join("; ") || "None identified"}
- Suggestions: ${critique.suggestions?.join("; ") || "None"}

Student Profile:
${JSON.stringify(profile, null, 2)}

Scholarship: ${scholarship.title}

Rewrite the essay addressing ALL weaknesses and implementing ALL suggestions.
Maintain the student's authentic voice.
Keep length between 400-600 words.
Return ONLY the improved essay text.
`;
  return generate(prompt, "pro");
}

/**
 * Generate essay with self-critique loop.
 * @param {object} profile
 * @param {object} scholarship
 * @param {function} emit — progress callback
 * @returns {Promise<{essay, iterations, needs_review, critiques}>}
 */
export async function generateEssay(profile, scholarship, emit = () => {}) {
  emit(`✍️ Drafting essay for "${scholarship.title}"...`);
  let essay = await draftEssay(profile, scholarship);
  let critiques = [];
  let needsReview = false;
  let iteration = 1;

  while (iteration <= MAX_ITERATIONS) {
    emit(`🔍 Critiquing essay (pass ${iteration}/${MAX_ITERATIONS})...`);
    const critique = await critiqueEssay(essay, scholarship);
    critiques.push({ iteration, ...critique });

    if (critique.overall_score >= WEAK_THRESHOLD) {
      emit(`✅ Essay quality score: ${critique.overall_score.toFixed(1)}/10 — Accepted.`);
      break;
    }

    if (iteration === MAX_ITERATIONS) {
      // Mark weak sections
      emit(`⚠️ Essay still weak after ${MAX_ITERATIONS} passes — marking for review.`);
      essay = markWeakSections(essay, critique);
      needsReview = true;
      break;
    }

    emit(`🔄 Rewriting based on critique (pass ${iteration})...`);
    essay = await rewriteEssay(essay, critique, profile, scholarship);
    iteration++;
  }

  return {
    scholarship_title: scholarship.title,
    essay,
    iterations: iteration,
    needs_review: needsReview,
    critiques,
  };
}

/**
 * Mark weak sections in essay with [review-needed] tags.
 */
function markWeakSections(essay, critique) {
  let marked = essay;
  const weaknesses = critique.weaknesses || [];
  
  if (weaknesses.length > 0) {
    marked = `[REVIEW-NEEDED: ${weaknesses.join(" | ")}]\n\n${essay}`;
  } else {
    marked = `[REVIEW-NEEDED: General quality improvements recommended]\n\n${essay}`;
  }
  return marked;
}

/**
 * Generate essays for top N scholarships.
 */
export async function generateEssays(profile, scholarships, topN = 3, emit = () => {}) {
  const targets = scholarships.slice(0, topN);
  const essays = [];

  for (let i = 0; i < targets.length; i++) {
    emit(`📝 Generating essay ${i + 1}/${targets.length}: "${targets[i].title}"...`);
    const result = await generateEssay(profile, targets[i], emit);
    essays.push(result);
  }

  return essays;
}
