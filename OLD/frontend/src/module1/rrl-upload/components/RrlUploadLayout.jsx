import { useState, useEffect, useCallback, useRef } from "react";
import DragDropZone from "./DragDropZone";
import SelectedFilesList from "./SelectedFilesList";
import UploadAllButton from "./UploadAllButton";
import UploadStatusBar from "./UploadStatusBar";

const MAX_FILE_MB = 20;
const STORAGE_SESSION_KEY = "citewise.session_id";
const DUPLICATE_REMOVE_DELAY = 3000;
const LEGACY_UPLOADS_KEY = "citewise.uploadedDocs";

// Key by name+size only (lastModified can differ on re-pick in some browsers)
function buildFileKey(file) {
  return `${file.name.toLowerCase()}-${file.size}`;
}

function generateSessionId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return "session_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
}

export default function RrlUploadLayout({ sessionId: propSessionId, onUploadComplete, hideHeader }) {
  const [sessionId, setSessionId] = useState(() => {
    if (propSessionId) return propSessionId;
    const stored = localStorage.getItem(STORAGE_SESSION_KEY);
    if (stored) return stored;
    const newSessionId = generateSessionId();
    localStorage.setItem(STORAGE_SESSION_KEY, newSessionId);
    return newSessionId;
  });

  const [fileQueue, setFileQueue] = useState([]);
  const [uploadState, setUploadState] = useState("ready");
  const [statusMessage, setStatusMessage] = useState("Ready to upload");
  const [duplicateToast, setDuplicateToast] = useState({ show: false, message: "" });

  const triggerDuplicateToast = useCallback((filenames) => {
    if (!filenames?.length) return;
    let msg = "";
    if (filenames.length === 1) {
      msg = `"${filenames[0]}" will be removed from the list shortly.`;
    } else {
      msg = `${filenames.length} duplicate files will be removed shortly.`;
    }
    setDuplicateToast({ show: true, message: msg });
    setTimeout(() => {
      setDuplicateToast((prev) => ({ ...prev, show: false }));
    }, 3000);
  }, []);

  // Ref so appendFiles always reads the latest uploaded names without stale closure
  const uploadedFileNamesRef = useRef(new Set());

  const fetchUploadedFiles = useCallback(async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(`/api/v1/documents/session/${sessionId}`, {
        headers: { "X-Session-Id": sessionId },
      });
      if (res.ok) {
        const docs = await res.json();
        uploadedFileNamesRef.current = new Set(
          docs.map((d) => d.fileName?.toLowerCase()).filter(Boolean)
        );
      }
    } catch (err) {
      // ignore fetch errors
    }
  }, [sessionId]);

  useEffect(() => {
    fetchUploadedFiles();
  }, [fetchUploadedFiles]);

  useEffect(() => {
    localStorage.removeItem(LEGACY_UPLOADS_KEY);
    setFileQueue([]);
  }, [sessionId]);

  useEffect(() => {
    if (propSessionId && propSessionId !== sessionId) {
      setSessionId(propSessionId);
      setFileQueue([]);
      setUploadState("ready");
      setStatusMessage("Ready to upload");
      uploadedFileNamesRef.current = new Set();
    }
  }, [propSessionId, sessionId]);

  useEffect(() => {
    if (sessionId) localStorage.setItem(STORAGE_SESSION_KEY, sessionId);
  }, [sessionId]);

  // Auto-remove duplicate items from the queue after a delay
  useEffect(() => {
    const dupeItems = fileQueue.filter((item) => item.status === "duplicate");
    if (dupeItems.length === 0) return;

    const timer = setTimeout(() => {
      setFileQueue((prev) => prev.filter((item) => item.status !== "duplicate"));
    }, DUPLICATE_REMOVE_DELAY);

    return () => clearTimeout(timer);
  }, [fileQueue]);

  const appendFiles = (incomingFiles) => {
    if (!incomingFiles?.length) return;
    setUploadState("ready");
    setStatusMessage("Ready to upload");
    const dupesList = [];

    // Pre-emptively detect duplicates synchronously so we can trigger the toast immediately
    const tempKeys = new Set(fileQueue.map((i) => i.key));
    const tempNames = new Set(fileQueue.map((i) => i.name.toLowerCase()));

    Array.from(incomingFiles).forEach((file) => {
      const key = buildFileKey(file);
      const nameLower = file.name.toLowerCase();

      if (uploadedFileNamesRef.current.has(nameLower)) {
        dupesList.push(file.name);
      } else if (tempKeys.has(key) || tempNames.has(nameLower)) {
        dupesList.push(file.name);
      } else {
        tempKeys.add(key);
        tempNames.add(nameLower);
      }
    });

    if (dupesList.length > 0) {
      triggerDuplicateToast(dupesList);
    }

    setFileQueue((prev) => {
      const next = [...prev];
      const seenKeys = new Set(prev.map((i) => i.key));
      const seenNames = new Set(prev.map((i) => i.name.toLowerCase()));

      Array.from(incomingFiles).forEach((file) => {
        const key = buildFileKey(file);
        const nameLower = file.name.toLowerCase();
        const isPdf = file.type === "application/pdf" || nameLower.endsWith(".pdf");

        // Already uploaded to backend — mark as duplicate in queue
        if (uploadedFileNamesRef.current.has(nameLower)) {
          next.push({
            id: `${key}-${Math.random().toString(16).slice(2)}`,
            key,
            file,
            name: file.name,
            size: file.size,
            status: "duplicate",
            message: "Already uploaded previously",
          });
          return;
        }

        // Already in the current queue — mark as duplicate
        if (seenKeys.has(key) || seenNames.has(nameLower)) {
          next.push({
            id: `${key}-${Math.random().toString(16).slice(2)}`,
            key,
            file,
            name: file.name,
            size: file.size,
            status: "duplicate",
            message: "Already in queue",
          });
          return;
        }

        let status = "queued";
        let message = "Ready for upload";
        if (!isPdf) {
          status = "invalid";
          message = "Unsupported file type";
        } else if (file.size > MAX_FILE_MB * 1024 * 1024) {
          status = "invalid";
          message = `File exceeds ${MAX_FILE_MB} MB limit`;
        }

        seenKeys.add(key);
        seenNames.add(nameLower);
        next.push({
          id: `${key}-${Math.random().toString(16).slice(2)}`,
          key,
          file,
          name: file.name,
          size: file.size,
          status,
          message,
        });
      });

      return next;
    });
  };

  const removeFileItem = (id) => {
    setFileQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpload = async () => {
    const readyFiles = fileQueue.filter((item) => item.status === "queued");
    if (!sessionId.trim()) {
      setUploadState("error");
      setStatusMessage("Session ID missing. Please refresh the page.");
      return;
    }
    if (!readyFiles.length) {
      setUploadState("error");
      setStatusMessage("Add at least one valid PDF before uploading.");
      return;
    }
    setUploadState("uploading");
    setStatusMessage("Uploading...");
    setFileQueue((prev) =>
      prev.map((item) =>
        item.status === "queued"
          ? { ...item, status: "uploading", message: "Uploading..." }
          : item
      )
    );
    const formData = new FormData();
    readyFiles.forEach((item) => formData.append("files", item.file));
    try {
      const response = await fetch("/api/rrl/upload", {
        method: "POST",
        headers: { "X-Session-Id": sessionId.trim() },
        body: formData,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.message || "Upload failed.");
      const results = payload?.data?.results || [];
      const accepted = payload?.data?.acceptedFiles || 0;
      const failed = payload?.data?.failedFiles || 0;

      setUploadState(failed > 0 ? "warning" : "success");
      setStatusMessage(
        failed > 0
          ? `Uploaded ${accepted} file(s), ${failed} need attention.`
          : `Uploaded ${accepted} file(s) successfully.`
      );

      const serverDupes = [];
      setFileQueue((prev) =>
        prev.map((item) => {
          if (item.status !== "uploading") return item;
          const match = results.find((r) => r.fileName === item.name);
          if (!match) return { ...item, status: "failed", message: "No response received" };
          // Server rejected as duplicate → show as duplicate (will auto-remove)
          const msg = match.message?.toLowerCase() || "";
          const isDupe = !match.success && (msg.includes("already uploaded") || msg.includes("duplicate"));
          if (isDupe) {
            serverDupes.push(item.name);
          }
          return {
            ...item,
            status: isDupe ? "duplicate" : match.success ? "uploaded" : "failed",
            message: isDupe ? "Duplicate — removing from queue" : match.message,
          };
        })
      );

      if (serverDupes.length > 0) {
        triggerDuplicateToast(serverDupes);
      }

      if (onUploadComplete && accepted > 0) {
        onUploadComplete();
      }

      // Refresh ref so future selections detect newly uploaded files immediately
      await fetchUploadedFiles();

      localStorage.removeItem(LEGACY_UPLOADS_KEY);
    } catch (err) {
      setUploadState("error");
      setStatusMessage(err.message);
      setFileQueue((prev) =>
        prev.map((item) =>
          item.status === "uploading"
            ? { ...item, status: "failed", message: "Network error" }
            : item
        )
      );
    }
  };

  const clearAll = () => {
    setFileQueue([]);
    setUploadState("ready");
    setStatusMessage("Ready to upload");
  };

  const clearSession = () => {
    clearCiteWiseSessionStorage();
    window.location.reload();
  };

  const readyCount = fileQueue.filter((i) => i.status === "queued").length;
  const totalCount = fileQueue.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", fontFamily: "'Poppins', sans-serif" }}>
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes slideInToast {
          from { opacity: 0; transform: translateX(50px) scale(0.95); }
          to { opacity: 1; transform: translateX(0) scale(1); }
        }
      `}} />
      {duplicateToast.show && (
        <div style={{
          position: "fixed",
          top: "24px",
          right: "24px",
          zIndex: 10000,
          background: "rgba(30, 28, 25, 0.9)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(217, 138, 33, 0.4)",
          borderRadius: "12px",
          padding: "1rem 1.5rem",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          boxShadow: "0 12px 32px rgba(0, 0, 0, 0.4), 0 0 15px rgba(217, 138, 33, 0.1)",
          animation: "slideInToast 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
          maxWidth: "400px",
        }}>
          <div style={{
            background: "rgba(217, 138, 33, 0.15)",
            border: "1px solid #D98A21",
            borderRadius: "50%",
            width: "36px",
            height: "36px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D98A21" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            <span style={{
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 700,
              fontSize: "0.9rem",
              color: "#D98A21",
            }}>
              Duplicate File Detected
            </span>
            <span style={{
              fontFamily: "'Poppins', sans-serif",
              fontSize: "0.8rem",
              color: "rgba(240, 236, 230, 0.8)",
              lineHeight: "1.4",
            }}>
              {duplicateToast.message}
            </span>
          </div>
        </div>
      )}
      {!hideHeader && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#e07b39", margin: 0 }}>
              RRL document upload
            </h2>
            <p style={{ fontSize: "0.8rem", color: "#8a8278", margin: "0.25rem 0 0" }}>
              Upload candidate Review of Related Literature PDFs for parsing.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "#8a8278" }}>Session ID</span>
            <div
              style={{
                background: "#2a2724",
                border: "1px solid #333028",
                borderRadius: "8px",
                color: "#f0ece6",
                padding: "0.5rem 0.875rem",
                fontSize: "0.875rem",
                width: "260px",
                fontFamily: "monospace",
                wordBreak: "break-all",
              }}
            >
              {sessionId || "Loading..."}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <DragDropZone onFilesAdded={appendFiles} maxFileMB={MAX_FILE_MB} />
        <div
          style={{
            background: "#252220",
            border: "1px solid #333028",
            borderRadius: "8px",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "0.625rem 0.875rem",
              borderBottom: "1px solid #333028",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                fontSize: "0.7rem",
                fontWeight: 700,
                textTransform: "uppercase",
                color: "#e07b39",
              }}
            >
              Selected files
            </span>
            <span style={{ fontSize: "0.75rem", color: "#8a8278" }}>{totalCount} in queue</span>
          </div>
          <SelectedFilesList files={fileQueue} onRemove={removeFileItem} />
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1rem",
          alignItems: "center",
        }}
      >
        <UploadAllButton onClick={handleUpload} isUploading={uploadState === "uploading"} />
        <UploadStatusBar
          readyCount={readyCount}
          totalCount={totalCount}
          statusMessage={statusMessage}
          uploadState={uploadState}
        />
      </div>
    </div>
  );
}

function clearCiteWiseSessionStorage() {
  const prefixes = [
    "citewise.uploadedDocs",
    "citewise_approved_docs_",
    "citewise_draft_",
  ];
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key && prefixes.some((prefix) => key.startsWith(prefix))) {
      localStorage.removeItem(key);
    }
  }
  localStorage.removeItem("citewise.session_id");
  localStorage.removeItem("citewise.sessionId");
  localStorage.removeItem("citewise.catalystData");
  sessionStorage.clear();
}
