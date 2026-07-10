import "./_group.css";

export function PdfViewer() {
  return (
    <div className="phone-shell" style={{ background: "#424242" }}>
      <div className="status-bar" style={{ background: "#212121" }}><span>9:41</span><div style={{ display: "flex", gap: 6 }}><span>●●●●</span><span>100%</span></div></div>

      {/* Top bar — dark */}
      <div className="top-bar" style={{ background: "#212121", padding: "0 4px", boxShadow: "none" }}>
        <div className="icon-btn">
          <svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
        </div>
        <div style={{ flex: 1, paddingLeft: 4 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: "white" }}>Physics Paper 1 — 2023</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>Page 3 of 16</div>
        </div>
        <div className="icon-btn" title="Download">
          <svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
        </div>
        <div className="icon-btn" title="Night mode" style={{ position: "relative" }}>
          <svg viewBox="0 0 24 24"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/></svg>
        </div>
        <div className="icon-btn" title="Split view">
          <svg viewBox="0 0 24 24"><path d="M3 5v14h8V5H3zm6 12H5V7h4v10zm6-12v14h6V5h-6zm4 12h-2V7h2v10z"/></svg>
        </div>
        <div className="icon-btn" title="Favourite">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
        </div>
      </div>

      {/* PDF page content */}
      <div style={{ flex: 1, background: "#616161", display: "flex", flexDirection: "column", alignItems: "center", padding: "12px 8px", gap: 8, overflowY: "auto" }}>
        {/* Page */}
        <div style={{ width: 346, background: "white", borderRadius: 4, padding: "20px 22px", boxShadow: "0 4px 20px rgba(0,0,0,0.35)", minHeight: 480 }}>
          {/* Cambridge header */}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, paddingBottom: 12, borderBottom: "2px solid #1B5E20" }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#1B5E20", letterSpacing: "0.05em", textTransform: "uppercase" }}>Cambridge Assessment</div>
              <div style={{ fontSize: 10, color: "#666", marginTop: 2 }}>International Education</div>
            </div>
            <div style={{ textAlign: "right", fontSize: 10, color: "#666" }}>
              <div>9702/12/M/J/23</div>
              <div style={{ marginTop: 2 }}>Physics — Paper 1</div>
            </div>
          </div>

          <div style={{ fontSize: 11, fontWeight: 700, color: "#1a1a1a", marginBottom: 14 }}>Section A — Multiple Choice</div>

          {/* Sample MCQ questions */}
          {[1, 2, 3].map(q => (
            <div key={q} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "#1a1a1a", lineHeight: 1.5 }}>
                <strong>{q}</strong>{q === 1 && "  A student measures the time for 20 oscillations of a pendulum as 24.6 s."}
                {q === 2 && "  Which quantity has the SI unit of kg m⁻³?"}
                {q === 3 && "  A body moves with constant velocity. Which statement must be correct?"}
              </div>
              <div style={{ marginTop: 8, paddingLeft: 12 }}>
                {["A", "B", "C", "D"].map((opt, i) => (
                  <div key={opt} style={{ display: "flex", gap: 8, marginBottom: 4, alignItems: "center" }}>
                    <div style={{ width: 16, height: 16, borderRadius: "50%", border: "1.5px solid #bbb", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: q === 2 && opt === "C" ? "#E8F5E9" : "transparent", borderColor: q === 2 && opt === "C" ? "#1B5E20" : "#bbb" }}>
                      <span style={{ fontSize: 8, fontWeight: 700, color: q === 2 && opt === "C" ? "#1B5E20" : "#888" }}>{opt}</span>
                    </div>
                    <span style={{ fontSize: 10, color: "#333" }}>
                      {opt === "A" && `0.${q}23 ×10⁻² kg`}
                      {opt === "B" && `${q + 1}.${q}4 m s⁻¹`}
                      {opt === "C" && `${q * 2}.${q}1 × 10³ Pa`}
                      {opt === "D" && `${q}45 J mol⁻¹`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>Page 3 of 16</div>
      </div>

      {/* Bottom progress bar */}
      <div style={{ background: "#212121", padding: "10px 16px 14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, color: "rgba(255,255,255,0.7)", fontSize: 11 }}>
          <span>19% complete</span>
          <span>3 / 16 pages</span>
        </div>
        <div style={{ height: 4, background: "rgba(255,255,255,0.2)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ width: "19%", height: "100%", background: "#4CAF50", borderRadius: 2 }} />
        </div>
      </div>

      {/* Home indicator */}
      <div style={{ height: 20, background: "#212121", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 120, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.2)" }} />
      </div>
    </div>
  );
}
