import DashboardLayout from "../layouts/GroupsLayout";
import { Link } from "react-router-dom";
import { ArrowLeft, UploadCloud } from "lucide-react";

export default function Upload() {
  return (
    <DashboardLayout>
      <div className="container" style={{ maxWidth: "720px", margin: "0 auto", padding: "2rem 1rem 3rem" }}>
        <Link
          to="/groups"
          className="d-inline-flex align-items-center gap-2 mb-4 text-decoration-none fw-semibold"
          style={{ color: "#ea580c", fontSize: "0.85rem", transition: "color 0.2s" }}
        >
          <ArrowLeft size={16} />
          <span>Back to Workspaces</span>
        </Link>

        <div className="mb-4">
          <p
            className="text-uppercase fw-bold mb-1"
            style={{ color: "#ea580c", fontSize: "0.75rem", letterSpacing: "0.08em" }}
          >
            CATalyst Upload
          </p>
          <h2 className="fw-bold mb-2" style={{ color: "#0f0e17", fontSize: "1.75rem" }}>
            Upload Research Paper
          </h2>
          <p style={{ color: "#4b5563", fontSize: "0.9rem" }}>
            Upload academic documents to process citations, analyze literature gaps, and generate thesis directions.
          </p>
        </div>

        <div
          className="card border-0"
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "16px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
            padding: "24px",
          }}
        >
          <form onSubmit={(e) => e.preventDefault()}>
            <div
              className="text-center p-5 mb-4 rounded-3"
              style={{
                border: "2px dashed #ea580c",
                backgroundColor: "#fffaf5",
                borderRadius: "12px",
                cursor: "pointer",
              }}
            >
              <UploadCloud size={40} color="#ea580c" className="mb-3" />
              <h6 className="fw-bold mb-1" style={{ color: "#0f0e17" }}>
                Select a document to upload
              </h6>
              <p className="small mb-3" style={{ color: "#6b7280" }}>
                Supported format: PDF up to 25MB
              </p>
              <input
                type="file"
                accept=".pdf"
                className="form-control"
                style={{
                  maxWidth: "320px",
                  margin: "0 auto",
                  borderRadius: "8px",
                  borderColor: "#d1d5db",
                  fontSize: "0.85rem",
                }}
              />
            </div>

            <div className="d-flex justify-content-end gap-2">
              <Link
                to="/groups"
                className="btn text-decoration-none"
                style={{
                  height: "38px",
                  minHeight: "38px",
                  padding: "0 18px",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  backgroundColor: "transparent",
                  color: "#4b5563",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                Cancel
              </Link>
              <button
                type="submit"
                className="btn"
                style={{
                  height: "38px",
                  minHeight: "38px",
                  padding: "0 22px",
                  border: "1px solid #ea580c",
                  borderRadius: "8px",
                  backgroundColor: "#ea580c",
                  color: "#ffffff",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 2px 8px rgba(234, 88, 12, 0.25)",
                }}
              >
                Upload Paper
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
