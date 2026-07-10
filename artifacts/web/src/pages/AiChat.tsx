import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api } from "../api";
import { extractPdfText } from "../pdf";

interface Msg {
  id: string;
  role: "user" | "assistant";
  content: string;
  imagePreview?: string;
  attachmentName?: string;
  sources?: { id: string; name: string }[];
}

interface Attachment {
  kind: "image" | "pdf";
  file: File;
  previewUrl?: string;
  extracting: boolean;
  imageBase64?: string;
  pdfText?: string;
  error?: string;
}

function newSessionId() {
  return `web-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const MAX_FILE_BYTES = 15 * 1024 * 1024;

export default function AiChat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const sessionId = useRef(newSessionId());
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Monotonically increasing token: only the extraction started most recently
  // is allowed to commit its result to state, avoiding stale overwrites when
  // the user swaps attachments before the previous extraction finishes.
  const attachmentToken = useRef(0);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  // Revoke every object URL we've created (pending attachment + sent image
  // previews) when the page unmounts, so navigating away doesn't leak memory.
  useEffect(() => {
    return () => {
      setAttachment((prev) => {
        if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
        return prev;
      });
      messagesRef.current.forEach((m) => {
        if (m.imagePreview) URL.revokeObjectURL(m.imagePreview);
      });
    };
  }, []);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (file.size > MAX_FILE_BYTES) {
      setError("File is too large (max 15 MB).");
      return;
    }
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const isImage = file.type.startsWith("image/");
    if (!isPdf && !isImage) {
      setError("Only images and PDF documents are supported.");
      return;
    }

    // Replacing any pending attachment: revoke its preview URL now, since
    // this token will never be committed again.
    setAttachment((prev) => {
      if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
      return prev;
    });
    const token = ++attachmentToken.current;

    if (isImage) {
      const previewUrl = URL.createObjectURL(file);
      setAttachment({ kind: "image", file, previewUrl, extracting: true });
      try {
        const imageBase64 = await fileToBase64(file);
        if (attachmentToken.current !== token) return;
        setAttachment({ kind: "image", file, previewUrl, extracting: false, imageBase64 });
      } catch {
        if (attachmentToken.current !== token) return;
        setAttachment({ kind: "image", file, previewUrl, extracting: false, error: "Couldn't read this image." });
      }
    } else {
      setAttachment({ kind: "pdf", file, extracting: true });
      try {
        const pdfText = await extractPdfText(file);
        if (attachmentToken.current !== token) return;
        setAttachment({ kind: "pdf", file, extracting: false, pdfText });
      } catch {
        if (attachmentToken.current !== token) return;
        setAttachment({ kind: "pdf", file, extracting: false, error: "Couldn't read this PDF. Try a different file." });
      }
    }
  }

  function clearAttachment(revoke = true) {
    attachmentToken.current++;
    if (revoke) {
      setAttachment((prev) => {
        if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
        return null;
      });
    } else {
      setAttachment(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function send() {
    const text = input.trim();
    const att = attachment;
    if ((!text && !att) || sending) return;
    if (att?.extracting) {
      setError("Still reading your file — one moment…");
      return;
    }
    if (att?.error) {
      setError(att.error);
      return;
    }

    const userMsg: Msg = {
      id: crypto.randomUUID(),
      role: "user",
      content: text || (att?.kind === "pdf" ? `📄 ${att.file.name}` : "Sent an image"),
      imagePreview: att?.kind === "image" ? att.previewUrl : undefined,
      attachmentName: att?.kind === "pdf" ? att.file.name : undefined,
    };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    // The preview URL (if any) is now owned by the message bubble above —
    // don't revoke it, just clear the pending-attachment state.
    clearAttachment(false);
    setSending(true);
    setError(null);
    try {
      const reply = await api.aiChat({
        message: text || (att?.kind === "pdf" ? "Please read this document and help me with it." : "Please look at this image."),
        sessionId: sessionId.current,
        imageBase64: att?.imageBase64,
        pdfText: att?.pdfText,
      });
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
            <br />
            You can also attach an image or PDF for the AI to look at.
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`chat-bubble-row ${m.role}`}>
            <div className={`chat-bubble ${m.role}`}>
              {m.role === "assistant" ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
              ) : (
                <>
                  {m.content}
                  {m.imagePreview && <img className="chat-attachment-thumb" src={m.imagePreview} alt="attachment" />}
                </>
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
            <div className="chat-bubble assistant">
              <div className="typing-dots">
                <span /><span /><span />
              </div>
            </div>
          </div>
        )}
        {error && <div className="empty-state">{error}</div>}
      </div>

      <div className="chat-input-bar">
        {attachment && (
          <div className="chat-attachment-preview">
            {attachment.kind === "image" ? (
              <img src={attachment.previewUrl} alt="preview" />
            ) : (
              <span className="att-icon">📄</span>
            )}
            <span className="att-name">
              {attachment.file.name}
              {attachment.extracting && " — reading…"}
              {attachment.error && ` — ${attachment.error}`}
            </span>
            <span className="att-remove" onClick={() => clearAttachment()}>
              ✕
            </span>
          </div>
        )}
        <div className="chat-input-row">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            style={{ display: "none" }}
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <button
            type="button"
            className="chat-attach-btn"
            title="Attach image or PDF"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending}
          >
            📎
          </button>
          <input
            type="text"
            placeholder="Ask a question…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
          />
          <button className="send-btn" onClick={send} disabled={sending || (!input.trim() && !attachment)}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
