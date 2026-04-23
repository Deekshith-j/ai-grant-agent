// ─────────────────────────────────────────────
//  Gemini API Client — Rate-limited wrapper
//  Max 10 requests/min | Exponential backoff
// ─────────────────────────────────────────────
import { GoogleGenerativeAI } from "@google/generative-ai";
import PQueue from "p-queue";

// One shared queue — max 10 calls per 60 seconds
const queue = new PQueue({ interval: 60_000, intervalCap: 10 });

let geminiProClient = null;
let geminiFlashClient = null;

export function initGemini(apiKey) {
  const genAI = new GoogleGenerativeAI(apiKey);
  geminiProClient = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: { temperature: 0.4, maxOutputTokens: 2048 },
  });
  geminiFlashClient = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: { temperature: 0.4, maxOutputTokens: 2048 },
  });
}

async function callWithBackoff(fn, retries = 3, delay = 2000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isRateLimit =
        err?.status === 429 ||
        (err?.message || "").toLowerCase().includes("rate");
      if (attempt === retries || !isRateLimit) throw err;
      const wait = delay * Math.pow(2, attempt - 1);
      console.warn(`[Gemini] Rate limit hit. Retrying in ${wait}ms...`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
}

/**
 * Generate text using the specified model.
 * @param {string} prompt
 * @param {"pro"|"flash"} model
 * @returns {Promise<string>}
 */
export async function generate(prompt, model = "pro") {
  if (!geminiProClient || !geminiFlashClient) {
    throw new Error("Gemini not initialized. Call initGemini(apiKey) first.");
  }
  const client = model === "flash" ? geminiFlashClient : geminiProClient;

  return queue.add(() =>
    callWithBackoff(async () => {
      const result = await client.generateContent(prompt);
      return result.response.text();
    })
  );
}

/**
 * Parse JSON from LLM output (strips markdown fences if present).
 */
export function parseJSON(text) {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  return JSON.parse(cleaned);
}

export function getQueueStats() {
  return { size: queue.size, pending: queue.pending };
}
