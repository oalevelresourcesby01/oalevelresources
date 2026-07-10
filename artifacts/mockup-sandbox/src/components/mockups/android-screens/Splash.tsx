import "./_group.css";

export function Splash() {
  return (
    <div className="phone-shell" style={{ background: "#fafaf5", alignItems: "center", justifyContent: "center", gap: 0, minHeight: 844 }}>
      {/* Status bar */}
      <div className="status-bar" style={{ position: "absolute", top: 0, left: 0, right: 0, background: "transparent", color: "#1B5E20" }}>
        <span>9:41</span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span>●●●●</span>
          <span>WiFi</span>
          <span>100%</span>
        </div>
      </div>

      {/* Logo */}
      <div style={{
        width: 120, height: 120, borderRadius: 32,
        background: "linear-gradient(145deg, #1B5E20, #2E7D32)",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 12px 40px rgba(27,94,32,0.35)",
        marginBottom: 32,
      }}>
        <svg width="64" height="64" viewBox="0 0 24 24" fill="white">
          <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z"/>
        </svg>
      </div>

      {/* App name */}
      <div style={{ textAlign: "center" }}>
        <div style={{
          fontSize: 28, fontWeight: 700, color: "#1B5E20",
          fontFamily: "'Google Sans', system-ui", letterSpacing: "-0.01em",
          marginBottom: 8,
        }}>
          O/A Level Resources
        </div>
        <div style={{ fontSize: 14, color: "#43483f", letterSpacing: 0.02 }}>
          Free past papers, notes &amp; AI tutor
        </div>
      </div>

      {/* Loading dots */}
      <div style={{ display: "flex", gap: 8, marginTop: 64 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 8, height: 8, borderRadius: "50%",
            background: i === 1 ? "#1B5E20" : "rgba(27,94,32,0.3)",
          }} />
        ))}
      </div>

      {/* Bottom home indicator */}
      <div style={{
        position: "absolute", bottom: 10, left: "50%",
        transform: "translateX(-50%)",
        width: 120, height: 4, borderRadius: 2,
        background: "rgba(27,94,32,0.2)",
      }} />
    </div>
  );
}
