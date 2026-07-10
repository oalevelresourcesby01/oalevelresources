import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, ResourceNode } from "../api";

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
}

interface PdfState {
  url: string | null;   // null = loading
  name: string;
  loading: boolean;
  error: string | null;
}

export default function Browse() {
  const { nodeId } = useParams();
  const navigate = useNavigate();

  const [items, setItems] = useState<ResourceNode[] | null>(null);
  const [crumb, setCrumb] = useState<{ id: string; name: string }[]>([]);

  // pdfState != null means we're in PDF-view mode (even while the URL is still loading)
  const [pdfState, setPdfState] = useState<PdfState | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sideBySide, setSideBySide] = useState(false);
  // Sibling files for the left panel in side-by-side mode
  const [siblings, setSiblings] = useState<ResourceNode[] | null>(null);

  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    setItems(null);
    setPdfState(null);
    setSelectedId(null);
    setSiblings(null);
    setPageError(null);

    async function load() {
      if (!nodeId) {
        const levels = await api.levels();
        setItems(levels);
        setCrumb([]);
        return;
      }
      const node = await api.node(nodeId);
      if (node.type === "pdf") {
        // Enter PDF-view mode immediately so layout stays stable while URL loads
        setPdfState({ url: null, name: node.name, loading: true, error: null });
        setSelectedId(nodeId);
        setItems([]);

        // Load sibling files for side-by-side panel
        if (node.parentId) {
          api.children(node.parentId)
            .then(({ items: ch }) => setSiblings(ch))
            .catch(() => setSiblings([]));
        } else {
          setSiblings([]);
        }

        try {
          const { url } = await api.pdfUrl(nodeId);
          setPdfState({ url, name: node.name, loading: false, error: null });
        } catch {
          setPdfState({ url: null, name: node.name, loading: false, error: "Couldn't load this PDF." });
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
      setPageError(e instanceof Error ? e.message : "Failed to load this item. Please try again.");
    });
  }, [nodeId]);

  // Switching to a different PDF while already in PDF-view mode (side-by-side click)
  async function selectPdf(item: ResourceNode) {
    if (item.type !== "pdf") {
      navigate(`/browse/${item.id}`);
      return;
    }
    setSelectedId(item.id);
    // Keep pdfState.name updated + mark loading; don't exit PDF-view mode
    setPdfState((prev) => ({ url: null, name: item.name, loading: true, error: null }));
    try {
      const { url } = await api.pdfUrl(item.id);
      setPdfState({ url, name: item.name, loading: false, error: null });
    } catch {
      setPdfState((prev) => prev ? { ...prev, loading: false, error: "Couldn't load this PDF." } : null);
    }
  }

  const inPdfView = pdfState !== null;

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

      {inPdfView ? (
        <>
          {/* PDF toolbar */}
          <div className="pdf-toolbar">
            <button className="pdf-toolbar-btn" onClick={() => navigate(-1)}>
              ← Back
            </button>
            <span className="pdf-toolbar-name">{pdfState.name}</span>
            <button
              className={`pdf-toolbar-btn ${sideBySide ? "active" : ""}`}
              onClick={() => setSideBySide((s) => !s)}
              title={sideBySide ? "Full view" : "Side-by-side view"}
            >
              {sideBySide ? "⬜ Full view" : "⬛⬜ Side by side"}
            </button>
          </div>

          {sideBySide ? (
            <div className="pdf-split-view">
              {/* Left: file list */}
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
                        onClick={() => selectPdf(item)}
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
              {/* Right: PDF */}
              <div className="pdf-split-viewer">
                {pdfState.loading ? (
                  <div className="loading" style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    Loading PDF…
                  </div>
                ) : pdfState.error ? (
                  <div className="empty-state">{pdfState.error}</div>
                ) : (
                  <iframe className="pdf-frame" src={pdfState.url!} title="PDF viewer" />
                )}
              </div>
            </div>
          ) : (
            /* Full-view */
            pdfState.loading ? (
              <div className="loading">Loading PDF…</div>
            ) : pdfState.error ? (
              <div className="empty-state">{pdfState.error}</div>
            ) : (
              <iframe className="pdf-frame" src={pdfState.url!} title="PDF viewer" />
            )
          )}
        </>
      ) : pageError ? (
        <div className="empty-state">
          Couldn't load this page: {pageError}
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
