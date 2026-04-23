import { useState } from "react";

const API_BASE = "/api";

export function ApiKeySetup({ onComplete }) {
  const [geminiKey, setGeminiKey] = useState("");
  const [serperKey, setSerperKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showGemini, setShowGemini] = useState(false);
  const [showSerper, setShowSerper] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!geminiKey.trim()) {
      setError("Gemini API key is required.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/init`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          geminiKey: geminiKey.trim(),
          serperKey: serperKey.trim() || "MOCK",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Initialization failed");

      sessionStorage.setItem("geminiKey", geminiKey.trim());
      onComplete({ mockSearch: data.mockSearch });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal} className="glass animate-bounce-in">
        {/* Logo */}
        <div style={styles.logoRow}>
          <div style={styles.logoIcon}>🎓</div>
          <div>
            <h1 style={styles.logoTitle}>ScholarAI</h1>
            <p style={styles.logoSub}>Autonomous Grant & Scholarship Hunter</p>
          </div>
        </div>

        <div style={styles.divider} />

        <h2 style={styles.heading}>Connect Your API Keys</h2>
        <p style={styles.subtext}>
          Your keys are stored only for this session and never sent anywhere except their respective APIs.
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Gemini Key */}
          <div style={styles.field}>
            <label style={styles.label}>
              <span style={styles.labelIcon}>✦</span> Google Gemini API Key
              <span style={styles.required}>*</span>
            </label>
            <p style={styles.hint}>
              Get yours free at{" "}
              <a href="https://aistudio.google.com" target="_blank" rel="noreferrer">
                aistudio.google.com
              </a>
            </p>
            <div style={styles.inputWrap}>
              <input
                id="gemini-key-input"
                className="input"
                type={showGemini ? "text" : "password"}
                placeholder="AIza..."
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                required
                autoComplete="off"
              />
              <button
                type="button"
                style={styles.eyeBtn}
                onClick={() => setShowGemini((p) => !p)}
              >
                {showGemini ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {/* Serper Key */}
          <div style={styles.field}>
            <label style={styles.label}>
              <span style={styles.labelAccent}>⚡</span> Serper API Key
              <span style={styles.optional}> (optional)</span>
            </label>
            <p style={styles.hint}>
              Real-time Google Search — get free at{" "}
              <a href="https://serper.dev" target="_blank" rel="noreferrer">
                serper.dev
              </a>
              . Leave empty to use mock data for testing.
            </p>
            <div style={styles.inputWrap}>
              <input
                id="serper-key-input"
                className="input"
                type={showSerper ? "text" : "password"}
                placeholder="Leave empty for mock search mode"
                value={serperKey}
                onChange={(e) => setSerperKey(e.target.value)}
                autoComplete="off"
              />
              <button
                type="button"
                style={styles.eyeBtn}
                onClick={() => setShowSerper((p) => !p)}
              >
                {showSerper ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {error && (
            <div style={styles.errorBox}>
              ⚠️ {error}
            </div>
          )}

          <button
            id="start-btn"
            type="submit"
            className="btn btn-primary btn-lg w-full"
            disabled={loading}
            style={{ marginTop: 8 }}
          >
            {loading ? (
              <>
                <span className="spinner spinner-sm" /> Connecting...
              </>
            ) : (
              <>🚀 Start Scholarship Hunt</>
            )}
          </button>
        </form>

        <p style={styles.footer}>
          🔒 Keys are session-only · Never stored · Never logged
        </p>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(7, 7, 15, 0.85)",
    backdropFilter: "blur(12px)",
    zIndex: 1000,
    padding: "20px",
  },
  modal: {
    width: "100%",
    maxWidth: 480,
    padding: "32px",
  },
  logoRow: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    marginBottom: 20,
  },
  logoIcon: {
    fontSize: 40,
    lineHeight: 1,
  },
  logoTitle: {
    fontFamily: "var(--font-display)",
    fontSize: "1.6rem",
    margin: 0,
    background: "linear-gradient(135deg, #a78bfa, #06b6d4)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  logoSub: {
    color: "var(--text-muted)",
    fontSize: "0.78rem",
    margin: 0,
  },
  divider: {
    height: 1,
    background: "var(--border)",
    margin: "0 0 24px",
  },
  heading: {
    fontSize: "1.2rem",
    marginBottom: 8,
    fontFamily: "var(--font-display)",
  },
  subtext: {
    fontSize: "0.83rem",
    color: "var(--text-muted)",
    marginBottom: 24,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  label: {
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "var(--text-primary)",
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  labelIcon: {
    color: "var(--color-primary-light)",
    fontSize: "0.75rem",
  },
  labelAccent: {
    color: "var(--color-accent)",
    fontSize: "0.75rem",
  },
  required: {
    color: "var(--color-danger)",
    marginLeft: 2,
  },
  optional: {
    color: "var(--text-muted)",
    fontWeight: 400,
    fontSize: "0.78rem",
  },
  hint: {
    fontSize: "0.76rem",
    color: "var(--text-muted)",
    margin: 0,
  },
  inputWrap: {
    position: "relative",
  },
  eyeBtn: {
    position: "absolute",
    right: 12,
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: 16,
    padding: "2px 4px",
  },
  errorBox: {
    background: "rgba(239, 68, 68, 0.12)",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    borderRadius: "var(--radius-sm)",
    padding: "10px 14px",
    fontSize: "0.83rem",
    color: "#f87171",
  },
  footer: {
    textAlign: "center",
    fontSize: "0.73rem",
    color: "var(--text-muted)",
    marginTop: 20,
    margin: "20px 0 0",
  },
};
