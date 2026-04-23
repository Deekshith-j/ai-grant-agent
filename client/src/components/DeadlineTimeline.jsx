export function DeadlineTimeline({ deadlines, sessionId }) {
  if (!deadlines || deadlines.length === 0) {
    return (
      <div style={styles.empty}>
        <div style={styles.emptyIcon}>📅</div>
        <h3>No Deadlines Yet</h3>
        <p>Deadlines will appear here once scholarships are matched and scored.</p>
      </div>
    );
  }

  function downloadICS() {
    window.open(`/api/sessions/${sessionId}/calendar.ics`, "_blank");
  }

  const priorityConfig = {
    Critical: { color: "var(--color-danger)", icon: "🔴", badge: "badge-danger" },
    High: { color: "var(--color-warning)", icon: "🟠", badge: "badge-warning" },
    Medium: { color: "var(--color-accent)", icon: "🔵", badge: "badge-accent" },
    Low: { color: "var(--color-success)", icon: "🟢", badge: "badge-success" },
  };

  const grouped = deadlines.reduce((acc, d) => {
    const p = d.priority || "Medium";
    if (!acc[p]) acc[p] = [];
    acc[p].push(d);
    return acc;
  }, {});

  const order = ["Critical", "High", "Medium", "Low"];

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Deadline Timeline</h2>
          <p style={styles.subtitle}>{deadlines.length} upcoming deadlines · sorted by urgency</p>
        </div>
        <button
          id="download-ics-btn"
          className="btn btn-primary btn-sm"
          onClick={downloadICS}
        >
          📅 Export to Calendar (.ics)
        </button>
      </div>

      {/* Stats row */}
      <div style={styles.statsRow}>
        {order.map((p) => (
          grouped[p] && (
            <div key={p} style={styles.statCard} className="glass">
              <span style={{ fontSize: "1.4rem" }}>{priorityConfig[p].icon}</span>
              <span style={{ fontSize: "1.4rem", fontWeight: 700, color: priorityConfig[p].color }}>
                {grouped[p].length}
              </span>
              <span style={styles.statLabel}>{p}</span>
            </div>
          )
        ))}
      </div>

      {/* Timeline groups */}
      <div style={styles.timeline}>
        {order.map((priority) => {
          const items = grouped[priority];
          if (!items) return null;
          const cfg = priorityConfig[priority];

          return (
            <div key={priority} style={styles.group}>
              <div style={styles.groupHeader}>
                <span>{cfg.icon}</span>
                <span style={{ color: cfg.color, fontWeight: 700, fontSize: "0.88rem" }}>
                  {priority} Priority
                </span>
                <span className={`badge ${cfg.badge}`}>{items.length}</span>
              </div>

              {items.map((d, i) => (
                <DeadlineCard key={i} item={d} cfg={cfg} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DeadlineCard({ item, cfg }) {
  const days = item.days_remaining;
  const deadlineDate = item.deadline ? new Date(item.deadline) : null;
  const formattedDate = deadlineDate && !isNaN(deadlineDate)
    ? deadlineDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })
    : "Unknown";

  return (
    <div style={styles.card} className="glass animate-fade-in">
      {/* Left accent bar */}
      <div style={{ ...styles.accentBar, background: cfg.color }} />

      <div style={styles.cardContent}>
        {/* Top row */}
        <div style={styles.cardTop}>
          <div style={styles.cardInfo}>
            <h3 style={styles.cardTitle}>{item.scholarship_title}</h3>
            <p style={styles.cardProvider}>{item.provider}</p>
          </div>
          <div style={styles.cardRight}>
            <div style={{ color: cfg.color, fontWeight: 800, fontSize: "1.4rem", lineHeight: 1 }}>
              {days != null ? days : "?"}
              <span style={{ fontSize: "0.65rem", fontWeight: 400, color: "var(--text-muted)", display: "block", textAlign: "center" }}>days</span>
            </div>
          </div>
        </div>

        {/* Date */}
        <div style={styles.dateRow}>
          <span style={styles.dateClock}>🗓</span>
          <span style={styles.dateText}>{formattedDate}</span>
        </div>

        {/* Progress to deadline */}
        {days != null && days >= 0 && (
          <div style={styles.timeProgress}>
            <div style={styles.progressTrack}>
              <div style={{
                ...styles.progressFill,
                width: `${Math.max(0, Math.min(100, 100 - (days / 180) * 100))}%`,
                background: cfg.color,
              }} />
            </div>
          </div>
        )}

        {/* Reminders */}
        {item.reminders && item.reminders.length > 0 && (
          <div style={styles.reminders}>
            <span style={styles.remindersLabel}>⏰ Reminders:</span>
            {item.reminders.map((r, i) => {
              const d = new Date(r);
              return (
                <span key={i} className="badge badge-muted">
                  {isNaN(d) ? r : d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              );
            })}
          </div>
        )}

        {/* Task list */}
        {item.tasks && item.tasks.length > 0 && (
          <div style={styles.tasks}>
            <span style={styles.tasksLabel}>📋 Application tasks:</span>
            <div style={styles.taskChips}>
              {item.tasks.map((task, i) => (
                <span key={i} style={styles.taskChip}>• {task}</span>
              ))}
            </div>
          </div>
        )}

        {/* Apply link */}
        {item.application_link && (
          <a
            href={item.application_link}
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary btn-sm"
            style={{ alignSelf: "flex-start", marginTop: 4 }}
          >
            🔗 Open Application
          </a>
        )}
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
  statsRow: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
  },
  statCard: {
    flex: 1,
    minWidth: 90,
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
    textAlign: "center",
  },
  statLabel: { fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.04em" },
  timeline: { display: "flex", flexDirection: "column", gap: 24 },
  group: { display: "flex", flexDirection: "column", gap: 10 },
  groupHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "0 4px",
  },
  card: {
    display: "flex",
    overflow: "hidden",
  },
  accentBar: { width: 4, flexShrink: 0 },
  cardContent: {
    flex: 1,
    padding: "16px 20px",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  cardInfo: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: "0.95rem", margin: 0, fontWeight: 700, lineHeight: 1.3 },
  cardProvider: { fontSize: "0.76rem", color: "var(--text-muted)", margin: 0, marginTop: 3 },
  cardRight: {
    flexShrink: 0,
    textAlign: "center",
  },
  dateRow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  dateClock: { fontSize: "0.9rem" },
  dateText: { fontSize: "0.82rem", color: "var(--text-secondary)", fontWeight: 500 },
  timeProgress: {},
  progressTrack: {
    height: 4,
    background: "rgba(255,255,255,0.06)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 2, transition: "width 1s ease" },
  reminders: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  remindersLabel: { fontSize: "0.73rem", color: "var(--text-muted)" },
  tasks: {
    display: "flex",
    flexDirection: "column",
    gap: 5,
  },
  tasksLabel: { fontSize: "0.73rem", color: "var(--text-muted)", fontWeight: 600 },
  taskChips: {
    display: "flex",
    flexDirection: "column",
    gap: 3,
  },
  taskChip: { fontSize: "0.78rem", color: "var(--text-secondary)" },
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
