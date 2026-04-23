import { useState } from "react";

const FIELD_LABELS = {
  name: "Full Name",
  nationality: "Nationality",
  field_of_study: "Field of Study",
  education_level: "Education Level",
  GPA: "GPA (4.0 scale)",
  skills: "Skills",
  projects: "Projects",
  financial_need: "Financial Need",
  preferred_country: "Preferred Country",
  career_stage: "Career Stage",
};

const FIELD_TYPES = {
  GPA: "number",
  financial_need: "boolean",
  skills: "array",
  projects: "array",
};

export function ProfileDashboard({ profile, sessionId, onProfileUpdate }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);

  function startEdit() {
    setDraft(JSON.parse(JSON.stringify(profile)));
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setDraft(null);
  }

  function updateField(key, value) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  async function saveAndRetry() {
    setSaving(true);
    try {
      await fetch(`/api/sessions/${sessionId}/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: draft }),
      });
      onProfileUpdate?.(draft);
      setEditing(false);
      setDraft(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  if (!profile || Object.keys(profile).length === 0) {
    return (
      <div style={styles.empty}>
        <div style={styles.emptyIcon}>📋</div>
        <h3>No Profile Yet</h3>
        <p>Start chatting to build your student profile.</p>
      </div>
    );
  }

  const displayProfile = editing ? draft : profile;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Student Profile</h2>
          <p style={styles.subtitle}>Your extracted academic profile</p>
        </div>
        <div style={styles.actions}>
          {editing ? (
            <>
              <button className="btn btn-ghost btn-sm" onClick={cancelEdit} disabled={saving}>
                Cancel
              </button>
              <button className="btn btn-primary btn-sm" onClick={saveAndRetry} disabled={saving}>
                {saving ? <><span className="spinner spinner-sm" /> Saving...</> : "💾 Save & Re-run"}
              </button>
            </>
          ) : (
            <button id="edit-profile-btn" className="btn btn-secondary btn-sm" onClick={startEdit}>
              ✏️ Edit Profile
            </button>
          )}
        </div>
      </div>

      {editing && (
        <div style={styles.editBanner}>
          ✏️ Edit mode — changes will trigger a new scholarship search.
        </div>
      )}

      <div style={styles.grid}>
        {Object.entries(FIELD_LABELS).map(([key, label]) => {
          const value = displayProfile?.[key];
          const type = FIELD_TYPES[key];

          return (
            <ProfileField
              key={key}
              fieldKey={key}
              label={label}
              value={value}
              type={type}
              editing={editing}
              onChange={(v) => updateField(key, v)}
            />
          );
        })}
      </div>

      {/* Completeness indicator */}
      <ProfileCompleteness profile={displayProfile} />
    </div>
  );
}

function ProfileField({ fieldKey, label, value, type, editing, onChange }) {
  const isEmpty = value === null || value === undefined || value === "";

  function renderValue() {
    if (type === "boolean") {
      if (editing) {
        return (
          <select
            className="input"
            style={styles.fieldInput}
            value={value ? "yes" : "no"}
            onChange={(e) => onChange(e.target.value === "yes")}
          >
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        );
      }
      return (
        <span className={`badge ${value ? "badge-success" : "badge-muted"}`}>
          {value ? "✓ Yes" : "✗ No"}
        </span>
      );
    }

    if (type === "array") {
      if (editing) {
        return (
          <input
            className="input"
            style={styles.fieldInput}
            type="text"
            value={Array.isArray(value) ? value.join(", ") : (value || "")}
            onChange={(e) => onChange(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
            placeholder="Comma-separated..."
          />
        );
      }
      if (!value || (Array.isArray(value) && value.length === 0)) {
        return <span style={styles.emptyValue}>Not specified</span>;
      }
      return (
        <div style={styles.tags}>
          {(Array.isArray(value) ? value : [value]).map((tag, i) => (
            <span key={i} className="badge badge-primary">{tag}</span>
          ))}
        </div>
      );
    }

    if (type === "number") {
      if (editing) {
        return (
          <input
            className="input"
            style={styles.fieldInput}
            type="number"
            step="0.01"
            min="0"
            max="4.0"
            value={value || ""}
            onChange={(e) => onChange(parseFloat(e.target.value) || null)}
          />
        );
      }
      return (
        <div style={styles.gpaRow}>
          <span style={styles.gpaValue}>{value ?? "—"}</span>
          {value && (
            <div style={styles.gpaBar}>
              <div
                style={{
                  ...styles.gpaFill,
                  width: `${Math.min((value / 4.0) * 100, 100)}%`,
                  background: value >= 3.5 ? "var(--color-success)" : value >= 2.5 ? "var(--color-warning)" : "var(--color-danger)",
                }}
              />
            </div>
          )}
        </div>
      );
    }

    // String field
    if (editing) {
      return (
        <input
          className="input"
          style={styles.fieldInput}
          type="text"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    }

    return (
      <span style={isEmpty ? styles.emptyValue : styles.fieldValue}>
        {isEmpty ? "Not specified" : value}
      </span>
    );
  }

  return (
    <div style={{ ...styles.fieldCard, ...(isEmpty && !editing ? styles.fieldCardEmpty : {}) }} className="glass">
      <div style={styles.fieldLabel}>{label}</div>
      <div style={styles.fieldContent}>{renderValue()}</div>
    </div>
  );
}

function ProfileCompleteness({ profile }) {
  const keys = Object.keys(FIELD_LABELS);
  const filled = keys.filter((k) => {
    const v = profile?.[k];
    if (Array.isArray(v)) return v.length > 0;
    return v !== null && v !== undefined && v !== "";
  });
  const pct = Math.round((filled.length / keys.length) * 100);

  return (
    <div style={styles.completeness} className="glass">
      <div style={styles.completenessRow}>
        <span style={styles.completenessLabel}>Profile Completeness</span>
        <span style={{
          ...styles.completenessPct,
          color: pct >= 80 ? "var(--color-success)" : pct >= 50 ? "var(--color-warning)" : "var(--color-danger)",
        }}>
          {pct}%
        </span>
      </div>
      <div className="progress-bar">
        <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <p style={styles.completenessHint}>
        {pct === 100 ? "✅ Perfect! All fields filled." : `${keys.length - filled.length} fields missing — more detail = better matches.`}
      </p>
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
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  title: { margin: 0, fontSize: "1.3rem" },
  subtitle: { margin: 0, fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 4 },
  actions: { display: "flex", gap: 8, flexShrink: 0 },
  editBanner: {
    background: "rgba(124, 58, 237, 0.1)",
    border: "1px solid rgba(124, 58, 237, 0.3)",
    borderRadius: "var(--radius-sm)",
    padding: "8px 14px",
    fontSize: "0.82rem",
    color: "var(--color-primary-light)",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: 12,
  },
  fieldCard: {
    padding: "14px 16px",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    transition: "all 0.2s ease",
  },
  fieldCardEmpty: { opacity: 0.5 },
  fieldLabel: {
    fontSize: "0.72rem",
    fontWeight: 600,
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  fieldContent: { minHeight: 28, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6 },
  fieldValue: { fontSize: "0.88rem", fontWeight: 500, color: "var(--text-primary)" },
  emptyValue: { fontSize: "0.82rem", color: "var(--text-muted)", fontStyle: "italic" },
  fieldInput: { padding: "6px 10px", fontSize: "0.85rem" },
  tags: { display: "flex", flexWrap: "wrap", gap: 4 },
  gpaRow: { display: "flex", alignItems: "center", gap: 10, width: "100%" },
  gpaValue: { fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", minWidth: 32 },
  gpaBar: { flex: 1, height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" },
  gpaFill: { height: "100%", borderRadius: 3, transition: "width 0.5s ease" },
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
  completeness: {
    padding: "16px 20px",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  completenessRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  completenessLabel: { fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)" },
  completenessPct: { fontSize: "1rem", fontWeight: 700 },
  completenessHint: { fontSize: "0.76rem", margin: 0, color: "var(--text-muted)" },
};
