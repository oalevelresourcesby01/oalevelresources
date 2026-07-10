import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api } from "../api";

interface Msg {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: { id: string; name: string }[];
}

function newSessionId() {
  return `web-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function AiChat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionId = useRef(newSessionId());

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    const userMsg: Msg = { id: crypto.randomUUID(), role: "user", content: text };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setSending(true);
    setError(null);
    try {
      const reply = await api.aiChat({ message: text, sessionId: sessionId.current });
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: reply.reply,
          sources: reply.relatedResources,
        },
      ]);
    } catch (e: any) {
      setError(e?.message || "Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="container chat-page">
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="empty-state">
            Ask about any O/A Level or IGCSE topic — explanations, worked solutions, revision help.
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`chat-bubble-row ${m.role}`}>
            <div className={`chat-bubble ${m.role}`}>
              {m.role === "assistant" ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
              ) : (
                m.content
              )}
              {m.sources && m.sources.length > 0 && (
                <div className="chat-sources">
                  {m.sources.map((s) => (
                    <span key={s.id} className="chat-source-chip">
                      {s.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {sending && (
          <div className="chat-bubble-row assistant">
            <div className="chat-bubble assistant">Thinking…</div>
          </div>
        )}
        {error && <div className="empty-state">{error}</div>}
      </div>

      <div className="chat-input-bar">
        <input
          placeholder="Ask a question…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button onClick={send} disabled={sending || !input.trim()}>
          Send
        </button>
      </div>
    </div>
  );
}
