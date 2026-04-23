// ─────────────────────────────────────────────
//  Manager Agent — Pipeline Orchestrator
//  Controls all 5 agents, SSE streaming, retries
// ─────────────────────────────────────────────
import { extractProfile, mergeAnswer, getFieldQuestion } from "./profileAgent.js";
import { searchScholarships } from "./searchAgent.js";
import { scoreScholarships } from "./scorerAgent.js";
import { generateEssays } from "./essayAgent.js";
import { manageDeadlines } from "./deadlineAgent.js";

// Session store: sessionId → state
const sessions = new Map();

export function getSession(sessionId) {
  return sessions.get(sessionId);
}

export function createSession(sessionId) {
  const session = {
    id: sessionId,
    stage: "AWAITING_INPUT",      // AWAITING_INPUT | FILLING_PROFILE | RUNNING | DONE | ERROR
    profile: {},
    missingFields: [],
    currentMissingField: null,
    scholarships: [],
    essays: [],
    deadlines: [],
    icsContent: null,
    messages: [],
    sseClients: [],
    toolFailures: 0,
    toolCalls: 0,
  };
  sessions.set(sessionId, session);
  return session;
}

/**
 * Register an SSE client for a session.
 */
export function addSSEClient(sessionId, res) {
  const session = sessions.get(sessionId);
  if (session) session.sseClients.push(res);
}

/**
 * Remove an SSE client.
 */
export function removeSSEClient(sessionId, res) {
  const session = sessions.get(sessionId);
  if (session) {
    session.sseClients = session.sseClients.filter((c) => c !== res);
  }
}

/**
 * Emit an SSE event to all clients for this session.
 */
function emit(session, type, payload) {
  const data = JSON.stringify({ type, payload, ts: Date.now() });
  for (const client of session.sseClients) {
    try {
      client.write(`data: ${data}\n\n`);
    } catch { /* connection closed */ }
  }
  // Also store in message log
  session.messages.push({ type, payload, ts: Date.now() });
}

function emitProgress(session, message) {
  emit(session, "progress", { message });
  console.log(`[${session.id}] ${message}`);
}

function emitError(session, message) {
  emit(session, "error", { message });
  console.error(`[${session.id}] ERROR: ${message}`);
}

function recordToolCall(session, failed = false) {
  session.toolCalls++;
  if (failed) session.toolFailures++;
  // Warn if failure rate > 30%
  if (session.toolCalls >= 5 && session.toolFailures / session.toolCalls > 0.3) {
    emitProgress(session, "⚠️ Warning: High tool failure rate detected. Results may be limited.");
  }
}

/**
 * Handle initial user input — start profile extraction.
 */
export async function handleUserInput(sessionId, userText) {
  const session = sessions.get(sessionId);
  if (!session) throw new Error("Session not found");

  emit(session, "user_message", { text: userText });
  emitProgress(session, "🧠 Analyzing your profile...");

  session.stage = "FILLING_PROFILE";

  let profile, missingFields;
  try {
    ({ profile, missingFields } = await extractProfile(userText));
    recordToolCall(session, false);
  } catch (err) {
    recordToolCall(session, true);
    emitError(session, `Profile extraction failed: ${err.message}`);
    session.stage = "ERROR";
    return;
  }

  session.profile = profile;
  session.missingFields = missingFields;

  if (missingFields.length > 0) {
    session.currentMissingField = missingFields[0];
    const question = getFieldQuestion(missingFields[0]);
    emit(session, "question", {
      field: missingFields[0],
      question,
      remaining: missingFields.length,
    });
  } else {
    // Profile complete — run pipeline
    await runPipeline(session);
  }
}

/**
 * Handle answers to profile questions.
 */
export async function handleAnswer(sessionId, field, answer) {
  const session = sessions.get(sessionId);
  if (!session) throw new Error("Session not found");

  emit(session, "user_message", { text: answer });
  emitProgress(session, `✅ Got it — updating ${field}...`);

  try {
    session.profile = await mergeAnswer(session.profile, field, answer);
    recordToolCall(session, false);
  } catch (err) {
    recordToolCall(session, true);
    emitError(session, `Could not process answer: ${err.message}`);
  }

  // Remove answered field from missing list
  session.missingFields = session.missingFields.filter((f) => f !== field);

  if (session.missingFields.length > 0) {
    session.currentMissingField = session.missingFields[0];
    const question = getFieldQuestion(session.missingFields[0]);
    emit(session, "question", {
      field: session.missingFields[0],
      question,
      remaining: session.missingFields.length,
    });
  } else {
    // All fields collected — run pipeline
    emitProgress(session, "✅ Profile complete! Starting scholarship search...");
    await runPipeline(session);
  }
}

/**
 * Full pipeline execution.
 */
async function runPipeline(session) {
  session.stage = "RUNNING";

  try {
    // ── Agent 1: Profile confirmed ─────────────
    emit(session, "profile_ready", { profile: session.profile });
    emitProgress(session, "🔍 Searching for scholarships across multiple sources...");

    // ── Agent 2: Search ────────────────────────
    let scholarships;
    try {
      scholarships = await searchScholarships(
        session.profile,
        (msg) => emitProgress(session, msg)
      );
      recordToolCall(session, false);
    } catch (err) {
      recordToolCall(session, true);
      emitError(session, `Search failed: ${err.message}. Retrying with broader query...`);
      // Minimal fallback
      scholarships = [];
    }

    emitProgress(session, `📊 Found ${scholarships.length} candidates. Scoring eligibility...`);

    // ── Agent 3: Score ─────────────────────────
    let scoredResult;
    try {
      scoredResult = await scoreScholarships(
        scholarships,
        session.profile,
        (msg) => emitProgress(session, msg)
      );
      recordToolCall(session, false);
    } catch (err) {
      recordToolCall(session, true);
      emitError(session, `Scoring failed: ${err.message}`);
      scoredResult = { scholarships: [], needsProfileRefinement: true };
    }

    if (scoredResult.needsProfileRefinement) {
      emit(session, "needs_refinement", {
        message: "No matching scholarships found after scoring. Please refine your profile.",
      });
      session.stage = "AWAITING_INPUT";
      return;
    }

    session.scholarships = scoredResult.scholarships;
    emit(session, "scholarships_ready", { scholarships: session.scholarships });
    emitProgress(session, `✅ ${session.scholarships.length} scholarships matched. Generating essays...`);

    // ── Agent 4: Essays ────────────────────────
    try {
      session.essays = await generateEssays(
        session.profile,
        session.scholarships,
        3,
        (msg) => emitProgress(session, msg)
      );
      recordToolCall(session, false);
    } catch (err) {
      recordToolCall(session, true);
      emitError(session, `Essay generation partial failure: ${err.message}`);
      session.essays = [];
    }

    emit(session, "essays_ready", { essays: session.essays });
    emitProgress(session, "📅 Building deadline timeline...");

    // ── Agent 5: Deadlines ─────────────────────
    try {
      const { deadlines, icsContent } = await manageDeadlines(
        session.scholarships,
        (msg) => emitProgress(session, msg)
      );
      session.deadlines = deadlines;
      session.icsContent = icsContent;
      recordToolCall(session, false);
    } catch (err) {
      recordToolCall(session, true);
      emitError(session, `Deadline planning failed: ${err.message}`);
    }

    emit(session, "deadlines_ready", { deadlines: session.deadlines });

    // ── Final output ───────────────────────────
    const finalOutput = {
      profile: session.profile,
      scholarships: session.scholarships,
      essays: session.essays,
      deadlines: session.deadlines,
    };

    session.stage = "DONE";
    emit(session, "done", finalOutput);
    emitProgress(session, "🎉 All done! Your scholarship results are ready.");

  } catch (err) {
    session.stage = "ERROR";
    emitError(session, `Pipeline error: ${err.message}`);
  }
}

/**
 * Allow user to update profile and re-run.
 */
export async function updateProfileAndRetry(sessionId, updatedProfile) {
  const session = sessions.get(sessionId);
  if (!session) throw new Error("Session not found");

  session.profile = updatedProfile;
  session.scholarships = [];
  session.essays = [];
  session.deadlines = [];
  emitProgress(session, "🔄 Profile updated — restarting pipeline...");
  await runPipeline(session);
}

/**
 * Request essay for a specific scholarship by index.
 */
export async function generateAdditionalEssay(sessionId, scholarshipIndex) {
  const session = sessions.get(sessionId);
  if (!session) throw new Error("Session not found");

  const scholarship = session.scholarships[scholarshipIndex];
  if (!scholarship) throw new Error("Scholarship not found");

  // Check if already generated
  const existing = session.essays.find(
    (e) => e.scholarship_title === scholarship.title
  );
  if (existing) {
    emit(session, "essay_ready", { essay: existing });
    return;
  }

  const { generateEssay } = await import("./essayAgent.js");
  emitProgress(session, `✍️ Generating essay for "${scholarship.title}"...`);
  const essay = await generateEssay(
    session.profile,
    scholarship,
    (msg) => emitProgress(session, msg)
  );
  session.essays.push(essay);
  emit(session, "essay_ready", { essay });
}
