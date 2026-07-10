import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api";

export default function Search() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const [input, setInput] = useState(q);
  const [results, setResults] = useState<any[] | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    setInput(q);
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setResults(null);
    api
      .search(q)
      .then((r) => setResults(r.results))
      .catch(() => setResults([]));
  }, [q]);

  return (
    <div className="container">
      <h2 className="section-title" style={{ marginTop: 24 }}>
        Search
      </h2>
      <form
        className="search-bar"
        style={{ marginBottom: 32 }}
        onSubmit={(e) => {
          e.preventDefault();
          setParams({ q: input });
        }}
      >
        <input
          placeholder="Search for a subject, paper, or topic…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit">Search</button>
      </form>

      {results === null ? (
        <div className="loading">Searching…</div>
      ) : results.length === 0 ? (
        <div className="empty-state">{q ? "No results found." : "Type a query to search."}</div>
      ) : (
        <div className="node-list">
          {results.map((r) => (
            <div key={r.id} className="node-row" onClick={() => navigate(`/browse/${r.id}`)}>
              <span className="node-icon">{r.type === "folder" ? "📁" : "📄"}</span>
              <span className="node-name">{r.name}</span>
              <span className="node-meta">
                {(r.breadcrumb ?? []).map((b: any) => b.name).join(" / ")}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
