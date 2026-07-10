import { Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home";
import Browse from "./pages/Browse";
import Search from "./pages/Search";
import AiChat from "./pages/AiChat";

export default function App() {
  return (
    <>
      <nav className="topnav">
        <div className="container topnav-inner">
          <Link className="brand" to="/">
            <span className="brand-badge">📘</span> O/A Level Resources
          </Link>
          <div className="nav-links">
            <Link to="/browse">Browse</Link>
            <Link to="/search">Search</Link>
            <Link to="/ai">AI Assistant</Link>
          </div>
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/browse" element={<Browse />} />
        <Route path="/browse/:nodeId" element={<Browse />} />
        <Route path="/search" element={<Search />} />
        <Route path="/ai" element={<AiChat />} />
      </Routes>

      <footer>
        <div className="container">
          Free IGCSE, O Level, AS & A2 Level past papers, notes and an AI study assistant.
          Also available on Android — search "O/A Level Resources".
        </div>
      </footer>
    </>
  );
}
