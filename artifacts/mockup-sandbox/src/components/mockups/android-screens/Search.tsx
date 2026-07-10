import "./_group.css";

const results = [
  { type: "pdf", name: "Physics Paper 1 — 2023 MJ", path: "AS Level › Physics › Past Papers", size: "1.2 MB" },
  { type: "pdf", name: "Physics Paper 2 — 2023 MJ", path: "AS Level › Physics › Past Papers", size: "0.9 MB" },
  { type: "folder", name: "Physics", path: "AS Level", meta: "12 items" },
  { type: "pdf", name: "A Level Physics Notes", path: "A2 Level › Physics › Notes", size: "2.1 MB" },
  { type: "pdf", name: "IGCSE Physics Revision", path: "IGCSE › Physics › Revision", size: "1.7 MB" },
];

const recents = ["chemistry past papers", "biology notes 2023", "maths formula"];

export function Search() {
  return (
    <div className="phone-shell">
      <div className="status-bar"><span>9:41</span><div style={{ display: "flex", gap: 6 }}><span>●●●●</span><span>100%</span></div></div>

      {/* Search bar in top */}
      <div className="top-bar" style={{ padding: "8px 8px", gap: 8 }}>
        <div className="icon-btn">
          <svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
        </div>
        <div style={{ flex: 1, background: "rgba(255,255,255,0.18)", borderRadius: 999, display: "flex", alignItems: "center", gap: 10, padding: "0 14px", height: 40 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="rgba(255,255,255,0.7)"><path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
          <span style={{ fontSize: 14, color: "white", opacity: 0.9 }}>physics</span>
          <div style={{ flex: 1 }} />
          <svg width="16" height="16" viewBox="0 0 24 24" fill="rgba(255,255,255,0.7)"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
        </div>
      </div>

      <div className="content">
        {/* Filter chips */}
        <div style={{ padding: "12px 12px 8px", display: "flex", gap: 8, overflowX: "auto" }}>
          {["All", "PDF", "Folder", "Subject"].map((c, i) => (
            <div key={c} className={`chip ${i === 0 ? "active" : ""}`} style={{ flexShrink: 0 }}>{c}</div>
          ))}
        </div>

        {/* Result count */}
        <div style={{ padding: "4px 16px 10px", fontSize: 12, color: "#43483f" }}>
          <strong style={{ color: "#1B5E20" }}>23 results</strong> for "physics"
        </div>

        {/* Results */}
        {results.map((item, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 14, padding: "12px 16px",
            background: "white", borderBottom: "1px solid #f5f5f0",
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, flexShrink: 0,
              background: item.type === "folder" ? "#E8F5E9" : "#FFEBEE",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {item.type === "folder" ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#2E7D32"><path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#C62828"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13z"/></svg>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#1a1c19" }}>{item.name}</div>
              <div style={{ fontSize: 11, color: "#43483f", marginTop: 3 }}>{item.path}</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#c3c8bc"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
          </div>
        ))}
      </div>

      <div style={{ height: 28, background: "white", display: "flex", alignItems: "center", justifyContent: "center", borderTop: "1px solid #f0f0e8" }}>
        <div style={{ width: 120, height: 4, borderRadius: 2, background: "#c3c8bc" }} />
      </div>
    </div>
  );
}
