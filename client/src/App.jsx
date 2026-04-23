import { useState, useEffect } from "react";
import { ApiKeySetup } from "./components/ApiKeySetup.jsx";
import { ChatInterface } from "./components/ChatInterface.jsx";
import { ProfileDashboard } from "./components/ProfileDashboard.jsx";
import { ScholarshipCards } from "./components/ScholarshipCards.jsx";
import { EssayEditor } from "./components/EssayEditor.jsx";
import { DeadlineTimeline } from "./components/DeadlineTimeline.jsx";

const TABS = [
  { id: "chat",        label: "💬 Chat",         icon: "💬" },
  { id: "profile",     label: "👤 Profile",      icon: "👤" },
  { id: "scholarships",label: "🏆 Scholarships", icon: "🏆" },
  { id: "essays",      label: "✍️ Essays",        icon: "✍️" },
  { id: "timeline",    label: "📅 Timeline",      icon: "📅" },
];

export default function App() {
  const [initialized, setInitialized] = useState(false);
  const [mockSearch, setMockSearch] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [activeTab, setActiveTab] = useState("chat");

  // Session state
  const [profile, setProfile] = useState({});
  const [scholarships, setScholarships] = useState([]);
  const [essays, setEssays] = useState([]);
  const [deadlines, setDeadlines] = useState([]);

  // Notification dots
  const [notify, setNotify] = useState({});

  // Create a session on init
  async function handleInit(config) {
    const res = await fetch("/api/sessions", { method: "POST" });
    const { sessionId: sid } = await res.json();
    setSessionId(sid);
    setMockSearch(config.mockSearch);
    setInitialized(true);
  }

  function handleSessionUpdate(updates) {
    if (updates.profile) setProfile(updates.profile);
    if (updates.scholarships) {
      setScholarships(updates.scholarships);
      if (activeTab !== "scholarships") setNotify((n) => ({ ...n, scholarships: true }));
    }
    if (updates.essays) {
      setEssays(updates.essays);
      if (activeTab !== "essays") setNotify((n) => ({ ...n, essays: true }));
    }
    if (updates.deadlines) {
      setDeadlines(updates.deadlines);
      if (activeTab !== "timeline") setNotify((n) => ({ ...n, timeline: true }));
    }
  }

  function switchTab(tab) {
    setActiveTab(tab);
    setNotify((n) => ({ ...n, [tab]: false }));
  }

  const tabBadges = {
    scholarships: scholarships.length,
    essays: essays.length,
    timeline: deadlines.length,
  };

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch("/api/init", { method: "POST" });
        const config = await res.json();
        
        const sessRes = await fetch("/api/sessions", { method: "POST" });
        const { sessionId: sid } = await sessRes.json();
        
        setSessionId(sid);
        setMockSearch(config.mockSearch);
        setInitialized(true);
      } catch (err) {
        console.error("Failed to initialize session", err);
      }
    }
    init();
  }, []);

  if (!initialized) {
    return <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>Initializing ScholarAI agent session...</div>;
  }

  return (
    <div style={styles.app}>
      {/* ── Sidebar ───────────────────────────────── */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarLogo}>
          <div style={styles.logoMark}>🎓</div>
          <div>
            <div style={styles.logoName}>ScholarAI</div>
            <div style={styles.logoTagline}>Grant Hunter</div>
          </div>
        </div>

        {mockSearch && (
          <div style={styles.mockBadge}>
            🔮 Mock Search Mode
          </div>
        )}

        <nav style={styles.nav}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const hasNotif = notify[tab.id];
            const badge = tabBadges[tab.id];

            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                style={{
                  ...styles.navItem,
                  ...(isActive ? styles.navItemActive : {}),
                }}
                onClick={() => switchTab(tab.id)}
              >
                <span style={styles.navIcon}>{tab.icon}</span>
                <span style={styles.navLabel}>
                  {tab.id === "scholarships" ? "Scholarships" :
                   tab.id === "essays" ? "Essays" :
                   tab.id === "timeline" ? "Timeline" :
                   tab.id === "profile" ? "Profile" : "Chat"}
                </span>
                <div style={styles.navRight}>
                  {badge > 0 && (
                    <span style={{
                      ...styles.countBadge,
                      background: isActive ? "rgba(255,255,255,0.2)" : "var(--color-primary-glow)",
                      color: isActive ? "white" : "var(--color-primary-light)",
                    }}>
                      {badge}
                    </span>
                  )}
                  {hasNotif && <span style={styles.notifDot} />}
                </div>
              </button>
            );
          })}
        </nav>

        {/* Pipeline status */}
        <div style={styles.pipelineStatus}>
          <div style={styles.pipelineTitle}>Pipeline Status</div>
          {[
            { label: "Profile", done: Object.keys(profile).length > 0 },
            { label: "Search", done: scholarships.length > 0 },
            { label: "Scoring", done: scholarships.length > 0 },
            { label: "Essays", done: essays.length > 0 },
            { label: "Deadlines", done: deadlines.length > 0 },
          ].map((step) => (
            <div key={step.label} style={styles.pipelineStep}>
              <span style={{
                ...styles.pipelineDot,
                background: step.done ? "var(--color-success)" : "rgba(255,255,255,0.1)",
                boxShadow: step.done ? "0 0 8px var(--color-success)" : "none",
              }} />
              <span style={{
                ...styles.pipelineStepLabel,
                color: step.done ? "var(--text-primary)" : "var(--text-muted)",
              }}>
                {step.label}
              </span>
              {step.done && <span style={styles.pipelineCheck}>✓</span>}
            </div>
          ))}
        </div>
      </aside>

      {/* ── Main content ──────────────────────────── */}
      <main style={styles.main}>
        {/* Tab header */}
        <div style={styles.tabHeader}>
          <h2 style={styles.tabTitle}>
            {TABS.find((t) => t.id === activeTab)?.label}
          </h2>
          {activeTab === "scholarships" && scholarships.length > 0 && (
            <span className="badge badge-success">{scholarships.length} matches</span>
          )}
          {activeTab === "essays" && essays.length > 0 && (
            <span className="badge badge-accent">{essays.length} essays ready</span>
          )}
        </div>

        {/* Tab content */}
        <div style={styles.tabContent}>
          {activeTab === "chat" && (
            <ChatInterface
              sessionId={sessionId}
              onSessionUpdate={handleSessionUpdate}
            />
          )}
          {activeTab === "profile" && (
            <ProfileDashboard
              profile={profile}
              sessionId={sessionId}
              onProfileUpdate={(p) => setProfile(p)}
            />
          )}
          {activeTab === "scholarships" && (
            <ScholarshipCards
              scholarships={scholarships}
              sessionId={sessionId}
            />
          )}
          {activeTab === "essays" && (
            <EssayEditor essays={essays} />
          )}
          {activeTab === "timeline" && (
            <DeadlineTimeline
              deadlines={deadlines}
              sessionId={sessionId}
            />
          )}
        </div>
      </main>
    </div>
  );
}

const styles = {
  app: {
    display: "flex",
    height: "100vh",
    overflow: "hidden",
  },

  // ── Sidebar ────────────────────────────────────
  sidebar: {
    width: 240,
    flexShrink: 0,
    background: "rgba(13, 13, 30, 0.9)",
    borderRight: "1px solid var(--border)",
    display: "flex",
    flexDirection: "column",
    padding: "20px 12px",
    gap: 8,
    backdropFilter: "blur(20px)",
  },
  sidebarLogo: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "4px 8px 16px",
    borderBottom: "1px solid var(--border)",
    marginBottom: 8,
  },
  logoMark: {
    fontSize: 28,
    lineHeight: 1,
  },
  logoName: {
    fontFamily: "var(--font-display)",
    fontWeight: 800,
    fontSize: "1.1rem",
    background: "linear-gradient(135deg, #a78bfa, #06b6d4)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    lineHeight: 1.2,
  },
  logoTagline: {
    fontSize: "0.65rem",
    color: "var(--text-muted)",
    marginTop: 2,
    letterSpacing: "0.04em",
  },
  mockBadge: {
    background: "rgba(245, 158, 11, 0.1)",
    border: "1px solid rgba(245, 158, 11, 0.25)",
    borderRadius: "var(--radius-sm)",
    padding: "4px 10px",
    fontSize: "0.7rem",
    color: "#fbbf24",
    textAlign: "center",
    marginBottom: 4,
  },
  nav: {
    display: "flex",
    flexDirection: "column",
    gap: 3,
    flex: 1,
  },
  navItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    borderRadius: "var(--radius-md)",
    border: "none",
    background: "transparent",
    color: "var(--text-muted)",
    cursor: "pointer",
    fontSize: "0.87rem",
    fontWeight: 500,
    transition: "all 0.2s ease",
    width: "100%",
    textAlign: "left",
  },
  navItemActive: {
    background: "var(--color-primary-glow)",
    color: "var(--color-primary-light)",
    fontWeight: 600,
  },
  navIcon: { fontSize: "1rem", flexShrink: 0 },
  navLabel: { flex: 1 },
  navRight: { display: "flex", alignItems: "center", gap: 4, flexShrink: 0 },
  countBadge: {
    fontSize: "0.65rem",
    fontWeight: 700,
    padding: "2px 6px",
    borderRadius: "10px",
    minWidth: 18,
    textAlign: "center",
  },
  notifDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "var(--color-accent)",
    boxShadow: "0 0 6px var(--color-accent)",
  },

  // ── Pipeline steps ─────────────────────────────
  pipelineStatus: {
    borderTop: "1px solid var(--border)",
    paddingTop: 14,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  pipelineTitle: {
    fontSize: "0.68rem",
    color: "var(--text-muted)",
    textTransform: "uppercase",
    fontWeight: 700,
    letterSpacing: "0.08em",
    padding: "0 4px",
    marginBottom: 2,
  },
  pipelineStep: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "2px 4px",
  },
  pipelineDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    flexShrink: 0,
    transition: "all 0.3s ease",
  },
  pipelineStepLabel: {
    fontSize: "0.78rem",
    flex: 1,
    transition: "color 0.3s ease",
  },
  pipelineCheck: {
    fontSize: "0.7rem",
    color: "var(--color-success)",
    fontWeight: 700,
  },

  // ── Main ────────────────────────────────────────
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  tabHeader: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "16px 28px",
    borderBottom: "1px solid var(--border)",
    background: "rgba(255,255,255,0.02)",
    flexShrink: 0,
  },
  tabTitle: {
    margin: 0,
    fontSize: "1rem",
    fontFamily: "var(--font-sans)",
    fontWeight: 600,
    color: "var(--text-secondary)",
  },
  tabContent: {
    flex: 1,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
};
