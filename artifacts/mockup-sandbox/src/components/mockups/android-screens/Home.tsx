import "./_group.css";

const levels = [
  { label: "O Level", icon: "📗", bg: "#E8F5E9", border: "#A5D6A7", count: "342 resources" },
  { label: "IGCSE", icon: "📘", bg: "#E3F2FD", border: "#90CAF9", count: "285 resources" },
  { label: "AS Level", icon: "📙", bg: "#FFF8E1", border: "#FFE082", count: "198 resources" },
  { label: "A2 Level", icon: "📕", bg: "#FCE4EC", border: "#F48FB1", count: "176 resources" },
];

const recent = [
  { name: "Physics Paper 2 — 2023", folder: "AS Level / Physics", size: "1.2 MB" },
  { name: "Biology MCQ Answers", folder: "O Level / Biology", size: "0.8 MB" },
  { name: "Maths Formula Sheet", folder: "A2 Level / Maths", size: "0.4 MB" },
];

export function Home() {
  return (
    <div className="phone-shell">
      <div className="status-bar">
        <span>9:41</span>
        <div style={{ display: "flex", gap: 6 }}><span>●●●●</span><span>100%</span></div>
      </div>

      {/* Top bar */}
      <div className="top-bar" style={{ padding: "0 8px 0 16px" }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3z"/><path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/></svg>
        </div>
        <div style={{ flex: 1, paddingLeft: 10 }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: "white" }}>O/A Level Resources</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)" }}>Good morning! Ready to study?</div>
        </div>
        <div className="icon-btn">
          <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
        </div>
        <div className="icon-btn">
          <svg viewBox="0 0 24 24"><path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/></svg>
        </div>
      </div>

      <div className="content" style={{ padding: "0 0 16px 0" }}>
        {/* Announcement */}
        <div style={{ margin: "12px 12px 0", padding: "12px 14px", borderRadius: 14, background: "#E8F5E9", borderLeft: "4px solid #2E7D32", display: "flex", gap: 10, alignItems: "flex-start" }}>
          <span style={{ fontSize: 18 }}>📢</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1B5E20" }}>New O Level Papers Added</div>
            <div style={{ fontSize: 12, color: "#43483f", marginTop: 2 }}>2024 May/June papers now available for all subjects</div>
          </div>
        </div>

        {/* Level cards */}
        <div style={{ padding: "16px 12px 0" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1c19", marginBottom: 12 }}>Browse by Level</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {levels.map(l => (
              <div key={l.label} style={{
                background: l.bg, borderRadius: 18, padding: "16px 14px",
                border: `1px solid ${l.border}`, cursor: "pointer",
              }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{l.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#1a1c19" }}>{l.label}</div>
                <div style={{ fontSize: 11, color: "#43483f", marginTop: 2 }}>{l.count}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div style={{ padding: "16px 12px 0", display: "flex", gap: 10 }}>
          <div style={{ flex: 1, background: "linear-gradient(135deg, #4527A0, #6c3fd6)", borderRadius: 16, padding: "14px", color: "white", cursor: "pointer" }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>✨</div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>AI Tutor</div>
            <div style={{ fontSize: 10, opacity: 0.85, marginTop: 2 }}>Ask any question</div>
          </div>
          <div style={{ flex: 1, background: "linear-gradient(135deg, #1B5E20, #2E7D32)", borderRadius: 16, padding: "14px", color: "white", cursor: "pointer" }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>💬</div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>WhatsApp</div>
            <div style={{ fontSize: 10, opacity: 0.85, marginTop: 2 }}>Join channel</div>
          </div>
        </div>

        {/* Recent resources */}
        <div style={{ padding: "16px 12px 0" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1c19", marginBottom: 10 }}>Latest Resources</div>
          {recent.map((r, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: i < recent.length - 1 ? "1px solid #f0f0e8" : "none" }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: "#FFEBEE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>📄</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1c19" }}>{r.name}</div>
                <div style={{ fontSize: 11, color: "#43483f", marginTop: 2 }}>{r.folder} · {r.size}</div>
              </div>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#43483f"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom nav */}
      <div className="nav-bar">
        {[
          { icon: "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z", label: "Home", active: true },
          { icon: "M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z", label: "Browse" },
          { icon: "M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z", label: "Search" },
          { icon: "M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z", label: "Downloads" },
          { icon: "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z", label: "Settings" },
        ].map(n => (
          <div key={n.label} className={`nav-item ${n.active ? "active" : ""}`}>
            <svg viewBox="0 0 24 24"><path d={n.icon}/></svg>
            <span className="nav-label">{n.label}</span>
          </div>
        ))}
      </div>

      {/* Home indicator */}
      <div style={{ height: 20, background: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 120, height: 4, borderRadius: 2, background: "#c3c8bc" }} />
      </div>
    </div>
  );
}
