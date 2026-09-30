import { useRef, useState, useEffect } from "react";
import { FaCloudUploadAlt, FaPlay } from "react-icons/fa";
import { RiLoader4Line } from "react-icons/ri";

import { useGroup } from "../../../context/GroupContext.jsx";
import { getExtractedFilesByGroupAPI } from "../../../api/workflow.extractor.js";
import { summarizerAPI, getSummarizerJobStatusAPI } from "../../../api/workflow.api.js";

import { useFeedbackModal } from "../../../hooks/useFeedbackModel";
import FeedbackModal from "../../modals/FeedbackModal";
import WorkflowCardHeader from "../WorkflowCardHeader";

export default function SummarizerInput({ setResult }) {
  const group_id = useGroup().groupId;

  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);

  const [extractedFiles, setExtractedFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [runningText, setRunningText] = useState("Running...");
  const [selectedInstruction, setSelectedInstruction] = useState(null);
  const pollTimerRef = useRef(null);

  const { config, showFeedback, hideFeedback } = useFeedbackModal();

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, []);

  function handleFile(selectedFiles) {
    const picked = selectedFiles[0];
    if (picked) setFile(picked);
  }

  function handleDrop(e) {
    e.preventDefault();
    handleFile(e.dataTransfer.files);
  }

  function openFilePicker() {
    fileInputRef.current.click();
  }

  const toggleInstruction = (id) => {
    setSelectedInstruction((prev) => (prev === id ? null : id));
  };

  const handleRunWorkflow = async () => {
    if (!selectedInstruction) {
      showFeedback({
        type: "error",
        title: "No Selection",
        message: "Please select one extracted file before running the workflow.",
      });
      return;
    }

    if (!group_id) {
      showFeedback({
        type: "error",
        title: "Missing Workspace",
        message: "No active workspace selected. Please select a workspace first.",
      });
      return;
    }

    try {
      setRunning(true);
      setRunningText("Starting summarizer...");

      const response = await summarizerAPI(selectedInstruction, group_id);

      // Handle async 202 background job
      if (response?.jobId) {
        setRunningText("Summarizing sections with AI...");

        const startTime = Date.now();
        const MAX_POLL_TIME = 180 * 1000; // 3 minutes timeout

        pollTimerRef.current = setInterval(async () => {
          try {
            if (Date.now() - startTime > MAX_POLL_TIME) {
              clearInterval(pollTimerRef.current);
              pollTimerRef.current = null;
              setRunning(false);
              showFeedback({
                type: "error",
                title: "Timeout",
                message: "Summarization took longer than expected. Please refresh in a moment to check results.",
              });
              return;
            }

            const pollRes = await getSummarizerJobStatusAPI(response.jobId);
            if (pollRes.status === "COMPLETED") {
              clearInterval(pollTimerRef.current);
              pollTimerRef.current = null;
              setRunning(false);
              setResult(pollRes.data);
              showFeedback({
                type: "success",
                title: "Summarization Complete",
                message: "Summarizer workflow finished successfully.",
              });
            } else if (pollRes.status === "FAILED") {
              clearInterval(pollTimerRef.current);
              pollTimerRef.current = null;
              setRunning(false);
              showFeedback({
                type: "error",
                title: "Workflow Failed",
                message: pollRes.error || "Failed to run summarizer workflow.",
              });
            }
          } catch (pollErr) {
            console.warn("Polling error:", pollErr);
          }
        }, 2000);

        return;
      }

      if (!response?.jobId) {
        setRunning(false);
        showFeedback({
          type: "error",
          title: "Summarization Failed",
          message: response?.message || "Failed to start summarization. No job ID received from server.",
        });
        return;
      }
    } catch (err) {
      console.error(err);
      setRunning(false);
      showFeedback({
        type: "error",
        title: "Workflow Failed",
        message: err.message || "Failed to run workflow",
      });
    }
  };

  useEffect(() => {
    async function fetchExtractedFiles() {
      try {
        setLoading(true);
        const data = await getExtractedFilesByGroupAPI(group_id);
        setExtractedFiles(data.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    if (group_id) fetchExtractedFiles();
  }, [group_id]);

  return (
    <>
      <div className="h-100 rounded-4 workflow-input-card" style={{ minHeight: 0 }}>
        {/* HEADER */}
        <WorkflowCardHeader
          title="Choose a document to summarize"
          subtitle="Select an extracted paper and provide the details needed to create a concise summary."
        />

        {/* BODY */}
        <div className="workflow-input-body">
          <div className="d-flex flex-column flex-grow-1" style={{ minHeight: 0 }}>
            <small style={{ color: "#4b5563", fontWeight: 600 }}>Choose an extracted document</small>

            <div
              className="workflow-scroll-list mt-2 d-flex flex-column gap-2"
              style={{
                flex: "1 1 auto",
                minHeight: "140px",
                maxHeight: "clamp(200px, 35vh, 340px)",
                overflowY: "auto",
                paddingRight: "6px",
              }}
            >
              {loading && (
                <div style={{ padding: "1.5rem 1rem", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <svg width="18" height="18" viewBox="0 0 50 50">
                      <circle cx="25" cy="25" r="20" fill="none" stroke="rgba(234, 88, 12, 0.15)" strokeWidth="4" />
                      <circle cx="25" cy="25" r="20" fill="none" stroke="#ea580c" strokeWidth="4" strokeLinecap="round" strokeDasharray="55 70">
                        <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="0.95s" repeatCount="indefinite" />
                      </circle>
                    </svg>
                    <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#9a3412", fontFamily: "'Poppins', sans-serif" }}>
                      Loading extracted papers...
                    </span>
                  </div>
                  <div style={{ width: "140px", height: "4px", background: "#fed7aa", borderRadius: "999px", overflow: "hidden", position: "relative" }}>
                    <div className="cw-loading-progress-fill" />
                  </div>
                </div>
              )}

              {!loading && extractedFiles.length === 0 && (
                <div style={{ color: "#6b7280" }}>
                  No extracted files found.
                </div>
              )}

              {!loading &&
                extractedFiles.map((item) => {
                  const isSelected = selectedInstruction === item.id;
                  return (
                    <div
                      key={item.id}
                      className="p-2 rounded-3 d-flex align-items-start gap-2"
                      style={{
                        backgroundColor: isSelected ? "#fff7ed" : "#f9fafb",
                        border: isSelected ? "1px solid #ea580c" : "1px solid #e5e7eb",
                        cursor: "pointer",
                        transition: "all 0.18s ease",
                      }}
                      onClick={() => toggleInstruction(item.id)}
                    >
                      <input
                        type="radio"
                        checked={isSelected}
                        readOnly
                        style={{ marginTop: "4px", accentColor: "#ea580c" }}
                      />
                      <div>
                        <div className="small fw-semibold" style={{ color: isSelected ? "#ea580c" : "#0f0e17" }}>
                          {item.title}
                        </div>
                        <div style={{ fontSize: "12px", color: "#6b7280" }}>
                          {item.description}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* RUN BUTTON */}
        <div className="workflow-input-actions">
          <button
            onClick={handleRunWorkflow}
            disabled={running}
            className="workflow-action-button"
          >
            {running ? (
              <RiLoader4Line className="spinner-border spinner-border-sm spin-loader" style={{ animation: "spin 1s linear infinite" }} />
            ) : (
              <FaPlay size={12} className="me-1" />
            )}
            {running ? runningText : "Run Workflow"}
          </button>
        </div>
      </div>

      <FeedbackModal {...config} onClose={hideFeedback} />
    </>
  );
}