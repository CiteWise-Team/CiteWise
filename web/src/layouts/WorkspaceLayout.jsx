import Navbar from "../components/Navbar.jsx";
import { useGroup } from "../context/GroupContext.jsx";
import { Link } from "react-router-dom";
import "../styles/workspace.css";

export default function WorkflowLayout({ children }) {
  const { groupName } = useGroup();

  return (
    <div className="workflow-page">
      <Navbar />
      <main className="workflow-shell">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div className="workflow-breadcrumb" style={{ margin: 0 }}>
            <Link to="/groups" style={{ color: "inherit", textDecoration: "none", cursor: "pointer" }}>Workspaces</Link>
            <span aria-hidden="true">/</span>
            <strong>{groupName || "Current workspace"}</strong>
          </div>
          <Link
            to="/groups"
            className="d-inline-flex align-items-center"
            style={{
              backgroundColor: "rgba(91, 91, 214, 0.14)",
              color: "#a5b4fc",
              border: "1px solid #3a3a55",
              borderRadius: "8px",
              fontFamily: "'Poppins', sans-serif",
              fontSize: "0.85rem",
              fontWeight: 600,
              padding: "0.4rem 0.9rem",
              textDecoration: "none",
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#5b5bd6";
              e.currentTarget.style.color = "#fff";
              e.currentTarget.style.borderColor = "#5b5bd6";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(91, 91, 214, 0.14)";
              e.currentTarget.style.color = "#a5b4fc";
              e.currentTarget.style.borderColor = "#3a3a55";
            }}
          >
            Back to Workspaces
          </Link>
        </div>

        <header className="workflow-header">
          <div>
            <p className="workflow-eyebrow">Research workspace</p>
            <h1>Workflow sequence</h1>
            <p className="workflow-description">
              Process a document through extraction, summarization, gap analysis, and topic discovery.
            </p>
          </div>
          <div className="workflow-status">
            <span className="workflow-status-dot" />
            <span>Ready to work</span>
          </div>
        </header>

        <div className="workflow-content">{children}</div>
      </main>
    </div>
  );
}
