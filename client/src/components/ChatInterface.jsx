import { useState, useEffect, useRef, useCallback } from "react";

const API_BASE = "/api";

const STAGE_LABELS = {
  AWAITING_INPUT: { icon: "💬", label: "Waiting for Input" },
  FILLING_PROFILE: { icon: "📋", label: "Building Profile" },
  RUNNING: { icon: "⚙️", label: "Running Pipeline" },
  DONE: { icon: "✅", label: "Complete" },
  ERROR: { icon: "❌", label: "Error" },
};

export function ChatInterface({ sessionId, onSessionUpdate }) {
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      type: "agent",
      text: "👋 Hi! I'm ScholarAI — your autonomous scholarship hunting agent.\n\nTell me about yourself to get started! You can paste your resume, describe your background, or simply say:\n\n*\"I'm a 3rd year Computer Science student from India with 3.8 GPA looking for MS programs in the USA.\"*",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [stage, setStage] = useState("AWAITING_INPUT");
  const [pendingQuestion, setPendingQuestion] = useState(null);
  const [isThinking, setIsThinking] = useState(false);
  const [questionField, setQuestionField] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Set up SSE event stream
  useEffect(() => {
    if (!sessionId) return;
    const es = new EventSource(`${API_BASE}/sessions/${sessionId}/events`);

    es.onmessage = (e) => {
      const event = JSON.parse(e.data);
      handleSSEEvent(event);
    };

    es.onerror = () => {
      // SSE connection lost — will auto-reconnect
    };

    return () => es.close();
  }, [sessionId]);

  const addMessage = useCallback((type, text, extra = {}) => {
    setMessages((prev) => [
      ...prev,
      { id: Date.now() + Math.random(), type, text, ...extra },
    ]);
  }, []);

  function handleSSEEvent({ type, payload }) {
    switch (type) {
      case "progress":
        addMessage("progress", payload.message);
        break;

      case "error":
        addMessage("error", `⚠️ ${payload.message}`);
        setIsThinking(false);
        break;

      case "question":
        setPendingQuestion(payload.question);
        setQuestionField(payload.field);
        setIsThinking(false);
        addMessage("question", payload.question, {
          field: payload.field,
          remaining: payload.remaining,
        });
        break;

      case "profile_ready":
        setIsThinking(false);
        onSessionUpdate?.({ profile: payload.profile });
        addMessage("agent", "✅ Profile locked in! Now searching scholarships across global databases...");
        break;

      case "scholarships_ready":
        onSessionUpdate?.({ scholarships: payload.scholarships });
        addMessage("agent", `🏆 Found **${payload.scholarships.length} matching scholarships**! Check the Scholarships tab.`);
        break;

      case "essays_ready":
        onSessionUpdate?.({ essays: payload.essays });
        addMessage("agent", `✍️ Generated **${payload.essays.length} scholarship essays**! Review them in the Essays tab.`);
        break;

      case "deadlines_ready":
        onSessionUpdate?.({ deadlines: payload.deadlines });
        addMessage("agent", `📅 Deadline timeline ready! Check the Timeline tab for your action plan.`);
        break;

      case "needs_refinement":
        setStage("AWAITING_INPUT");
        setIsThinking(false);
        addMessage("agent", `😔 ${payload.message}\n\nTry updating your profile with more details — use the Profile tab.`);
        break;

      case "done":
        setStage("DONE");
        setIsThinking(false);
        onSessionUpdate?.({
          profile: payload.profile,
          scholarships: payload.scholarships,
          essays: payload.essays,
          deadlines: payload.deadlines,
        });
        addMessage("agent", "🎉 **All done!** Your full scholarship report is ready. Switch between the tabs above to review scholarships, essays, and your deadline timeline.");
        break;

      default:
        break;
    }
  }

  async function sendMessage(text) {
    if (!text.trim() || isThinking) return;
    addMessage("user", text);
    setInputText("");
    setIsThinking(true);

    try {
      if (pendingQuestion && questionField) {
        // Answering a profile question
        await fetch(`${API_BASE}/sessions/${sessionId}/answer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ field: questionField, answer: text }),
        });
        setPendingQuestion(null);
        setQuestionField(null);
      } else {
        // Initial input
        setStage("FILLING_PROFILE");
        await fetch(`${API_BASE}/sessions/${sessionId}/message`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
      }
    } catch (err) {
      addMessage("error", `Connection error: ${err.message}`);
      setIsThinking(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputText);
    }
  }

  const stageInfo = STAGE_LABELS[stage] || STAGE_LABELS.AWAITING_INPUT;

  return (
    <div style={styles.container}>
      {/* Stage indicator */}
      <div style={styles.stageBar}>
        <span style={styles.stageIcon}>{stageInfo.icon}</span>
        <span style={styles.stageLabel}>{stageInfo.label}</span>
        {stage === "RUNNING" && <span className="spinner spinner-sm" style={{ marginLeft: "auto" }} />}
      </div>

      {/* Messages */}
      <div style={styles.messages} id="chat-messages">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}

        {isThinking && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div style={styles.inputArea}>
        <textarea
          ref={inputRef}
          id="chat-input"
          className="input"
          style={styles.textarea}
          placeholder={
            pendingQuestion
              ? "Type your answer..."
              : "Describe yourself or paste your resume..."
          }
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isThinking || stage === "RUNNING"}
          rows={3}
        />
        <button
          id="send-btn"
          className="btn btn-primary"
          style={styles.sendBtn}
          onClick={() => sendMessage(inputText)}
          disabled={!inputText.trim() || isThinking || stage === "RUNNING"}
        >
          {isThinking ? <span className="spinner spinner-sm" /> : "↑ Send"}
        </button>
      </div>

      <p style={styles.hint}>Press Enter to send · Shift+Enter for new line</p>
    </div>
  );
}

function ChatMessage({ message }) {
  const isUser = message.type === "user";
  const isProgress = message.type === "progress";
  const isQuestion = message.type === "question";
  const isError = message.type === "error";

  if (isProgress) {
    return (
      <div style={styles.progressMsg} className="animate-fade-in">
        <span className="spinner spinner-sm" />
        <span style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>{message.text}</span>
      </div>
    );
  }

  return (
    <div
      style={{
        ...styles.messageRow,
        justifyContent: isUser ? "flex-end" : "flex-start",
      }}
      className="animate-fade-in"
    >
      {!isUser && (
        <div style={styles.avatar}>🎓</div>
      )}
      <div
        style={{
          ...styles.bubble,
          ...(isUser ? styles.userBubble : styles.agentBubble),
          ...(isError ? styles.errorBubble : {}),
          ...(isQuestion ? styles.questionBubble : {}),
        }}
      >
        {isQuestion && (
          <div style={styles.questionTag}>💬 Question • {message.remaining} remaining</div>
        )}
        <FormattedText text={message.text} />
      </div>
    </div>
  );
}

function FormattedText({ text }) {
  // Simple markdown-lite: bold with **text**
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <p style={{ margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i}>{part.slice(2, -2)}</strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </p>
  );
}

function TypingIndicator() {
  return (
    <div style={{ ...styles.messageRow, justifyContent: "flex-start" }}>
      <div style={styles.avatar}>🎓</div>
      <div style={{ ...styles.bubble, ...styles.agentBubble, padding: "12px 16px" }}>
        <div style={styles.dots}>
          {[0, 1, 2].map((i) => (
            <span key={i} style={{ ...styles.dot, animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    gap: 0,
  },
  stageBar: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 16px",
    background: "rgba(255,255,255,0.03)",
    borderBottom: "1px solid var(--border)",
    fontSize: "0.8rem",
    fontWeight: 600,
    color: "var(--text-secondary)",
    flexShrink: 0,
  },
  stageIcon: { fontSize: "1rem" },
  stageLabel: {},
  messages: {
    flex: 1,
    overflowY: "auto",
    padding: "20px 16px",
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  messageRow: {
    display: "flex",
    alignItems: "flex-end",
    gap: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    background: "linear-gradient(135deg, var(--color-primary), #9333ea)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.9rem",
    flexShrink: 0,
  },
  bubble: {
    maxWidth: "78%",
    padding: "12px 16px",
    borderRadius: 16,
    fontSize: "0.88rem",
    lineHeight: 1.7,
  },
  agentBubble: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid var(--border)",
    borderBottomLeftRadius: 4,
    color: "var(--text-primary)",
  },
  userBubble: {
    background: "linear-gradient(135deg, var(--color-primary), #9333ea)",
    color: "white",
    borderBottomRightRadius: 4,
    border: "none",
  },
  errorBubble: {
    background: "rgba(239, 68, 68, 0.1)",
    border: "1px solid rgba(239,68,68,0.3)",
    color: "#f87171",
  },
  questionBubble: {
    background: "rgba(6, 182, 212, 0.06)",
    border: "1px solid rgba(6,182,212,0.25)",
  },
  questionTag: {
    fontSize: "0.7rem",
    color: "var(--color-accent)",
    fontWeight: 600,
    marginBottom: 6,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  },
  progressMsg: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "4px 8px",
    opacity: 0.75,
  },
  inputArea: {
    padding: "14px 16px",
    borderTop: "1px solid var(--border)",
    display: "flex",
    gap: 10,
    alignItems: "flex-end",
    flexShrink: 0,
    background: "rgba(255,255,255,0.02)",
  },
  textarea: {
    flex: 1,
    resize: "none",
    minHeight: 60,
    maxHeight: 140,
    fontSize: "0.88rem",
  },
  sendBtn: {
    flexShrink: 0,
    alignSelf: "flex-end",
    height: 42,
    padding: "0 20px",
  },
  hint: {
    textAlign: "center",
    fontSize: "0.7rem",
    color: "var(--text-muted)",
    padding: "6px 0 10px",
    flexShrink: 0,
  },
  dots: {
    display: "flex",
    gap: 4,
    alignItems: "center",
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "var(--color-primary-light)",
    animation: "typing-dots 1.2s infinite",
    display: "inline-block",
  },
};
