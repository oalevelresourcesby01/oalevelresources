import "./_group.css";

const items = [
  { type: "folder", name: "Physics", meta: "12 items" },
  { type: "folder", name: "Chemistry", meta: "9 items" },
  { type: "folder", name: "Mathematics", meta: "15 items" },
  { type: "pdf", name: "Physics Paper 1 — 2023 MJ", meta: "1.2 MB" },
  { type: "pdf", name: "Physics Paper 2 — 2023 MJ", meta: "0.9 MB" },
  { type: "pdf", name: "Physics Marking Scheme 2023", meta: "0.6 MB" },
  { type: "pdf", name: "Physics Paper 1 — 2022 ON", meta: "1.1 MB" },
  { type: "pdf", name: "Physics Paper 2 — 2022 ON", meta: "0.8 MB" },
];

export function Browse() {
  return (
    <div className="phone-shell">
      <div className="status-bar"><span>9:41</span><div style={{ display: "flex", gap: 6 }}><span>●●●●</span><span>100%</span></div></div>

      <div className="top-bar" style={{ padding: "0 4px" }}>
        <div className="icon-btn">
          <svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: "white" }}>AS Level / Physics</div>
        </div>
        <div className="icon-btn">
          <svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
        </div>
        <div className="icon-btn">
          <svg viewBox="0 0 24 24"><path d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
        </div>
        <div className="icon-btn">
          <svg viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
        </div>
      </div>

      {/* Breadcrumb */}
      <div style={{ padding: "10px 16px", background: "white", display: "flex", gap: 4, alignItems: "center", fontSize: 12, color: "#43483f", borderBottom: "1px solid #f0f0e8", flexWrap: "wrap" }}>
        {["Home", "AS Level", "Physics"].map((c, i, arr) => (
          <span key={c} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ color: i === arr.length - 1 ? "#1B5E20" : "#43483f", fontWeight: i === arr.length - 1 ? 700 : 400 }}>{c}</span>
            {i < arr.length - 1 && <span style={{ opacity: 0.5 }}>›</span>}
          </span>
        ))}
      </div>

      <div className="content">
        {items.map((item, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 14,
            padding: "14px 16px",
            background: "white",
            borderBottom: "1px solid #f5f5f0",
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              background: item.type === "folder" ? "#E8F5E9" : "#FFEBEE",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {item.type === "folder" ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="#2E7D32"><path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="#C62828"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13z"/></svg>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#1a1c19", lineHeight: 1.3 }}>{item.name}</div>
              <div style={{ fontSize: 12, color: "#43483f", marginTop: 3 }}>{item.meta}</div>
            </div>
            {item.type === "pdf" && (
              <div style={{ display: "flex", gap: 4 }}>
                <div className="icon-btn" style={{ width: 36, height: 36 }}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="#43483f"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                </div>
              </div>
            )}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#c3c8bc"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
          </div>
        ))}
      </div>

      {/* Home indicator */}
      <div style={{ height: 28, background: "white", display: "flex", alignItems: "center", justifyContent: "center", borderTop: "1px solid #f0f0e8" }}>
        <div style={{ width: 120, height: 4, borderRadius: 2, background: "#c3c8bc" }} />
      </div>
    </div>
  );
}
