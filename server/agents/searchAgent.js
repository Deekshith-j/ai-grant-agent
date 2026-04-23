// ─────────────────────────────────────────────
//  Scholarship Search Agent
//  Queries Serper API with multiple strategies
//  Returns 50+ deduplicated scholarship results
// ─────────────────────────────────────────────
import { webSearch } from "../utils/serperClient.js";
import { generate, parseJSON } from "../utils/geminiClient.js";

/**
 * Build search queries from student profile.
 */
function buildQueries(profile) {
  const { field_of_study, nationality, education_level, preferred_country, career_stage } = profile;
  const year = new Date().getFullYear() + 1;
  const country = preferred_country?.toLowerCase() === "any" ? "" : preferred_country;

  const base = [
    `scholarships for ${field_of_study} students ${year}`,
    `scholarships for ${nationality} students ${field_of_study} ${year}`,
    `${education_level} scholarships ${field_of_study} ${year} fully funded`,
    `international scholarships ${field_of_study} ${year} open now`,
    `government scholarships ${nationality} ${field_of_study} ${year}`,
  ];

  if (country) {
    base.push(
      `scholarships to study in ${country} for ${field_of_study} ${year}`,
      `${country} university scholarships for international students ${year}`
    );
  }

  if (career_stage === "Early Career" || career_stage === "Student") {
    base.push(`research grants ${field_of_study} ${year}`);
  }

  base.push(
    `site:opportunitydesk.org scholarships ${field_of_study} ${year}`,
    `site:scholars4dev.com scholarships ${field_of_study} ${year}`
  );

  return base;
}

/**
 * Deduplicate results by URL.
 */
function deduplicate(results) {
  const seen = new Set();
  return results.filter((r) => {
    if (seen.has(r.link)) return false;
    seen.add(r.link);
    return true;
  });
}

/**
 * Use Gemini Flash to enrich raw search results into structured scholarship objects.
 */
async function enrichResults(rawResults, profile) {
  if (rawResults.length === 0) return [];

  const prompt = `
You are a scholarship data extraction specialist.

Given these raw search results, extract structured scholarship information.
For each result, return a JSON object with:
- title (string)
- provider (string — organization offering it)
- deadline (string — ISO date if found, otherwise "Unknown")
- eligibility (string — brief description)
- application_link (string — the URL)
- country_restriction (string | null)
- education_level_required (string | null)
- field_relevance (string — "High" | "Medium" | "Low" | "Unknown")
- nationality_match (boolean | null — null if unrestricted)

Student profile context:
- Nationality: ${profile.nationality}
- Field: ${profile.field_of_study}
- Level: ${profile.education_level}

Raw results (title | link | snippet):
${rawResults.map((r, i) => `${i + 1}. ${r.title} | ${r.link} | ${r.snippet}`).join("\n")}

Return ONLY a valid JSON array. No markdown fences. No extra text.
`;

  const text = await generate(prompt, "flash");
  try {
    return parseJSON(text);
  } catch {
    // Fallback: return raw results as minimal objects
    return rawResults.map((r) => ({
      title: r.title,
      provider: "Unknown",
      deadline: "Unknown",
      eligibility: r.snippet,
      application_link: r.link,
      country_restriction: null,
      education_level_required: null,
      field_relevance: "Unknown",
      nationality_match: null,
    }));
  }
}

/**
 * Main search function.
 * @param {object} profile
 * @param {function} emit — progress callback
 * @returns {Promise<Array>} enriched scholarships
 */
export async function searchScholarships(profile, emit = () => {}) {
  const queries = buildQueries(profile);
  let allRaw = [];

  for (let i = 0; i < queries.length; i++) {
    emit(`Searching: "${queries[i]}" (${i + 1}/${queries.length})...`);
    try {
      const results = await webSearch(queries[i], 10);
      allRaw.push(...results);
    } catch (err) {
      console.error(`[Search] Query failed: ${queries[i]}`, err.message);
    }
  }

  // Fallback: broader query if not enough results
  if (allRaw.length < 20) {
    emit("Few results found. Broadening search...");
    try {
      const fallback = await webSearch(
        `fully funded scholarships international students ${new Date().getFullYear() + 1}`,
        30
      );
      allRaw.push(...fallback);
    } catch {/* silent */}
  }

  const unique = deduplicate(allRaw);
  emit(`Found ${unique.length} unique results. Extracting details...`);

  // Process in batches of 15 to avoid oversized prompts
  const BATCH = 15;
  let enriched = [];
  for (let i = 0; i < Math.min(unique.length, 60); i += BATCH) {
    const batch = unique.slice(i, i + BATCH);
    emit(`Enriching batch ${Math.floor(i / BATCH) + 1}...`);
    const result = await enrichResults(batch, profile);
    enriched.push(...result);
  }

  return enriched;
}
