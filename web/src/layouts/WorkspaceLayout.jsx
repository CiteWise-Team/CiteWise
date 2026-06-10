// layouts/WorkflowLayout.jsx
import Navbar from "../components/Navbar.jsx";
import WorkflowTracker from "../components/workspace/WorkflowTracker.jsx";
export default function WorkflowLayout({ children }) {
  return (
    <>
        <Navbar />
        <div className="container py-4">
        {/* Breadcrumb - change this soon for the table details */}
        <div className="mb-2 text-muted small">
            GroupsName /  <span className="text-primary">Process Workflow</span>
        </div>

        <h2 className="fw-bold mb-4">Workflow Sequence</h2>

        {/* <WorkflowTracker /> */}

        <div className="mt-4">
            {children}
        </div>
        </div>
    </>
  );
}
