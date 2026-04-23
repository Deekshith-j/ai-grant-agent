import { useState } from "react";

export function ScholarshipCards({ scholarships, sessionId }) {
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("score");
  const [expanded, setExpanded] = useState(null);
  const [generatingEssay, setGeneratingEssay] = useState(null);

  if (!scholarships || scholarships.length === 0) {
    return (
      <div style={styles.empty}>
        <div style={styles.emptyIcon}>🔍</div>
        <h3>No Scholarships Yet</h3>
        <p>Complete your profile in the chat to discover matching scholarships.</p>
      </div>
    );
  }

  async function requestEssay(index) {
    setGeneratingEssay(index);
    try {
      await fetch(`/api/sessions/${sessionId}/essay/${index}`, {
        method: "POST",
      });
      // Essay will arrive via SSE
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => setGeneratingEssay(null), 2000);
    }
  }

  const scoreColor = (score) => {
    if (score >= 75) return "var(--color-success)";
    if (score >= 50) return "var(--color-warning)";
    return "var(--color-danger)";
  };

  const priorityLabel = (score) => {
    if (score >= 75) return { label: "Top Match", cls: "badge-success" };
    if (score >= 50) return { label: "Good Match", cls: "badge-warning" };
    return { label: "Fair Match", cls: "badge-muted" };
  };

  const deadlineUrgency = (deadline) => {
    if (!deadline || deadline === "Unknown") return { label: "Unknown", cls: "badge-muted", days: null };
    const d = new Date(deadline);
    if (isNaN(d)) return { label: "Unknown", cls: "badge-muted", days: null };
    const days = Math.ceil((d - new Date()) / 86400000);
    if (days < 0) return { label: "Expired", cls: "badge-danger", days };
    if (days <= 7) return { label: `${days}d left`, cls: "badge-danger", days };
    if (days <= 30) return { label: `${days}d left`, cls: "badge-warning", days };
    if (days <= 90) return { label: `${days}d left`, cls: "badge-accent", days };
    return { label: `${days}d left`, cls: "badge-muted", days };
  };

  const filters = ["all", "top", "medium", "low"];
  const filtered = scholarships.filter((s) => {
    if (filter === "top") return s.match_score >= 75;
    if (filter === "medium") return s.match_score >= 50 && s.match_score < 75;
    if (filter === "low") return s.match_score < 50;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "score") return b.match_score - a.match_score;
    if (sortBy === "deadline") {
      const da = new Date(a.deadline), db = new Date(b.deadline);
      if (isNaN(da)) return 1;
      if (isNaN(db)) return -1;
      return da - db;
    }
    return 0;
  });

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Matched Scholarships</h2>
          <p style={styles.subtitle}>{scholarships.length} scholarships found and scored</p>
        </div>
        <div style={styles.controls}>
          <select
            className="input"
            style={styles.select}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="score">Sort: Best Match</option>
            <option value="deadline">Sort: Deadline</option>
          </select>
        </div>
      </div>

      {/* Filter pills */}
      <div style={styles.filterRow}>
        {filters.map((f) => (
          <button
            key={f}
            className={`btn btn-sm ${filter === f ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setFilter(f)}
          >
            {f === "all" ? `All (${scholarships.length})` :
             f === "top" ? `🏆 Top (${scholarships.filter(s => s.match_score >= 75).length})` :
             f === "medium" ? `⚡ Good (${scholarships.filter(s => s.match_score >= 50 && s.match_score < 75).length})` :
             `📋 Fair (${scholarships.filter(s => s.match_score < 50).length})`}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div style={styles.grid}>
        {sorted.map((s, i) => {
          const urgency = deadlineUrgency(s.deadline);
          const priority = priorityLabel(s.match_score);
          const isExpanded = expanded === i;

          return (
            <div
              key={i}
              style={styles.card}
              className="glass animate-fade-in"
            >
              {/* Score ring */}
              <div style={styles.cardTop}>
                <div style={styles.scoreRing}>
                  <ScoreRing score={s.match_score} color={scoreColor(s.match_score)} />
                </div>
                <div style={styles.cardMeta}>
                  <span className={`badge ${priority.cls}`}>{priority.label}</span>
                  <span className={`badge ${urgency.cls}`}>⏰ {urgency.label}</span>
                </div>
              </div>

              <h3 style={styles.cardTitle}>{s.title}</h3>
              <p style={styles.cardProvider}>by {s.provider || "Unknown"}</p>

              <p style={styles.cardReason}>{s.reason}</p>

              {isExpanded && (
                <div style={styles.expanded} className="animate-fade-in">
                  <div style={styles.expandRow}>
                    <span style={styles.expandLabel}>Eligibility</span>
                    <span style={styles.expandValue}>{s.eligibility || "See application page"}</span>
                  </div>
                  <div style={styles.expandRow}>
                    <span style={styles.expandLabel}>Deadline</span>
                    <span style={styles.expandValue}>{s.deadline || "Unknown"}</span>
                  </div>
                </div>
              )}

              <button
                style={styles.expandToggle}
                onClick={() => setExpanded(isExpanded ? null : i)}
              >
                {isExpanded ? "▲ Less" : "▼ More details"}
              </button>

              {/* Actions */}
              <div style={styles.cardActions}>
                <a
                  href={s.application_link}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-accent btn-sm"
                  style={{ flex: 1, textAlign: "center", justifyContent: "center" }}
                >
                  🔗 Apply Now
                </a>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ flex: 1 }}
                  onClick={() => requestEssay(scholarships.indexOf(s))}
                  disabled={generatingEssay !== null}
                  id={`essay-btn-${i}`}
                >
                  {generatingEssay === scholarships.indexOf(s) ? (
                    <><span className="spinner spinner-sm" /> Generating...</>
                  ) : "✍️ Write Essay"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {sorted.length === 0 && (
        <div style={styles.noFilter}>
          No scholarships match this filter.
        </div>
      )}
    </div>
  );
}

function ScoreRing({ score, color }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const fill = ((score || 0) / 100) * circ;

  return (
    <div style={styles.ringWrap}>
      <svg width={70} height={70} viewBox="0 0 70 70">
        <circle cx={35} cy={35} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} />
        <circle
          cx={35} cy={35} r={r}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeDasharray={`${fill} ${circ - fill}`}
          strokeDashoffset={circ / 4}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1s ease", filter: `drop-shadow(0 0 6px ${color})` }}
        />
      </svg>
      <div style={styles.ringLabel}>
        <span style={{ fontSize: "0.95rem", fontWeight: 700, color }}>{score}%</span>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
    padding: "24px",
    overflowY: "auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  title: { margin: 0, fontSize: "1.3rem" },
  subtitle: { margin: 0, fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 4 },
  controls: { flexShrink: 0 },
  select: { padding: "7px 12px", fontSize: "0.82rem", width: "auto" },
  filterRow: { display: "flex", gap: 8, flexWrap: "wrap" },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: 16,
  },
  card: {
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
    cursor: "default",
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  scoreRing: { flexShrink: 0 },
  cardMeta: {
    display: "flex",
    flexDirection: "column",
    gap: 5,
    alignItems: "flex-end",
  },
  cardTitle: {
    fontSize: "0.95rem",
    fontWeight: 700,
    lineHeight: 1.3,
    margin: 0,
    color: "var(--text-primary)",
  },
  cardProvider: {
    fontSize: "0.78rem",
    color: "var(--text-muted)",
    margin: 0,
  },
  cardReason: {
    fontSize: "0.8rem",
    color: "var(--text-secondary)",
    margin: 0,
    lineHeight: 1.5,
  },
  expanded: {
    borderTop: "1px solid var(--border)",
    paddingTop: 10,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  expandRow: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  expandLabel: { fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.05em" },
  expandValue: { fontSize: "0.82rem", color: "var(--text-secondary)" },
  expandToggle: {
    background: "none",
    border: "none",
    color: "var(--color-primary-light)",
    fontSize: "0.75rem",
    cursor: "pointer",
    padding: 0,
    textAlign: "left",
  },
  cardActions: { display: "flex", gap: 8, marginTop: 4 },
  ringWrap: { position: "relative", width: 70, height: 70 },
  ringLabel: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
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
  noFilter: {
    textAlign: "center",
    color: "var(--text-muted)",
    padding: "32px 16px",
    fontSize: "0.85rem",
  },
};
