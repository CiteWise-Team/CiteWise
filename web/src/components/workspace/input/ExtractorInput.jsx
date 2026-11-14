import { FaCloudUploadAlt, FaPlay, FaTrashAlt } from "react-icons/fa";
import { RiLoader4Line } from "react-icons/ri";
import { extractorAPI, getExtractorJobStatusAPI } from "../../../api/workflow.api";

import { useEffect, useRef, useState } from "react";
import { useGroup } from "../../../context/GroupContext.jsx";

import { useFeedbackModal } from "../../../hooks/useFeedbackModel";
import FeedbackModal from "../../modals/FeedbackModal";
import WorkflowCardHeader from "../WorkflowCardHeader";

export default function InputPanel({
  setResult,
  isCollapsed = false,
  onToggleCollapse,
  isProcessing,
  setIsProcessing,
  processingStatus,
  setProcessingStatus,
}) {
  const group_id = useGroup().groupId;
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("Running...");
  const pollTimerRef = useRef(null);

  const { config, showFeedback, hideFeedback } = useFeedbackModal();

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      setIsProcessing?.(false);
      setProcessingStatus?.("");
    };
  }, []);

  function handleFile(selectedFiles) {
    const picked = selectedFiles[0];

    if (!picked) return;

    if (picked.type !== "application/pdf") {
      showFeedback({
        type: "error",
        title: "Invalid File Type",
        message: "Only PDF files are allowed.",
      });
      return;
    }

    setFile(picked);
  }

  function handleDrop(e) {
    e.preventDefault();
    handleFile(e.dataTransfer.files);
  }

  function openFilePicker() {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  }

  async function handleRunWorkflow() {
    if (!file) {
      showFeedback({
        type: "error",
        title: "Missing File",
        message: "Please upload a file first.",
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
      setLoading(true);
      setLoadingText("Starting extraction...");
      setIsProcessing?.(true);
      setProcessingStatus?.("Extracting sections with AI...");

      const response = await extractorAPI(file, group_id);

      // If backend dispatched background extraction job (202 Accepted)
      if (response?.jobId) {
        setLoadingText("Extracting sections with AI...");
        setIsProcessing?.(true);
        setProcessingStatus?.("Extracting sections with AI...");

        const startTime = Date.now();
        const MAX_POLL_TIME = 180 * 1000; // 3 minutes timeout

        pollTimerRef.current = setInterval(async () => {
          try {
            if (Date.now() - startTime > MAX_POLL_TIME) {
              clearInterval(pollTimerRef.current);
              pollTimerRef.current = null;
              setLoading(false);
              setIsProcessing?.(false);
              setProcessingStatus?.("");
              showFeedback({
                type: "error",
                title: "Timeout",
                message: "Extraction took longer than expected. Please refresh in a moment to check results.",
              });
              return;
            }

            const pollRes = await getExtractorJobStatusAPI(response.jobId);
            if (pollRes.status === "COMPLETED") {
              clearInterval(pollTimerRef.current);
              pollTimerRef.current = null;
              setLoading(false);
              setIsProcessing?.(false);
              setProcessingStatus?.("");
              setResult(pollRes.data);
              showFeedback({
                type: "success",
                title: "Extraction Complete",
                message: "Your document was processed successfully.",
              });
            } else if (pollRes.status === "FAILED") {
              clearInterval(pollTimerRef.current);
              pollTimerRef.current = null;
              setLoading(false);
              setIsProcessing?.(false);
              setProcessingStatus?.("");
              showFeedback({
                type: "error",
                title: "Extraction Failed",
                message: pollRes.error || "The AI workflow encountered an error processing this paper.",
              });
            }
          } catch (pollErr) {
            console.warn("Polling error:", pollErr);
          }
        }, 2000);

        return;
      }

      if (!response?.jobId) {
        setLoading(false);
        setIsProcessing?.(false);
        setProcessingStatus?.("");
        showFeedback({
          type: "error",
          title: "Extraction Failed",
          message: response?.message || "Failed to start extraction. No job ID received from server.",
        });
        return;
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
      setIsProcessing?.(false);
      setProcessingStatus?.("");
      showFeedback({
        type: "error",
        title: "Server Error",
        message: err.message || "Error running workflow.",
      });
    }
  }

  return (
    <>
      <div className={`h-100 rounded-4 workflow-input-card ${isCollapsed ? "is-collapsed" : ""}`} style={{ minHeight: 0 }}>
        {/* Header */}
        <WorkflowCardHeader
          title="Upload your papers"
          subtitle={
            <span>
              Add research papers here so CATalyst can extract and organize their content.
            </span>
          }
          isCollapsed={isCollapsed}
          onToggleCollapse={onToggleCollapse}
        />

        {!isCollapsed && (
          <>
            {/* Scrollable Body */}
            <div className="workflow-input-body">
              {/* Upload Area */}
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={openFilePicker}
                className="workflow-upload-dropzone citewise-upload-dropzone rounded-4 text-center p-3"
                style={{
                  border: "2px dashed #ea580c",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                <FaCloudUploadAlt size={28} color="#ea580c" />

                <h6 className="fw-bold mt-2 mb-1" style={{ fontSize: "0.95rem" }}>
                  Ready to extract?
                </h6>

                <p style={{ fontSize: "0.8rem", marginBottom: "8px" }}>
                  Drop files or click to browse
                </p>

                <button
                  type="button"
                  className="workflow-action-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openFilePicker();
                  }}
                >
                  Upload File
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  style={{ display: "none" }}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => handleFile(e.target.files)}
                />
              </div>

              {/* Selected File */}
              {file && (
                <div>
                  <small style={{ color: "var(--cw-text-secondary, #64748b)", fontWeight: 600 }}>File ready:</small>

                  <div
                    className="mt-2 p-2 rounded-3 d-flex justify-content-between align-items-center"
                    style={{
                      backgroundColor: "var(--cw-bg-surface-elevated, #f9fafb)",
                      border: "1px solid var(--cw-border, #e5e7eb)",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <span className="small fw-semibold text-truncate me-2" style={{ color: "var(--cw-text-primary, #0f0e17)" }}>{file.name}</span>

                    <button
                      type="button"
                      className="workflow-icon-action workflow-paper-delete-btn flex-shrink-0"
                      aria-label="Remove selected file"
                      title="Remove selected file"
                      onClick={() => {
                        setFile(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = "";
                        }
                      }}
                    >
                      <FaTrashAlt aria-hidden="true" size={13} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Pinned Action Row */}
            <div className="workflow-input-actions">
              <button
                onClick={handleRunWorkflow}
                disabled={loading}
                className="workflow-action-button"
              >
                {loading ? (
                  <span className="catalyst-btn-spinner" />
                ) : (
                  <FaPlay size={12} className="me-1" />
                )}
                {loading ? loadingText : "Run Workflow"}
              </button>
            </div>
          </>
        )}
      </div>

      <FeedbackModal {...config} onClose={hideFeedback} />
    </>
  );
}