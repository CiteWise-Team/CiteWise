import { useEffect, useState } from "react";
import { useGroup } from "../../../context/GroupContext";
import { getSummaryByGroupAPI } from "../../../api/workflow.summarizer";
import { RiLoader4Line } from "react-icons/ri";
import { BookOpen } from "lucide-react";
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
          <WorkflowPartnerLoadingUI
            stepType="summarizer"
            title="Loading summaries..."
            description="Fetching your structured academic summaries and synthesized insights..."
          />
        ) : papers.length === 0 ? (
          <div className="text-center py-5 px-3 d-flex flex-column align-items-center justify-content-center">
            <div
              className="d-inline-flex align-items-center justify-content-center mb-3 rounded-4"
              style={{
                width: "56px",
                height: "56px",
                background: "rgba(234, 88, 12, 0.08)",
                border: "1px dashed rgba(234, 88, 12, 0.35)",
                color: "#ea580c",
              }}
            >
              <BookOpen size={26} strokeWidth={2} />
            </div>
            <h6 className="fw-bold mb-1" style={{ color: "var(--cw-text-primary, #0f0e17)", fontSize: "1rem" }}>
              No summaries generated yet
            </h6>
            <p className="small mb-0" style={{ color: "var(--cw-text-muted, #6b7280)", maxWidth: "340px", lineHeight: 1.5 }}>
              Select an extracted document in the left panel and click &ldquo;Run Workflow&rdquo; to summarize key sections.
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