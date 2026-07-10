import "./_group.css";

const messages = [
  { role: "user", content: "Can you explain how to solve simultaneous equations in A Level Maths?" },
  {
    role: "ai",
    content: `**Simultaneous Equations** — Step-by-step guide:

**Method 1: Substitution**
1. Rearrange one equation to express *x* in terms of *y*
2. Substitute into the second equation
3. Solve for *y*, then back-substitute

**Method 2: Elimination**
1. Multiply equations to match coefficients
2. Add or subtract to eliminate one variable
3. Solve the remaining single-variable equation

**Example:**
\`2x + y = 10\`  and  \`x − y = 2\`

Adding both: **3x = 12**, so **x = 4**, **y = 2** ✓`,
  },
  { role: "user", content: "What about quadratic simultaneous equations?" },
];

function MsgBubble({ msg }: { msg: typeof messages[0] }) {
  const isUser = msg.role === "user";
  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 12 }}>
      {!isUser && (
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#E8F5E9", display: "flex", alignItems: "center", justifyContent: "center", marginRight: 8, flexShrink: 0, alignSelf: "flex-end" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#1B5E20"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 9h-2V5h2v6zm0 4h-2v-2h2v2z"/></svg>
        </div>
      )}
      <div style={{
        maxWidth: 260, padding: "10px 14px",
        borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
        background: isUser ? "linear-gradient(135deg, #1B5E20, #2E7D32)" : "white",
        color: isUser ? "white" : "#1a1c19",
        fontSize: 13, lineHeight: 1.55,
        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
      }}>
        {msg.role === "ai" ? (
          <div dangerouslySetInnerHTML={{ __html: msg.content
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/`(.+?)`/g, '<code style="background:rgba(0,0,0,0.07);padding:1px 5px;border-radius:4px;font-size:12px">$1</code>')
            .replace(/\n/g, '<br/>')
          }} />
        ) : msg.content}
      </div>
    </div>
  );
}

export function AiChat() {
  return (
    <div className="phone-shell">
      <div className="status-bar"><span>9:41</span><div style={{ display: "flex", gap: 6 }}><span>●●●●</span><span>100%</span></div></div>

      <div className="top-bar" style={{ padding: "0 4px" }}>
        <div className="icon-btn">
          <svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
        </div>
        <div style={{ flex: 1, paddingLeft: 4 }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: "white" }}>O/A Level AI</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)" }}>Ask questions, attach images or files</div>
        </div>
        <div className="icon-btn">
          <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
        </div>
      </div>

      {/* Chat messages */}
      <div className="content" style={{ padding: "16px 12px 8px", background: "#f5f5f0" }}>
        {messages.map((m, i) => <MsgBubble key={i} msg={m} />)}

        {/* Typing indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#E8F5E9", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#1B5E20"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
          </div>
          <div style={{ background: "white", borderRadius: "18px 18px 18px 4px", padding: "12px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", display: "flex", gap: 5, alignItems: "center" }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: i === 1 ? "#1B5E20" : "rgba(27,94,32,0.4)", transform: i === 1 ? "translateY(-4px)" : "none", transition: "all 0.3s" }} />
            ))}
          </div>
        </div>

        {/* Source chips */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", paddingLeft: 36 }}>
          {["AS Physics Paper 1", "Maths Textbook Ch.4"].map(s => (
            <div key={s} style={{ fontSize: 10, padding: "3px 10px", borderRadius: 999, background: "#E8F5E9", color: "#1B5E20", fontWeight: 600, border: "1px solid #A5D6A7" }}>{s}</div>
          ))}
        </div>
      </div>

      {/* Input bar */}
      <div style={{ background: "white", borderTop: "1px solid #f0f0e8", padding: "8px 8px 12px" }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <div className="icon-btn" style={{ background: "#f5f5f0", borderRadius: 12 }}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="#43483f"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
          </div>
          <div className="icon-btn" style={{ background: "#f5f5f0", borderRadius: 12 }}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="#43483f"><path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/></svg>
          </div>
          <div style={{ flex: 1, background: "#f5f5f0", borderRadius: 24, padding: "10px 16px", fontSize: 14, color: "#43483f" }}>
            Ask a question…
          </div>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, #1B5E20, #2E7D32)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          </div>
        </div>
      </div>

      {/* Home indicator */}
      <div style={{ height: 20, background: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 120, height: 4, borderRadius: 2, background: "#c3c8bc" }} />
      </div>
    </div>
  );
}
