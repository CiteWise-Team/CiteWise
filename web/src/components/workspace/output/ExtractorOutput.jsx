import { useEffect, useState } from "react";
import { useGroup } from "../../../context/GroupContext";
import { getExtractedFilesByGroupAPI } from "../../../api/workflow.extractor";
import { RiLoader4Line, RiQuestionLine } from "react-icons/ri";

export default function ExtractorOutput({ result }) {
  const group_id = useGroup().groupId;

  const [activeTab, setActiveTab] = useState("papers");
  const [papers, setPapers] = useState([]);
  const [selectedPaper, setSelectedPaper] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchPapers() {
      if (!group_id) return;
      setLoading(true);

      try {
        const extractedData = await getExtractedFilesByGroupAPI(group_id);
        const data = extractedData.data || [];

        const sorted = data.sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );

        setPapers(sorted);

        if (!selectedPaper && sorted.length > 0) {
          setSelectedPaper(sorted[0]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchPapers();
  }, [group_id,result]);


  return (
    <div
      className="h-100 d-flex flex-column rounded-4 p-3"
      style={{
        backgroundColor: "#1e1e2f",
        border: "1px solid #3a3a55",
        color: "#e4e4f0"
      }}
    >
      <div className="d-flex gap-3 mb-3">
        <button
          className="btn btn-sm"
          style={{
            color: activeTab === "papers" ? "#a5b4fc" : "#a1a1b5",
            borderBottom:
              activeTab === "papers" ? "2px solid #5b5bd6" : "none"
          }}
          onClick={() => setActiveTab("papers")}
        >
          Papers
        </button>

        <button
          className="btn btn-sm"
          style={{
            color: activeTab === "result" ? "#a5b4fc" : "#a1a1b5",
            borderBottom:
              activeTab === "result" ? "2px solid #5b5bd6" : "none"
          }}
          disabled={!selectedPaper}
          onClick={() => setActiveTab("result")}
        >
          Result
        </button>
      </div>

      <div
        className="flex-grow-1 d-flex flex-column"
        style={{ minHeight: 0 }}
      >
        {loading ? (
          <div className="text-center mt-5">
            <RiLoader4Line className="fs-1 mb-2" />
            <p style={{ color: "#a1a1b5" }}>
              Loading extracted papers...
            </p>
          </div>
        ) : papers.length === 0 ? (
          <div className="text-center mt-5">
            <RiQuestionLine className="fs-1 mb-2" />
            <p style={{ color: "#a1a1b5" }}>
              No extracted papers found.
            </p>
          </div>
        ) : activeTab === "papers" ? (
          <div
            className="d-flex flex-column gap-2"
            style={{
              overflowY: "auto",
              flex: 1
            }}
          >
            {papers.map((paper) => (
              <button
                key={paper.id}
                onClick={() => {
                  setSelectedPaper(paper);
                  setActiveTab("result");
                }}
                className="text-start p-2 rounded-3"
                style={{
                  backgroundColor:
                    selectedPaper?.id === paper.id ? "#5b5bd6" : "#25253a",
                  color: "#fff",
                  border: "1px solid #3a3a55"
                }}
              >
                {paper.title || "Untitled Paper"}
              </button>
            ))}
          </div>
        ) : selectedPaper && (
          <div
            className="d-flex flex-column gap-3"
            style={{
              overflowY: "auto",
              flex: 1,
              paddingRight: "4px"
            }}
          >
            {[
              "title",
              "abstract",
              "introduction",
              "methodology",
              "results",
              "discussion",
              "conclusion",
              "keywords",
              "literature_review"
            ].map((section) => (
              <div
                key={section}
                className="p-3 rounded-3"
                style={{
                  backgroundColor: "#25253a",
                  border: "1px solid #3a3a55"
                }}
              >
                <h6 className="fw-bold text-capitalize text-white">
                  {section.replace("_", " ")}
                </h6>
                <p style={{ color: "#a1a1b5" }}>
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