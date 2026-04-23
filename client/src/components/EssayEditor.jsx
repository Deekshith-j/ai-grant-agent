import { useState } from "react";

export function EssayEditor({ essays }) {
  const [selected, setSelected] = useState(0);
  const [edited, setEdited] = useState({});

  if (!essays || essays.length === 0) {
    return (
      <div style={styles.empty}>
        <div style={styles.emptyIcon}>✍️</div>
        <h3>No Essays Yet</h3>
        <p>Essays will be generated automatically for your top 3 matching scholarships, or you can request one from any scholarship card.</p>
      </div>
    );
  }

  const essay = essays[selected];
  const currentText = edited[selected] ?? essay?.essay ?? "";

  function handleTextChange(val) {
    setEdited((prev) => ({ ...prev, [selected]: val }));
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(currentText);
  }

  function downloadEssay() {
    const blob = new Blob([currentText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `essay-${(essay.scholarship_title || "scholarship").replace(/\s+/g, "-").toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const hasReviewNeeded = currentText.includes("[REVIEW-NEEDED");
  const wordCount = currentText.trim().split(/\s+/).filter(Boolean).length;
  const isEdited = edited[selected] !== undefined && edited[selected] !== essay?.essay;

  return (
    <div style={styles.container}>
      {/* Tab selector */}
      <div style={styles.tabs}>
        {essays.map((e, i) => (
          <button
            key={i}
            id={`essay-tab-${i}`}
            style={{
              ...styles.tab,
              ...(selected === i ? styles.tabActive : {}),
            }}
            onClick={() => setSelected(i)}
          >
            <span style={styles.tabNum}>#{i + 1}</span>
            <span style={styles.tabTitle} className="truncate">{e.scholarship_title}</span>
            {e.needs_review && <span style={styles.reviewDot} title="Needs review">⚠️</span>}
          </button>
        ))}
      </div>

      {/* Essay metadata */}
      <div style={styles.meta} className="glass">
        <div style={styles.metaItem}>
          <span style={styles.metaLabel}>Scholarship</span>
          <span style={styles.metaValue}>{essay.scholarship_title}</span>
        </div>
        <div style={styles.metaItem}>
          <span style={styles.metaLabel}>Iterations</span>
          <span style={styles.metaValue}>{essay.iterations} / 3</span>
        </div>
        <div style={styles.metaItem}>
          <span style={styles.metaLabel}>Word Count</span>
          <span style={styles.metaValue}>{wordCount}</span>
        </div>
        <div style={styles.metaItem}>
          <span style={styles.metaLabel}>Status</span>
          {essay.needs_review ? (
            <span className="badge badge-warning">⚠️ Review Needed</span>
          ) : (
            <span className="badge badge-success">✅ Approved</span>
          )}
        </div>
        {isEdited && (
          <div style={styles.metaItem}>
            <span className="badge badge-accent">✏️ Edited</span>
          </div>
        )}
      </div>

      {/* Review banner */}
      {hasReviewNeeded && (
        <div style={styles.reviewBanner}>
          ⚠️ This essay has sections that need your attention — highlighted text requires manual review before submitting.
        </div>
      )}

      {/* Critique summary */}
      {essay.critiques && essay.critiques.length > 0 && (
        <CritiqueSummary critiques={essay.critiques} />
      )}

      {/* Editor */}
      <div style={styles.editorWrap}>
        <div style={styles.editorToolbar}>
          <span style={styles.editorTitle}>📝 Essay</span>
          <div style={styles.editorActions}>
            <button className="btn btn-ghost btn-sm" onClick={copyToClipboard}>
              📋 Copy
            </button>
            <button className="btn btn-secondary btn-sm" onClick={downloadEssay}>
              ⬇️ Download
            </button>
          </div>
        </div>
        <textarea
          id={`essay-editor-${selected}`}
          style={{
            ...styles.editor,
            background: hasReviewNeeded ? "rgba(249, 115, 22, 0.04)" : undefined,
            borderColor: hasReviewNeeded ? "rgba(249, 115, 22, 0.25)" : undefined,
          }}
          value={currentText}
          onChange={(e) => handleTextChange(e.target.value)}
          spellCheck
        />
        <div style={styles.editorFooter}>
          <span style={styles.wordCount}>{wordCount} words</span>
          {isEdited && (
            <button
              className="btn btn-ghost btn-sm"
              style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}
              onClick={() => setEdited((prev) => { const n = {...prev}; delete n[selected]; return n; })}
            >
              ↩️ Reset to original
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CritiqueSummary({ critiques }) {
  const [open, setOpen] = useState(false);
  const last = critiques[critiques.length - 1];

  return (
    <div style={styles.critiqueWrap} className="glass">
      <button style={styles.critiqueToggle} onClick={() => setOpen((p) => !p)}>
        <span>🔍 AI Critique Summary</span>
        <span>
          <strong style={{ color: last.overall_score >= 7 ? "var(--color-success)" : "var(--color-warning)" }}>
            {last.overall_score?.toFixed(1)}/10
          </strong> &nbsp;{open ? "▲" : "▼"}
        </span>
      </button>

      {open && (
        <div style={styles.critiqueContent} className="animate-fade-in">
          {critiques.map((c, i) => (
            <div key={i} style={styles.critiquePass}>
              <div style={styles.critiquePassHeader}>
                Pass {c.iteration} — Score: {c.overall_score?.toFixed(1)}/10
              </div>
              <div style={styles.scoreGrid}>
                {["clarity", "specificity", "alignment", "authenticity", "impact"].map((dim) => (
                  c[dim] != null && (
                    <div key={dim} style={styles.scoreDim}>
                      <span style={styles.dimLabel}>{dim}</span>
                      <div style={styles.dimBar}>
                        <div style={{
                          ...styles.dimFill,
                          width: `${(c[dim] / 10) * 100}%`,
                          background: c[dim] >= 7 ? "var(--color-success)" : c[dim] >= 5 ? "var(--color-warning)" : "var(--color-danger)",
                        }} />
                      </div>
                      <span style={styles.dimScore}>{c[dim]}</span>
                    </div>
                  )
                ))}
              </div>
              {c.weaknesses?.length > 0 && (
                <div style={styles.weaknesses}>
                  <strong style={{ fontSize: "0.75rem", color: "var(--color-warning)" }}>Weaknesses identified:</strong>
                  <ul style={styles.weakList}>
                    {c.weaknesses.map((w, j) => <li key={j}>{w}</li>)}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    padding: "24px",
    overflowY: "auto",
    height: "100%",
  },
  tabs: {
    display: "flex",
    gap: 6,
    flexWrap: "wrap",
  },
  tab: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 14px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-md)",
    cursor: "pointer",
    fontSize: "0.8rem",
    color: "var(--text-secondary)",
    maxWidth: 200,
    transition: "all 0.2s ease",
  },
  tabActive: {
    background: "var(--color-primary-glow)",
    borderColor: "var(--border-active)",
    color: "var(--color-primary-light)",
  },
  tabNum: { fontWeight: 700, flexShrink: 0, fontSize: "0.75rem" },
  tabTitle: { flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  reviewDot: { fontSize: "0.7rem", flexShrink: 0 },
  meta: {
    display: "flex",
    flexWrap: "wrap",
    gap: 20,
    padding: "14px 20px",
  },
  metaItem: { display: "flex", flexDirection: "column", gap: 4 },
  metaLabel: { fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.05em" },
  metaValue: { fontSize: "0.88rem", fontWeight: 600, color: "var(--text-primary)" },
  reviewBanner: {
    background: "rgba(249, 115, 22, 0.1)",
    border: "1px solid rgba(249, 115, 22, 0.3)",
    borderRadius: "var(--radius-sm)",
    padding: "10px 14px",
    fontSize: "0.82rem",
    color: "#fb923c",
  },
  critiqueWrap: {
    overflow: "hidden",
  },
  critiqueToggle: {
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    background: "none",
    border: "none",
    color: "var(--text-secondary)",
    fontSize: "0.83rem",
    cursor: "pointer",
    padding: "12px 16px",
    fontWeight: 600,
  },
  critiqueContent: {
    padding: "0 16px 16px",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  critiquePass: {
    borderTop: "1px solid var(--border)",
    paddingTop: 12,
  },
  critiquePassHeader: {
    fontSize: "0.78rem",
    fontWeight: 700,
    color: "var(--text-muted)",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  scoreGrid: { display: "flex", flexDirection: "column", gap: 5 },
  scoreDim: { display: "flex", alignItems: "center", gap: 8 },
  dimLabel: { fontSize: "0.72rem", color: "var(--text-muted)", width: 80, flexShrink: 0, textTransform: "capitalize" },
  dimBar: { flex: 1, height: 5, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" },
  dimFill: { height: "100%", borderRadius: 3, transition: "width 0.5s ease" },
  dimScore: { fontSize: "0.72rem", color: "var(--text-secondary)", width: 16, textAlign: "right", flexShrink: 0 },
  weaknesses: { marginTop: 10, display: "flex", flexDirection: "column", gap: 4 },
  weakList: { paddingLeft: 16, fontSize: "0.78rem", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: 2 },
  editorWrap: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)",
    overflow: "hidden",
    minHeight: 300,
  },
  editorToolbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 16px",
    borderBottom: "1px solid var(--border)",
    background: "rgba(255,255,255,0.02)",
  },
  editorTitle: { fontSize: "0.83rem", fontWeight: 600, color: "var(--text-secondary)" },
  editorActions: { display: "flex", gap: 6 },
  editor: {
    flex: 1,
    background: "transparent",
    border: "none",
    color: "var(--text-primary)",
    fontFamily: "'Inter', sans-serif",
    fontSize: "0.9rem",
    lineHeight: 1.8,
    padding: "20px 24px",
    resize: "none",
    outline: "none",
    minHeight: 300,
  },
  editorFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 16px",
    borderTop: "1px solid var(--border)",
    background: "rgba(255,255,255,0.02)",
  },
  wordCount: { fontSize: "0.75rem", color: "var(--text-muted)" },
  empty: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    height: "100%",
    color: "var(--text-muted)",
    textAlign: "center",
    padding: 40,
  },
  emptyIcon: { fontSize: 48 },
};
