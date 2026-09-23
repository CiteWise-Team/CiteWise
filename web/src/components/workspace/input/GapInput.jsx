import { useEffect, useState, useRef } from "react";
import { FaCloudUploadAlt, FaPlay } from "react-icons/fa";
import { RiLoader4Line } from "react-icons/ri";

import { useGroup } from "../../../context/GroupContext.jsx";
import { getSummaryByGroupAPI } from "../../../api/workflow.summarizer.js";
import { GapAPI, getGapJobStatusAPI } from "../../../api/workflow.api.js";

import { useFeedbackModal } from "../../../hooks/useFeedbackModel";
import FeedbackModal from "../../modals/FeedbackModal";

export default function GapInput({ setResult }) {
  const group_id = useGroup().groupId;

  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);

  const [summaries, setSummaries] = useState([]);
  const [selectedSummaries, setSelectedSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [runningText, setRunningText] = useState("Running...");
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

  const handleFileChange = (e) => handleFile(e.target.files);

  const toggleSummary = (id) => {
    setSelectedSummaries((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleRunWorkflow = async () => {
    if (selectedSummaries.length === 0) {
      showFeedback({
        type: "error",
        title: "No Summary Selected",
        message: "Please select at least one summary before running the workflow.",
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
      setRunningText("Starting gap analysis...");

      const response = await GapAPI({
        group_id,
        summary_id: selectedSummaries[0],
      });

      // Handle async 202 background job
      if (response?.jobId) {
        setRunningText("Analyzing research gaps with AI...");

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
                message: "Gap extraction took longer than expected. Please refresh in a moment to check results.",
              });
              return;
            }

            const pollRes = await getGapJobStatusAPI(response.jobId);
            if (pollRes.status === "COMPLETED") {
              clearInterval(pollTimerRef.current);
              pollTimerRef.current = null;
              setRunning(false);
              setResult(pollRes.data);
              showFeedback({
                type: "success",
                title: "Gap Analysis Complete",
                message: "Gap workflow finished successfully.",
              });
            } else if (pollRes.status === "FAILED") {
              clearInterval(pollTimerRef.current);
              pollTimerRef.current = null;
              setRunning(false);
              showFeedback({
                type: "error",
                title: "Workflow Failed",
                message: pollRes.error || "Failed to run gap workflow.",
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
          title: "Gap Analysis Failed",
          message: response?.message || "Failed to start gap analysis. No job ID received from server.",
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
    async function fetchSummaries() {
      try {
        setLoading(true);
        const res = await getSummaryByGroupAPI(group_id);
        setSummaries(res.data || []);
      } catch (err) {
        console.error("Failed to fetch summaries:", err);
      } finally {
        setLoading(false);
      }
    }

    if (group_id) fetchSummaries();
  }, [group_id]);

  return (
    <>
      <div className="h-100 rounded-4 workflow-input-card" style={{ minHeight: 0 }}>
        <div className="workflow-input-header">
          <small style={{ color: "#4b5563" }}>
            Select summaries to identify meaningful research gaps.
          </small>
        </div>

        <div className="workflow-input-body">
          <div className="d-flex flex-column flex-grow-1" style={{ minHeight: 0 }}>
            <small style={{ color: "#4b5563", fontWeight: 600 }}>Choose one or more summaries</small>

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
                <div style={{ color: "#6b7280" }}>
                  Loading summaries...
                </div>
              )}

              {!loading && summaries.length === 0 && (
                <div style={{ color: "#6b7280" }}>
                  No summaries found for this group.
                </div>
              )}

              {!loading &&
                summaries.map((item) => {
                  const isSelected = selectedSummaries.includes(item.id);
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
                      onClick={() => toggleSummary(item.id)}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        readOnly
                        style={{ marginTop: "4px", accentColor: "#ea580c" }}
                      />
                      <div>
                        <div className="small fw-semibold" style={{ color: isSelected ? "#ea580c" : "#0f0e17" }}>
                          {item.title || "Untitled Summary"}
                        </div>
                        <div style={{ fontSize: "12px", color: "#6b7280" }}>
                          {item.filename}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

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