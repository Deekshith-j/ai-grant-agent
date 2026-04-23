// ─────────────────────────────────────────────
//  Deadline Manager Agent
//  Extracts, validates, and organizes deadlines
//  Outputs priority task list + .ics export
// ─────────────────────────────────────────────
import { generate, parseJSON } from "../utils/geminiClient.js";
import { generateICS } from "../utils/icsGenerator.js";

/**
 * Parse and enrich deadline information from scored scholarships.
 */
async function parseDeadlines(scholarships) {
  const today = new Date();
  const todayISO = today.toISOString().split("T")[0];

  const prompt = `
Today's date: ${todayISO}

Given these scholarships with deadlines, create a structured deadline management plan.

For each scholarship:
1. Parse the deadline to ISO date format (YYYY-MM-DD). If "Unknown", estimate 3 months from today.
2. Calculate days_remaining from today
3. Generate two reminder dates:
   - 14 days before deadline
   - 2 days before deadline
4. Assign priority: "Critical" (≤7 days), "High" (8-30 days), "Medium" (31-90 days), "Low" (>90 days)
5. Generate a task checklist for the application

Scholarships:
${JSON.stringify(scholarships.map(s => ({
  title: s.title,
  provider: s.provider,
  deadline: s.deadline,
  application_link: s.application_link,
  match_score: s.match_score
})), null, 2)}

Return ONLY a valid JSON array with objects:
{
  "scholarship_title": string,
  "provider": string,
  "deadline": "ISO date string",
  "days_remaining": number,
  "priority": "Critical" | "High" | "Medium" | "Low",
  "reminders": ["ISO date string", "ISO date string"],
  "tasks": ["string", ...],
  "application_link": string,
  "match_score": number
}

No markdown fences. No extra text.
`;

  const text = await generate(prompt, "flash");
  try {
    return parseJSON(text);
  } catch {
    // Fallback: minimal deadline objects
    return scholarships.map((s) => {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 90);
      const days = 90;
      return {
        scholarship_title: s.title,
        provider: s.provider || "Unknown",
        deadline: deadline.toISOString().split("T")[0],
        days_remaining: days,
        priority: "Medium",
        reminders: [
          new Date(deadline.getTime() - 14 * 24 * 3600000).toISOString().split("T")[0],
          new Date(deadline.getTime() - 2 * 24 * 3600000).toISOString().split("T")[0],
        ],
        tasks: [
          "Prepare personal statement",
          "Collect recommendation letters",
          "Gather academic transcripts",
          "Submit application",
        ],
        application_link: s.application_link,
        match_score: s.match_score,
      };
    });
  }
}

/**
 * Main deadline manager entry point.
 * @returns {{ deadlines, icsContent }}
 */
export async function manageDeadlines(scholarships, emit = () => {}) {
  emit("📅 Extracting and organizing deadlines...");

  const deadlines = await parseDeadlines(scholarships);

  // Sort by urgency (days_remaining ascending)
  deadlines.sort((a, b) => a.days_remaining - b.days_remaining);

  emit("📆 Generating calendar file...");
  const icsContent = generateICS(deadlines);

  emit(`✅ Deadline plan ready for ${deadlines.length} scholarships.`);

  return { deadlines, icsContent };
}
