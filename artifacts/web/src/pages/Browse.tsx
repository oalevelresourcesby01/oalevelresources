import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, ResourceNode } from "../api";

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
}

export default function Browse() {
  const { nodeId } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState<ResourceNode[] | null>(null);
  const [crumb, setCrumb] = useState<{ id: string; name: string }[]>([]);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfName, setPdfName] = useState<string>("");
  const [sideBySide, setSideBySide] = useState(false);
  // Sibling files shown in the left panel during side-by-side mode
  const [siblings, setSiblings] = useState<ResourceNode[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setItems(null);
    setPdfUrl(null);
    setPdfName("");
    setSiblings(null);
    setSelectedId(null);
    setError(null);

    async function load() {
      if (!nodeId) {
        const levels = await api.levels();
        setItems(levels);
        setCrumb([]);
        return;
      }
      const node = await api.node(nodeId);
      if (node.type === "pdf") {
        const { url } = await api.pdfUrl(nodeId);
        setPdfUrl(url);
        setPdfName(node.name);
        setSelectedId(nodeId);
        setItems([]);
        // Load siblings so side-by-side panel has file list
        if (node.parentId) {
          api.children(node.parentId).then(({ items: ch }) => setSiblings(ch)).catch(() => setSiblings([]));
        }
      } else {
        const { items: children } = await api.children(nodeId);
        setItems(children);
      }
      const bc = await api.breadcrumb(nodeId);
      setCrumb(bc);
    }
    load().catch((e: unknown) => {
      setItems([]);
      setError(e instanceof Error ? e.message : "Failed to load this item. Please try again.");
    });
  }, [nodeId]);

  async function selectPdf(item: ResourceNode) {
    if (item.type !== "pdf") {
      navigate(`/browse/${item.id}`);
      return;
    }
    setSelectedId(item.id);
    setPdfName(item.name);
    setPdfUrl(null);
    try {
      const { url } = await api.pdfUrl(item.id);
      setPdfUrl(url);
    } catch {
      setError("Couldn't load this PDF. Please try again.");
    }
  }

  const isPdfView = !!pdfUrl;

  return (
    <div className="container">
      <div className="breadcrumb" style={{ marginTop: 24 }}>
        <span onClick={() => navigate("/browse")} style={{ cursor: "pointer" }}>
          Home
        </span>
        {crumb.map((c, i) => (
          <span key={c.id}>
            {" / "}
            {i === crumb.length - 1 ? (
              c.name
            ) : (
              <a onClick={() => navigate(`/browse/${c.id}`)} style={{ cursor: "pointer" }}>
                {c.name}
              </a>
            )}
          </span>
        ))}
      </div>

      {isPdfView ? (
        <>
          {/* PDF toolbar */}
          <div className="pdf-toolbar">
            <button
              className="pdf-toolbar-btn"
              onClick={() => navigate(-1)}
            >
              ← Back
            </button>
            <span className="pdf-toolbar-name">{pdfName}</span>
            <button
              className={`pdf-toolbar-btn ${sideBySide ? "active" : ""}`}
              onClick={() => setSideBySide((s) => !s)}
              title={sideBySide ? "Full view" : "Side-by-side view"}
            >
              {sideBySide ? "⬜ Full view" : "⬛⬜ Side by side"}
            </button>
          </div>

          {sideBySide ? (
            /* ── Side-by-side layout ── */
            <div className="pdf-split-view">
              <div className="pdf-split-list">
                {siblings === null ? (
                  <div className="loading" style={{ padding: "40px 0" }}>Loading…</div>
                ) : siblings.length === 0 ? (
                  <div className="empty-state" style={{ padding: "40px 0" }}>No files here.</div>
                ) : (
                  <div className="node-list">
                    {siblings.map((item) => (
                      <div
                        key={item.id}
                        className={`node-row ${selectedId === item.id ? "node-row-active" : ""}`}
                        onClick={() => item.type === "pdf" ? selectPdf(item) : navigate(`/browse/${item.id}`)}
                      >
                        <span className="node-icon">{item.type === "folder" ? "📁" : "📄"}</span>
                        <span className="node-name">{item.name}</span>
                        <span className="node-meta">
                          {item.type === "folder" ? `${item.childCount} items` : formatSize(item.size)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="pdf-split-viewer">
                {pdfUrl ? (
                  <iframe className="pdf-frame" src={pdfUrl} title="PDF viewer" />
                ) : (
                  <div className="loading">Loading PDF…</div>
                )}
              </div>
            </div>
          ) : (
            /* ── Full-view layout ── */
            <iframe className="pdf-frame" src={pdfUrl} title="PDF viewer" />
          )}
        </>
      ) : error ? (
        <div className="empty-state">
          Couldn't load this page: {error}
          <div style={{ marginTop: 12 }}>
            <a onClick={() => navigate("/browse")} style={{ cursor: "pointer", textDecoration: "underline" }}>
              Back to browse
            </a>
          </div>
        </div>
      ) : items === null ? (
        <div className="loading">Loading…</div>
      ) : items.length === 0 ? (
        <div className="empty-state">This folder is empty.</div>
      ) : (
        <div className="node-list">
          {items.map((item) => (
            <div
              key={item.id}
              className="node-row"
              onClick={() => navigate(`/browse/${item.id}`)}
            >
              <span className="node-icon">{item.type === "folder" ? "📁" : "📄"}</span>
              <span className="node-name">{item.name}</span>
              <span className="node-meta">
                {item.type === "folder" ? `${item.childCount} items` : formatSize(item.size)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
