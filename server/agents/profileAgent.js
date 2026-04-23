// ─────────────────────────────────────────────
//  Profile Ingestion Agent
//  Extracts structured student profile from raw input
// ─────────────────────────────────────────────
import { generate, parseJSON } from "../utils/geminiClient.js";

const REQUIRED_FIELDS = [
  "name",
  "nationality",
  "field_of_study",
  "education_level",
  "GPA",
  "skills",
  "financial_need",
  "preferred_country",
  "career_stage",
];

const FIELD_QUESTIONS = {
  name: "What is your full name?",
  nationality: "What is your nationality / country of citizenship?",
  field_of_study:
    "What is your primary field of study (e.g., Computer Science, Biotechnology)?",
  education_level:
    "What is your current education level? (e.g., Undergraduate, Master's, PhD)",
  GPA: "What is your current GPA? (e.g., 3.8 / 4.0 or 8.5 / 10)",
  skills: "List your key skills (e.g., Machine Learning, Python, Research).",
  financial_need:
    "Do you have a financial need for scholarship support? (yes / no)",
  preferred_country:
    "Which country or region would you prefer to study in? (e.g., USA, Europe, Any)",
  career_stage:
    "What career stage are you at? (e.g., Early Career, Mid-Career, Student)",
};

/**
 * Extract structured profile from raw user input.
 * Returns { profile, missingFields }
 */
export async function extractProfile(rawInput) {
  const prompt = `
You are a student profile extraction specialist.
Extract a structured JSON profile from the student's input below.

Required fields:
- name (string)
- nationality (string)
- field_of_study (string)
- education_level (string: "High School" | "Undergraduate" | "Master's" | "PhD" | "PostDoc")
- GPA (number, normalized to 4.0 scale; if given as X/10 convert proportionally; if not mentioned set null)
- skills (array of strings)
- projects (array of strings, can be empty [])
- financial_need (boolean)
- preferred_country (string, "Any" if not specified)
- career_stage (string: "Student" | "Early Career" | "Mid-Career" | "Senior")

Rules:
- Extract ONLY what is explicitly stated or can be clearly inferred.
- Set missing fields to null — do NOT guess.
- Return ONLY valid JSON, no markdown fences.

Student input:
"""
${rawInput}
"""

Return JSON:
`;

  const text = await generate(prompt, "flash");
  let profile;
  try {
    profile = parseJSON(text);
  } catch {
    profile = {};
  }

  const missingFields = REQUIRED_FIELDS.filter(
    (f) => profile[f] === null || profile[f] === undefined || profile[f] === ""
  );

  return { profile, missingFields };
}

/**
 * Merge additional answers into an existing profile.
 */
export async function mergeAnswer(currentProfile, field, answer) {
  const prompt = `
You have a partial student profile JSON. A new answer was given for the field "${field}".
Update the profile field with the parsed value from the answer.

Current profile:
${JSON.stringify(currentProfile, null, 2)}

Field to update: "${field}"
User's answer: "${answer}"

Rules:
- Return the COMPLETE updated profile JSON with ALL existing fields preserved.
- For "GPA": convert to 4.0 scale if needed.
- For "financial_need": convert "yes"/"no" to true/false boolean.
- For "skills"/"projects": parse as array if comma-separated.
- Return ONLY valid JSON, no markdown.
`;

  const text = await generate(prompt, "flash");
  try {
    return parseJSON(text);
  } catch {
    return { ...currentProfile, [field]: answer };
  }
}

/**
 * Get the question to ask for a missing field.
 */
export function getFieldQuestion(field) {
  return FIELD_QUESTIONS[field] || `Please provide your ${field}.`;
}
