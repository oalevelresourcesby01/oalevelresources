import "./_group.css";

const downloads = [
  { name: "Physics Paper 1 — 2023 MJ", folder: "AS Level / Physics", size: "1.2 MB", progress: 100 },
  { name: "Chemistry Paper 2 — 2023 ON", folder: "O Level / Chemistry", size: "0.9 MB", progress: 100 },
  { name: "Maths Formula Sheet", folder: "A2 Level / Maths", size: "0.4 MB", progress: 100 },
  { name: "Biology Notes — Chapter 5", folder: "IGCSE / Biology", size: "2.1 MB", progress: 65 },
  { name: "Physics Marking Scheme 2022", folder: "AS Level / Physics", size: "0.7 MB", progress: 100 },
  { name: "Economics Paper 1 — 2023", folder: "A2 Level / Economics", size: "1.3 MB", progress: 100 },
];

export function Downloads() {
  return (
    <div className="phone-shell">
      <div className="status-bar"><span>9:41</span><div style={{ display: "flex", gap: 6 }}><span>●●●●</span><span>100%</span></div></div>

      <div className="top-bar" style={{ padding: "0 8px" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 600, color: "white", paddingLeft: 8 }}>Downloads</div>
        </div>
        <div className="icon-btn" title="Clear all">
          <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
        </div>
      </div>

      {/* Storage bar */}
      <div style={{ background: "white", padding: "14px 16px", borderBottom: "1px solid #f0f0e8" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13 }}>
          <span style={{ fontWeight: 600, color: "#1a1c19" }}>Storage Used</span>
          <span style={{ color: "#1B5E20", fontWeight: 700 }}>6.6 MB / 50 MB</span>
        </div>
        <div style={{ height: 6, background: "#f0f0e8", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ width: "13%", height: "100%", background: "linear-gradient(90deg, #1B5E20, #4CAF50)", borderRadius: 3 }} />
        </div>
      </div>

      <div className="content">
        {downloads.map((d, i) => (
          <div key={i} style={{ background: "white", borderBottom: "1px solid #f5f5f0", padding: "12px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "#FFEBEE", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="#C62828"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13z"/></svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: "#1a1c19", lineHeight: 1.3 }}>{d.name}</div>
                <div style={{ fontSize: 11, color: "#43483f", marginTop: 3 }}>{d.folder} · {d.size}</div>
                {d.progress < 100 && (
                  <div style={{ marginTop: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#1B5E20", marginBottom: 3, fontWeight: 600 }}>
                      <span>Downloading…</span><span>{d.progress}%</span>
                    </div>
                    <div style={{ height: 3, background: "#f0f0e8", borderRadius: 2 }}>
                      <div style={{ width: `${d.progress}%`, height: "100%", background: "#1B5E20", borderRadius: 2 }} />
                    </div>
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 0 }}>
                {d.progress === 100 ? (
                  <>
                    <div className="icon-btn" style={{ width: 36, height: 36 }} title="Open">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="#1B5E20"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z"/></svg>
                    </div>
                    <div className="icon-btn" style={{ width: 36, height: 36 }} title="Delete">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="#43483f"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                    </div>
                  </>
                ) : (
                  <div className="icon-btn" style={{ width: 36, height: 36 }} title="Cancel">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="#C62828"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="nav-bar">
        {[
          { icon: "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z", label: "Home" },
          { icon: "M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z", label: "Browse" },
          { icon: "M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z", label: "Search" },
          { icon: "M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z", label: "Downloads", active: true },
          { icon: "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z", label: "Settings" },
        ].map(n => (
          <div key={n.label} className={`nav-item ${(n as any).active ? "active" : ""}`}>
            <svg viewBox="0 0 24 24"><path d={n.icon}/></svg>
            <span className="nav-label">{n.label}</span>
          </div>
        ))}
      </div>
      <div style={{ height: 20, background: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 120, height: 4, borderRadius: 2, background: "#c3c8bc" }} />
      </div>
    </div>
  );
}
