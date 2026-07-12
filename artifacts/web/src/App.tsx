import { Routes, Route, Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import Home from "./pages/Home";
import Browse from "./pages/Browse";
import Search from "./pages/Search";
import AiChat from "./pages/AiChat";
import { api, PublicConfig } from "./api";

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const location = useLocation();

  // Close menu on route change
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  // Load config once for footer
  useEffect(() => { api.config().then(setConfig).catch(() => {}); }, []);

  return (
    <>
      <nav className="topnav">
        <div className="container topnav-inner">
          <Link className="brand" to="/">
            <img className="brand-logo" src="/logo.png" alt="O/A Level Resources" />
            <span className="brand-text">O/A Level Resources</span>
          </Link>

          {/* Desktop nav */}
          <div className="nav-links">
            <Link to="/browse">Browse</Link>
            <Link to="/search">Search</Link>
            <Link to="/ai" className="nav-cta">✨ AI Assistant</Link>
          </div>

          {/* Hamburger button — mobile only */}
          <button
            className={`hamburger ${menuOpen ? "open" : ""}`}
            onClick={() => setMenuOpen(v => !v)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            <span /><span /><span />
          </button>
        </div>
      </nav>

      {/* Mobile slide-down menu */}
      {menuOpen && (
        <div className="mobile-menu-overlay" onClick={() => setMenuOpen(false)} />
      )}
      <div className={`mobile-menu ${menuOpen ? "open" : ""}`}>
        <Link to="/browse" className="mobile-menu-link">📁 Browse Resources</Link>
        <Link to="/search" className="mobile-menu-link">🔍 Search</Link>
        <Link to="/ai" className="mobile-menu-link mobile-menu-ai">✨ AI Assistant</Link>
      </div>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/browse" element={<Browse />} />
        <Route path="/browse/:nodeId" element={<Browse />} />
        <Route path="/search" element={<Search />} />
        <Route path="/ai" element={<AiChat />} />
      </Routes>

      <footer>
        <div className="container footer-inner">
          <img className="footer-logo" src="/logo.png" alt="O/A Level Resources" />
          <div style={{ flex: 1 }}>
            <div className="footer-title">O/A Level Resources</div>
            <div>
              Free IGCSE, O Level, AS &amp; A2 Level past papers, notes and an AI study assistant.
            </div>
            {config?.androidDownloadUrl && (
              <div style={{ marginTop: "12px" }}>
                <a
                  href={config.androidDownloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="app-download-btn"
                >
                  <span className="app-download-icon">📱</span>
                  Install Android App
                </a>
              </div>
            )}
          </div>
        </div>
      </footer>
    </>
  );
}
