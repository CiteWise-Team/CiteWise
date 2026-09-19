import { useEffect, useState, useRef } from "react";
import { FaCloudUploadAlt, FaPlay } from "react-icons/fa";
import { MdInput } from "react-icons/md";
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
      <div
        className="h-100 rounded-4 p-3"
        style={{
          backgroundColor: "#1e1e2f",
          border: "1px solid #3a3a55",
          color: "#e4e4f0",
        }}
      >
        <div className="d-flex justify-content-between mb-3">
          <div>
            <h5 className="fw-bold mb-0 text-white">Input</h5>
            <small style={{ color: "#a1a1b5" }}>
              Upload file and select summaries
            </small>
          </div>
          <MdInput size={22} />
        </div>

        <div className="d-flex flex-column gap-4">

          <div>
            <small style={{ color: "#a1a1b5" }}>Available Summaries</small>

            <div
              className="mt-2 d-flex flex-column gap-2"
              style={{ maxHeight: "200px", overflowY: "auto" }}
            >
              {loading && (
                <div style={{ color: "#a1a1b5" }}>
                  Loading summaries...
                </div>
              )}

              {!loading && summaries.length === 0 && (
                <div style={{ color: "#a1a1b5" }}>
                  No summaries found for this group.
                </div>
              )}

              {!loading &&
                summaries.map((item) => (
                  <div
                    key={item.id}
                    className="p-2 rounded-3 d-flex align-items-start gap-2"
                    style={{
                      backgroundColor: "#25253a",
                      border: "1px solid #3a3a55",
                      cursor: "pointer",
                    }}
                    onClick={() => toggleSummary(item.id)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedSummaries.includes(item.id)}
                      readOnly
                      style={{ marginTop: "4px" }}
                    />
                    <div>
                      <div className="small text-white fw-semibold">
                        {item.title || "Untitled Summary"}
                      </div>
                      <div style={{ fontSize: "12px", color: "#a1a1b5" }}>
                        {item.filename}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className="text-end">
            <button
              onClick={handleRunWorkflow}
              disabled={running}
              className="btn"
              style={{
                backgroundColor: "#5b5bd6",
                color: "#fff",
                border: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              {running ? (
                <RiLoader4Line className="spinner-border spinner-border-sm spin-loader" style={{ animation: "spin 1s linear infinite" }} />
              ) : (
                <FaPlay className="me-1" />
              )}
              {running ? runningText : "Run Workflow"}
            </button>
          </div>
        </div>
      </div>

      <FeedbackModal {...config} onClose={hideFeedback} />
    </>
  );
}