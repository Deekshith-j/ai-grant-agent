// ─────────────────────────────────────────────
//  Express Server — Main Entry Point
//  API routes + SSE streaming + session mgmt
// ─────────────────────────────────────────────
import express from "express";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
import { initGemini } from "./utils/geminiClient.js";
import { initSerper } from "./utils/serperClient.js";
import {
  createSession,
  getSession,
  handleUserInput,
  handleAnswer,
  updateProfileAndRetry,
  generateAdditionalEssay,
  addSSEClient,
  removeSSEClient,
} from "./agents/managerAgent.js";

dotenv.config();

// Initialize backend with keys from .env
initGemini(process.env.GEMINI_API_KEY || "MOCK_KEY_FOR_STARTUP");
initSerper(process.env.SERPER_API_KEY || "MOCK");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "10mb" }));

// ── Health check ────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", version: "1.0.0" });
});

// ── Initialize credentials (Kept for backwards compatibility if needed) ──
app.post("/api/init", (req, res) => {
  res.json({ success: true, mockSearch: !process.env.SERPER_API_KEY || process.env.SERPER_API_KEY === "MOCK" });
});

// ── Create session ──────────────────────────────────────────
app.post("/api/sessions", (req, res) => {
  const sessionId = uuidv4();
  createSession(sessionId);
  res.json({ sessionId });
});

// ── SSE event stream ────────────────────────────────────────
app.get("/api/sessions/:sessionId/events", (req, res) => {
  const { sessionId } = req.params;
  const session = getSession(sessionId);

  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }

  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  // Send any buffered messages immediately
  for (const msg of session.messages) {
    const data = JSON.stringify(msg);
    res.write(`data: ${data}\n\n`);
  }

  addSSEClient(sessionId, res);

  // Heartbeat every 15 seconds
  const heartbeat = setInterval(() => {
    try {
      res.write(": ping\n\n");
    } catch {
      clearInterval(heartbeat);
    }
  }, 15000);

  req.on("close", () => {
    clearInterval(heartbeat);
    removeSSEClient(sessionId, res);
  });
});

// ── Submit user input / start pipeline ─────────────────────
app.post("/api/sessions/:sessionId/message", async (req, res) => {
  const { sessionId } = req.params;
  const { text } = req.body;

  if (!text?.trim()) {
    return res.status(400).json({ error: "Message text is required." });
  }

  try {
    // Non-blocking — pipeline streams via SSE
    handleUserInput(sessionId, text).catch((err) => {
      console.error("Pipeline error:", err);
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Answer a profile question ───────────────────────────────
app.post("/api/sessions/:sessionId/answer", async (req, res) => {
  const { sessionId } = req.params;
  const { field, answer } = req.body;

  if (!field || !answer) {
    return res.status(400).json({ error: "field and answer are required." });
  }

  try {
    handleAnswer(sessionId, field, answer).catch((err) => {
      console.error("Answer handling error:", err);
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Get session state ───────────────────────────────────────
app.get("/api/sessions/:sessionId", (req, res) => {
  const session = getSession(req.params.sessionId);
  if (!session) return res.status(404).json({ error: "Session not found" });

  res.json({
    id: session.id,
    stage: session.stage,
    profile: session.profile,
    scholarships: session.scholarships,
    essays: session.essays,
    deadlines: session.deadlines,
    missingFields: session.missingFields,
  });
});

// ── Update profile & retry ──────────────────────────────────
app.post("/api/sessions/:sessionId/profile", async (req, res) => {
  const { sessionId } = req.params;
  const { profile } = req.body;

  if (!profile) return res.status(400).json({ error: "profile is required." });

  try {
    updateProfileAndRetry(sessionId, profile).catch(console.error);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Generate essay for specific scholarship ─────────────────
app.post("/api/sessions/:sessionId/essay/:index", async (req, res) => {
  const { sessionId, index } = req.params;

  try {
    generateAdditionalEssay(sessionId, parseInt(index, 10)).catch(console.error);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Download .ics calendar file ─────────────────────────────
app.get("/api/sessions/:sessionId/calendar.ics", (req, res) => {
  const session = getSession(req.params.sessionId);
  if (!session || !session.icsContent) {
    return res.status(404).json({ error: "Calendar not available yet." });
  }

  res.setHeader("Content-Type", "text/calendar");
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=scholarship-deadlines.ics"
  );
  res.send(session.icsContent);
});

// ── Start server ────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Scholarship Hunter API running at http://localhost:${PORT}`);
});
