import Navbar from "../components/Navbar.jsx";
import { useGroup } from "../context/GroupContext.jsx";
import "../styles/workspace.css";

export default function WorkflowLayout({ children }) {
  const { groupName } = useGroup();

  return (
    <div className="workflow-page">
      <Navbar />
      <main className="workflow-shell">
        <div className="workflow-breadcrumb">
          <span>Workspaces</span>
          <span aria-hidden="true">/</span>
          <strong>{groupName || "Current workspace"}</strong>
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
