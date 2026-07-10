import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ResourceNode, Stats, Announcement, PublicConfig } from "../api";

const LEVEL_STYLES: Record<string, { icon: string; className: string }> = {
  "o level": { icon: "🟢", className: "card-o-level" },
  "igcse": { icon: "🔵", className: "card-igcse" },
  "as level": { icon: "🟠", className: "card-as-level" },
  "a2 level": { icon: "🌸", className: "card-a2-level" },
};

function styleFor(name: string) {
  const key = name.trim().toLowerCase();
  return LEVEL_STYLES[key] ?? { icon: "📁", className: "card-igcse" };
}

const PRIORITY_STYLES: Record<number, string> = {
  1: "announcement-info",
  2: "announcement-warning",
  3: "announcement-urgent",
};

export default function Home() {
  const [levels, setLevels] = useState<ResourceNode[] | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    api.levels().then(setLevels).catch(() => setLevels([]));
    api.stats().then(setStats).catch(() => setStats(null));
    api.announcements().then(setAnnouncements).catch(() => setAnnouncements([]));
    api.config().then(setConfig).catch(() => setConfig(null));
  }, []);

  const visible = announcements.filter((a) => !dismissed.has(a.id));

  return (
    <div className="container">
      {/* ── Announcements ───────────────────────────────────────────── */}
      {visible.length > 0 && (
        <div className="announcements-list">
          {visible.map((a) => (
            <div
              key={a.id}
              className={`announcement-banner ${PRIORITY_STYLES[a.priority ?? 1] ?? "announcement-info"}`}
            >
              <div className="announcement-body">
                <strong>{a.title}</strong>
                <span>{a.message}</span>
              </div>
              <button
                className="announcement-dismiss"
                onClick={() => setDismissed((d) => new Set([...d, a.id]))}
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <section className="hero">
        <div className="hero-eyebrow">📘 Free for every student</div>
        <h1>
          Everything you need for <span className="accent">O/A Level</span>, in one place
        </h1>
        <p>
          Free past papers, notes and revision resources for IGCSE, O Level, AS &amp; A2 Level —
          plus an AI assistant that can explain concepts and solve questions.
        </p>
        <form
          className="search-bar"
          onSubmit={(e) => {
            e.preventDefault();
            if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`);
          }}
        >
          <input
            placeholder="Search for a subject, paper, or topic…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button type="submit">Search</button>
        </form>

        {/* Android download button */}
        {config?.androidDownloadUrl && (
          <div className="hero-app-cta">
            <a
              href={config.androidDownloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="app-download-btn"
            >
              <span className="app-download-icon">📱</span>
              Download Android App
            </a>
          </div>
        )}

        {stats && (
          <div className="hero-stats">
            <div className="hero-stat">
              <div className="num">{stats.totalPdfs.toLocaleString()}</div>
              <div className="label">PDF resources</div>
            </div>
            <div className="hero-stat">
              <div className="num">{stats.totalSubjects}</div>
              <div className="label">Subjects</div>
            </div>
            <div className="hero-stat">
              <div className="num">{stats.totalLevels}</div>
              <div className="label">Levels</div>
            </div>
          </div>
        )}
      </section>

      <h2 className="section-title">Browse by level</h2>
      {levels === null ? (
        <div className="loading">Loading levels…</div>
      ) : (
        <div className="level-grid">
          {levels.map((lvl) => {
            const s = styleFor(lvl.name);
            return (
              <div
                key={lvl.id}
                className={`level-card ${s.className}`}
                onClick={() => navigate(`/browse/${lvl.id}`)}
              >
                <span className="icon">{s.icon}</span>
                <div>
                  <div className="level-title">{lvl.name}</div>
                  <div className="level-count">{lvl.childCount} items</div>
                </div>
              </div>
            );
          })}
          <div className="level-card card-ai" onClick={() => navigate("/ai")}>
            <span className="icon">✨</span>
            <div>
              <div className="level-title">O/A Level AI</div>
              <div className="level-count">Ask questions, get explanations &amp; solutions</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
