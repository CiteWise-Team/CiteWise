import { useEffect, useState } from "react";
import { useGroup } from "../../../context/GroupContext";
import { getSummaryByGroupAPI } from "../../../api/workflow.summarizer";
import { RiLoader4Line, RiQuestionLine } from "react-icons/ri";

export default function SummarizerResult({ result, onComplete }) {
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
    <div className="h-100 d-flex flex-column rounded-4 workflow-result-card document-result-card" style={{ minHeight: 0 }}>
      {/* TABS */}
      <div className="d-flex gap-2 mb-3 workflow-result-tabs flex-shrink-0">
        <button
          className={`workflow-result-tab${activeTab === "papers" ? " is-active" : ""}`}
          onClick={() => setActiveTab("papers")}
        >
          Papers
        </button>

        <button
          className={`workflow-result-tab${activeTab === "result" ? " is-active" : ""}`}
          disabled={!selectedPaper}
          onClick={() => setActiveTab("result")}
        >
          Result
        </button>
      </div>

      {/* CONTENT AREA */}
      <div
        className="flex-grow-1 d-flex flex-column"
        style={{
          minHeight: 0,
          overflow: "hidden"
        }}
      >
        {loading ? (
          <div className="text-center mt-5">
            <RiLoader4Line className="fs-1 mb-2 spin-loader" style={{ color: "#ea580c" }} />
            <p style={{ color: "#4b5563" }}>
              Loading summaries...
            </p>
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
    </div>
  );
}