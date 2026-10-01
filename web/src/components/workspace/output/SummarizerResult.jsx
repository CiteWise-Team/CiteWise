import { useEffect, useState } from "react";
import { useGroup } from "../../../context/GroupContext";
import { getSummaryByGroupAPI } from "../../../api/workflow.summarizer";
import { RiLoader4Line, RiQuestionLine } from "react-icons/ri";
import WorkflowCardHeader from "../WorkflowCardHeader";
import WorkflowPartnerLoadingUI from "./WorkflowPartnerLoadingUI";

export default function SummarizerResult({
  result,
  onComplete,
  isCollapsed = false,
  onToggleCollapse,
  isProcessing = false,
  processingStatus = "",
}) {
  const group_id = useGroup().groupId;

  const [activeTab, setActiveTab] = useState("papers");
  const [papers, setPapers] = useState([]);
  const [selectedPaper, setSelectedPaper] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchSummaries() {
      if (!group_id) return;
      setLoading(true);

      try {
        const extractedData = await getSummaryByGroupAPI(group_id);
        const data = extractedData.data || [];

        const sorted = data.sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );

        setPapers(sorted);
        if (sorted.length > 0) onComplete?.();

        if (result) {
          setSelectedPaper(result);
          setActiveTab("result");
        } else if (sorted.length > 0 && !selectedPaper) {
          setSelectedPaper(sorted[0]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchSummaries();
  }, [group_id, result]);

  return (
    <div className={`h-100 d-flex flex-column rounded-4 workflow-result-card document-result-card ${isCollapsed ? "is-collapsed" : ""}`} style={{ minHeight: 0 }}>
      <WorkflowCardHeader
        title="Read the summary"
        subtitle="The generated summary appears here so you can review key ideas quickly."
        isCollapsed={isCollapsed}
        onToggleCollapse={onToggleCollapse}
        rightContent={
          <div className="d-flex gap-2 workflow-result-tabs flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              className={`workflow-result-tab${activeTab === "papers" ? " is-active" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                setActiveTab("papers");
              }}
            >
              Papers
            </button>

            <button
              className={`workflow-result-tab${activeTab === "result" ? " is-active" : ""}`}
              disabled={!selectedPaper}
              onClick={(e) => {
                e.stopPropagation();
                setActiveTab("result");
              }}
            >
              Result
            </button>
          </div>
        }
      />

      {!isCollapsed && (
        /* CONTENT AREA */
        <div
          className="workflow-result-content flex-grow-1"
          style={{
          minHeight: 0,
          overflow: "hidden"
        }}
      >
        {isProcessing ? (
          <WorkflowPartnerLoadingUI
            stepType="summarizer"
            title={processingStatus || "Summarizing sections with AI..."}
          />
        ) : loading ? (
          <div style={{ padding: "3rem 1rem", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
            {/* Guaranteed Animated SVG Spinner with glowing center */}
            <div
              style={{
                position: "relative",
                width: "68px",
                height: "68px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "1rem",
              }}
            >
              <svg width="68" height="68" viewBox="0 0 50 50" style={{ position: "absolute", inset: 0 }}>
                <circle cx="25" cy="25" r="20" fill="none" stroke="rgba(234, 88, 12, 0.12)" strokeWidth="3.5" />
                <circle
                  cx="25"
                  cy="25"
                  r="20"
                  fill="none"
                  stroke="#ea580c"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeDasharray="55 70"
                >
                  <animateTransform
                    attributeName="transform"
                    type="rotate"
                    from="0 25 25"
                    to="360 25 25"
                    dur="0.95s"
                    repeatCount="indefinite"
                  />
                </circle>
              </svg>
              <div
                style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "50%",
                  background: "rgba(234, 88, 12, 0.09)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 0 14px rgba(234, 88, 12, 0.25)",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </div>
            </div>

            <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "0.95rem", fontWeight: 700, color: "var(--cw-text-primary, #0f0e17)", margin: "0 0 0.25rem 0" }}>
              Loading Summaries
            </p>
            <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "0.8rem", color: "var(--cw-text-muted, #6b7280)", margin: "0 0 1rem 0" }}>
              Retrieving paper syntheses and key takeaways...
            </p>

            {/* Moving Progress Bar */}
            <div
              style={{
                width: "180px",
                maxWidth: "80%",
                height: "6px",
                background: "var(--cw-border, #e5e7eb)",
                borderRadius: "999px",
                overflow: "hidden",
                position: "relative",
              }}
            >
              <div className="cw-loading-progress-fill" />
            </div>
          </div>
        ) : papers.length === 0 ? (
          <div className="text-center mt-5">
            <RiQuestionLine className="fs-1 mb-2" style={{ color: "#9ca3af" }} />
            <p style={{ color: "#4b5563" }}>
              No summaries found.
            </p>
          </div>
        ) : activeTab === "papers" ? (

          <div
            className="workflow-result-list d-flex flex-column gap-2"
            style={{
              overflowY: "auto",
              flex: 1,
              minHeight: 0,
              paddingRight: "6px"
            }}
          >
            {papers.map((paper) => {
              const isSelected = selectedPaper?.id === paper.id;
              return (
                <button
                  key={paper.id}
                  onClick={() => {
                    setSelectedPaper(paper);
                    setActiveTab("result");
                  }}
                  className="text-start p-2 rounded-3 workflow-result-list-item"
                  style={{
                    backgroundColor: isSelected ? "#fff7ed" : "#ffffff",
                    color: isSelected ? "#ea580c" : "#0f0e17",
                    border: isSelected ? "1px solid #ea580c" : "1px solid #e5e7eb",
                    fontWeight: isSelected ? 600 : 500,
                    transition: "all 0.18s ease",
                  }}
                >
                  {paper.title || "Untitled Summary"}
                </button>
              );
            })}
          </div>

        ) : selectedPaper && (

          <div
            className="workflow-result-list d-flex flex-column gap-3"
            style={{
              overflowY: "auto",
              flex: 1,
              minHeight: 0,
              paddingRight: "6px"
            }}
          >
            {[
              "title",
              "introduction",
              "literature_review",
              "methodology",
              "results",
              "discussion",
              "conclusion",
            ].map((section) => (
              <div
                key={section}
                className="p-3 rounded-3 workflow-document-section"
                style={{
                  backgroundColor: "#f9fafb",
                  border: "1px solid #e5e7eb"
                }}
              >
                <h6 className="fw-bold text-capitalize" style={{ color: "#0f0e17" }}>
                  {section.replace("_", " ")}
                </h6>

                <p style={{ color: "#4b5563" }}>
                  {selectedPaper[section] || "No content available."}
                </p>
              </div>
            ))}
          </div>

        )}
      </div>
      )}
    </div>
  );
}