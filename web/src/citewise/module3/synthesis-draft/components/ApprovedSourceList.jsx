import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { apiRequest, apiFetch } from "../../../../api/http";
import { ChevronDown, ChevronUp, Settings, Trash2, MoreHorizontal, Edit3, X, FileText, Check, Layers, Sparkles } from "lucide-react";
import { Modal } from "bootstrap";
import ConfirmModal from "../../../../components/modals/ConfirmModal";
import * as store from "../../../lib/citewiseStore";
import { useTheme } from "../../../../context/ThemeContext";
import ModernToast from "../../../../components/ui/ModernToast";

export default function ApprovedSourceList({ sessionId, documents, loading, onOverrideComplete, onUpdateSources }) {
  const { isDark } = useTheme();
  const [editingDoc, setEditingDoc] = useState(null);
  const [citationText, setCitationText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeDocMenu, setActiveDocMenu] = useState(null); // { doc, top, left }
  const [toastState, setToastState] = useState({
    show: false,
    type: "success",
    title: "",
    message: "",
  });

  const showToast = (type, title, message) => {
    setToastState({ show: true, type, title, message });
  };

  useEffect(() => {
    if (!activeDocMenu) return;
    const handleClose = () => setActiveDocMenu(null);
    window.addEventListener("scroll", handleClose, true);
    window.addEventListener("resize", handleClose);
    window.addEventListener("click", handleClose);
    return () => {
      window.removeEventListener("scroll", handleClose, true);
      window.removeEventListener("resize", handleClose);
      window.removeEventListener("click", handleClose);
    };
  }, [activeDocMenu]);

  const handleToggleDocMenu = (e, doc) => {
    e.stopPropagation();
    if (activeDocMenu?.doc?.id === doc.id) {
      setActiveDocMenu(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const menuWidth = 165;
    const menuHeight = 110;

    // Position at the right side of the 3 dots button
    let left = rect.right + 8;
    // If not enough room on the right side of the screen, place to the left of the button
    if (left + menuWidth > window.innerWidth - 12) {
      left = Math.max(12, rect.left - menuWidth - 8);
    }

    // Align with the top of the button
    let top = rect.top - 6;
    if (top + menuHeight > window.innerHeight - 12) {
      top = Math.max(12, window.innerHeight - menuHeight - 12);
    }
    if (top < 12) top = 12;

    setActiveDocMenu({ doc, top, left });
  };

  // Manage Docs States
  const [showManageModal, setShowManageModal] = useState(false);
  const [manageDocsList, setManageDocsList] = useState([]);
  const [manageLoading, setManageLoading] = useState(false);
  const [draftSelectedIds, setDraftSelectedIds] = useState(new Set());
  const [deleteDocConfirm, setDeleteDocConfirm] = useState({ show: false, doc: null });
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    const docToDelete = deleteDocConfirm.doc;
    if (!docToDelete?.id) return;
    setIsDeleting(true);
    try {
      await apiFetch(`/api/v1/documents/${docToDelete.id}`, {
        method: "DELETE",
        headers: { 'X-Session-Id': sessionId }
      });

      const updatedDocs = documents.filter(d => String(d.id) !== String(docToDelete.id));
      if (onUpdateSources) onUpdateSources(updatedDocs);

      setManageDocsList(prev => prev.filter(d => String(d.id) !== String(docToDelete.id)));
      setDraftSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(String(docToDelete.id));
        return next;
      });

      const DOCS_STORAGE_KEY = `citewise_approved_docs_${sessionId}`;
      localStorage.setItem(DOCS_STORAGE_KEY, JSON.stringify(updatedDocs));
      sessionStorage.setItem(DOCS_STORAGE_KEY, JSON.stringify(updatedDocs));

      const currentUsage = store.getRrlUsage(sessionId) || {};
      if (currentUsage[docToDelete.id] || currentUsage[String(docToDelete.id)]) {
        const nextUsage = { ...currentUsage };
        delete nextUsage[docToDelete.id];
        delete nextUsage[String(docToDelete.id)];
        store.setRrlUsage(sessionId, nextUsage);
      }
      showToast("success", "Document Removed", `"${docToDelete.name || docToDelete.fileName || 'Document'}" was removed from your session.`);
    } catch (err) {
      console.error("Failed to delete document:", err);
      showToast("error", "Deletion Failed", `Failed to delete document: ${err.message}`);
    } finally {
      setIsDeleting(false);
      setDeleteDocConfirm({ show: false, doc: null });
    }
  };

  const handleEditClick = (doc) => {
    setEditingDoc(doc);
    setCitationText("");
  };

  const handleSave = async () => {
    if (!citationText.trim()) return;
    setIsSubmitting(true);
    try {
      await apiRequest(`/api/v1/documents/${editingDoc.id || editingDoc.documentId}/citation_override`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: citationText.trim() })
      });
      setEditingDoc(null);
      showToast("success", "Citation Updated", "Scholarly citation reference has been overridden.");
      if (onOverrideComplete) onOverrideComplete();
    } catch (err) {
      console.error("Failed to override citation", err);
      showToast("error", "Override Failed", `Failed to override citation: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenManage = async () => {
    if (!sessionId) {
      showToast("warning", "No Active Session", "Please select or initialize a workspace session first.");
      return;
    }
    setShowManageModal(true);
    setManageLoading(true);
    try {
      const { res, data } = await apiFetch(`/api/v1/documents/session/${sessionId}`, {
        headers: { 'X-Session-Id': sessionId }
      });
      if (res.ok && Array.isArray(data)) {
        const assessedDocs = data.filter(d => d.relevancyScore !== null || d.scoringStatus === "complete" || d.scoringStatus === "COMPLETE");
        setManageDocsList(assessedDocs);
        const currentIds = new Set(documents.map(d => String(d.id)));
        setDraftSelectedIds(currentIds);
      }
    } catch (err) {
      console.error("Failed to load documents for management:", err);
    } finally {
      setManageLoading(false);
    }
  };

  const toggleDraftSelection = (id) => {
    setDraftSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(String(id))) newSet.delete(String(id));
      else newSet.add(String(id));
      return newSet;
    });
  };

  const applyManageSave = async () => {
    const updatedDocs = manageDocsList
      .filter(d => draftSelectedIds.has(String(d.id)))
      .map(doc => ({
        id: doc.id,
        name: doc.fileName || doc.name || "Untitled.pdf",
        title: doc.title || null,
        size: doc.size || "-",
        relevancyScore: doc.relevancyScore ?? 0,
        approved: true,
      }));
    if (onUpdateSources) onUpdateSources(updatedDocs);
    setShowManageModal(false);
    showToast("success", "Sources Updated", `Updated synthesis source documents (${draftSelectedIds.size} selected).`);

    for (const doc of manageDocsList) {
      const isSelected = draftSelectedIds.has(String(doc.id));
      try {
        await apiFetch(`/api/v1/documents/${doc.id}/approval`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "X-Session-Id": sessionId,
          },
          body: JSON.stringify({
            status: isSelected ? "APPROVED" : "READY",
          }),
        });
      } catch (err) {
        console.warn(`Failed to sync approval for doc ${doc.id}:`, err);
      }
    }
  };

  return (
    <div
      style={{
        background: isDark ? "var(--cw-bg-surface, #15141f)" : "var(--cw-bg-surface, #ffffff)",
        border: `1px solid ${isDark ? "rgba(255, 255, 255, 0.08)" : "var(--cw-border, #e5e7eb)"}`,
        borderRadius: "16px",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
        boxShadow: isDark ? "0 4px 20px rgba(0, 0, 0, 0.35)" : "0 4px 16px rgba(0, 0, 0, 0.05)",
      }}
    >
      <div
        className="workflow-card-header"
        style={{
          padding: "16px 20px",
          background: isDark ? "var(--cw-bg-surface-elevated, #1e2638)" : "var(--cw-bg-surface-elevated, #f9fafb)",
          borderBottom: isOpen ? `1px solid ${isDark ? "rgba(255, 255, 255, 0.08)" : "var(--cw-border, #e5e7eb)"}` : "none",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
          userSelect: "none",
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div>
          <span
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 700,
              fontSize: "1.05rem",
              color: isDark ? "#f9fafb" : "var(--cw-text-primary, #0f0e17)",
              letterSpacing: "0.01em",
            }}
          >
            Source Documents ({documents.length})
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleOpenManage(); }}
            title="Manage Sources"
            aria-label="Manage Sources"
            style={{
              background: isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.04)",
              border: isDark ? "1px solid rgba(255, 255, 255, 0.12)" : "1px solid rgba(0, 0, 0, 0.08)",
              borderRadius: "8px",
              width: "32px",
              height: "32px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: isDark ? "#cbd5e1" : "#6b7280",
              cursor: "pointer",
              transition: "all 0.18s ease",
              padding: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = isDark ? "rgba(249, 115, 22, 0.18)" : "#fff7ed";
              e.currentTarget.style.borderColor = "#f97316";
              e.currentTarget.style.color = "#f97316";
              e.currentTarget.style.transform = "scale(1.05)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.04)";
              e.currentTarget.style.borderColor = isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.08)";
              e.currentTarget.style.color = isDark ? "#cbd5e1" : "#6b7280";
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            <Settings size={15} />
          </button>
          <span style={{ display: "inline-flex", alignItems: "center", color: isDark ? "#9ca3af" : "var(--cw-text-muted, #6b7280)" }}>
            {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </span>
        </div>
      </div>

      {isOpen && (
        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {loading ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "12px",
                padding: "40px 20px",
                background: isDark ? "rgba(255, 255, 255, 0.03)" : "#f9fafb",
                borderRadius: "8px",
              }}
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  border: isDark ? "2px solid rgba(255, 255, 255, 0.12)" : "2px solid #e5e7eb",
                  borderTop: "2px solid #f97316",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }}
              />
              <span style={{ fontSize: "0.85rem", color: isDark ? "#9ca3af" : "#6b7280" }}>
                Loading source documents...
              </span>
            </div>
          ) : documents.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "32px 20px",
                background: isDark ? "rgba(255, 255, 255, 0.03)" : "#f9fafb",
                borderRadius: "8px",
                color: isDark ? "#9ca3af" : "#9ca3af",
                fontSize: "0.9rem",
                fontStyle: "italic",
              }}
            >
              No documents available. Go to AI Assessment to approve documents.
            </div>
          ) : (
            <div
              className="workflow-scrollable"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                maxHeight: "385px",
                overflowY: documents.length > 5 ? "auto" : "visible",
                paddingRight: documents.length > 5 ? "4px" : "0px",
              }}
            >
              {documents.map((doc, idx) => (
                <div
                  key={doc.id || idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    padding: "12px",
                    background: isDark ? "rgba(255, 255, 255, 0.04)" : "#ffffff",
                    border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "6px",
                      background: isDark ? "rgba(249, 115, 22, 0.15)" : "#fff7ef",
                      border: isDark ? "1px solid rgba(249, 115, 22, 0.3)" : "1px solid #fed7aa",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#f97316",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {idx + 1}
                  </div>

                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px", overflow: "hidden" }}>
                    <span
                      style={{
                        fontFamily: "'Poppins', sans-serif",
                        fontWeight: 600,
                        fontSize: "0.9rem",
                        color: isDark ? "#f9fafb" : "#111827",
                        textOverflow: "ellipsis",
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                        display: "block",
                        width: "100%",
                      }}
                      title={doc.name || doc.fileName}
                    >
                      {doc.name || doc.fileName}
                    </span>
                    {doc.title && (
                      <span
                        style={{
                          fontSize: "0.7rem",
                          color: isDark ? "#9ca3af" : "#6b7280",
                          textOverflow: "ellipsis",
                          overflow: "hidden",
                          whiteSpace: "nowrap",
                          display: "block",
                          width: "100%",
                        }}
                        title={doc.title}
                      >
                        {doc.title}
                      </span>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                    {/* 3 dots menu button */}
                    <button
                      type="button"
                      title="Document options"
                      aria-label="Document options"
                      onClick={(e) => handleToggleDocMenu(e, doc)}
                      style={{
                        background: activeDocMenu?.doc?.id === doc.id 
                          ? (isDark ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.08)") 
                          : "transparent",
                        border: `1px solid ${activeDocMenu?.doc?.id === doc.id ? (isDark ? "rgba(255, 255, 255, 0.25)" : "#d1d5db") : "transparent"}`,
                        borderRadius: "6px",
                        padding: "4px 6px",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: activeDocMenu?.doc?.id === doc.id
                          ? (isDark ? "#ffffff" : "#111827")
                          : (isDark ? "#cbd5e1" : "#6b7280"),
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                        flexShrink: 0,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)";
                        e.currentTarget.style.color = isDark ? "#ffffff" : "#111827";
                      }}
                      onMouseLeave={(e) => {
                        if (activeDocMenu?.doc?.id !== doc.id) {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.color = isDark ? "#cbd5e1" : "#6b7280";
                        }
                      }}
                    >
                      <MoreHorizontal size={16} />
                    </button>

                    <div
                      style={{
                        width: "16px",
                        height: "16px",
                        borderRadius: "50%",
                        background: "#ea580c",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                      title="Approved document"
                    >
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path
                          d="M1 4L3.5 6.5L9 1"
                          stroke="#ffffff"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Citation Override Modal */}
      {editingDoc && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: isDark ? "rgba(0, 0, 0, 0.75)" : "rgba(17, 24, 39, 0.6)", zIndex: 1000,
          backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <div className="cw-m-modal" style={{
            background: isDark ? "var(--cw-bg-surface-elevated, #1e2638)" : "#ffffff", padding: "24px", borderRadius: "16px",
            width: "440px", maxWidth: "92vw", border: `1px solid ${isDark ? "rgba(255, 255, 255, 0.12)" : "#e5e7eb"}`,
            boxShadow: isDark ? "0 20px 50px rgba(0, 0, 0, 0.6)" : "0 20px 50px rgba(0, 0, 0, 0.15)",
            display: "flex", flexDirection: "column", gap: "16px",
            fontFamily: "'Poppins', sans-serif",
          }}>
            <h3 style={{ margin: 0, color: isDark ? "#f9fafb" : "#111827", fontSize: "1.1rem", fontWeight: 700 }}>Override Citation</h3>
            <p style={{ margin: 0, color: isDark ? "#9ca3af" : "#6b7280", fontSize: "0.85rem", lineHeight: "1.5" }}>
              Paste the correct APA citation for <strong style={{ color: "#f97316" }}>{editingDoc.fileName || editingDoc.name}</strong>. The system will automatically extract the in-text citation format and use it in your synthesis.
            </p>
            <textarea
              value={citationText}
              onChange={(e) => setCitationText(e.target.value)}
              placeholder="e.g. Gao, Y., Xiong, Y... (2023). Retrieval-Augmented Generation..."
              style={{
                width: "100%", height: "120px", background: isDark ? "var(--cw-bg-input, #100f18)" : "#ffffff",
                color: isDark ? "#f9fafb" : "#111827", border: `1px solid ${isDark ? "rgba(255, 255, 255, 0.14)" : "#e5e7eb"}`, borderRadius: "10px",
                padding: "12px", outline: "none", resize: "none", boxSizing: "border-box",
                fontFamily: "'Poppins', sans-serif", fontSize: "0.85rem", lineHeight: 1.5,
                transition: "border-color 0.2s ease, box-shadow 0.2s ease",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#f97316";
                e.currentTarget.style.boxShadow = "0 0 0 2px rgba(249, 115, 22, 0.15)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = isDark ? "rgba(255, 255, 255, 0.14)" : "#e5e7eb";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "8px" }}>
              <button
                onClick={() => setEditingDoc(null)}
                style={{
                  background: "transparent", color: isDark ? "#cbd5e1" : "#6b7280", border: `1px solid ${isDark ? "rgba(255, 255, 255, 0.14)" : "#e5e7eb"}`,
                  borderRadius: "8px", padding: "8px 16px", cursor: "pointer",
                  fontFamily: "'Poppins', sans-serif", fontSize: "0.85rem", fontWeight: 600,
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = isDark ? "rgba(255, 255, 255, 0.3)" : "#d1d5db";
                  e.currentTarget.style.color = isDark ? "#ffffff" : "#374151";
                  e.currentTarget.style.background = isDark ? "rgba(255, 255, 255, 0.08)" : "#f9fafb";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = isDark ? "rgba(255, 255, 255, 0.14)" : "#e5e7eb";
                  e.currentTarget.style.color = isDark ? "#cbd5e1" : "#6b7280";
                  e.currentTarget.style.background = "transparent";
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSubmitting || !citationText.trim()}
                style={{
                  background: (isSubmitting || !citationText.trim()) ? (isDark ? "rgba(255, 255, 255, 0.06)" : "#f3f4f6") : "#ea580c",
                  color: (isSubmitting || !citationText.trim()) ? (isDark ? "#6b7280" : "#9ca3af") : "#ffffff",
                  border: (isSubmitting || !citationText.trim()) ? (isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid #e5e7eb") : "1px solid #ea580c",
                  borderRadius: "8px",
                  padding: "8px 16px",
                  cursor: (isSubmitting || !citationText.trim()) ? "not-allowed" : "pointer",
                  opacity: (isSubmitting || !citationText.trim()) ? 0.6 : 1,
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  boxShadow: (isSubmitting || !citationText.trim()) ? "none" : "0 2px 8px rgba(234, 88, 12, 0.22)",
                  transition: "all 180ms ease",
                }}
                onMouseEnter={(e) => {
                  if (!isSubmitting && citationText.trim()) {
                    e.currentTarget.style.background = "#c2410c";
                    e.currentTarget.style.borderColor = "#c2410c";
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = "0 4px 14px rgba(234, 88, 12, 0.35)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSubmitting && citationText.trim()) {
                    e.currentTarget.style.background = "#ea580c";
                    e.currentTarget.style.borderColor = "#ea580c";
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(234, 88, 12, 0.22)";
                  }
                }}
                onMouseDown={(e) => {
                  if (!isSubmitting && citationText.trim()) {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 2px 6px rgba(234, 88, 12, 0.2)";
                  }
                }}
              >
                {isSubmitting ? "Saving..." : "Save Citation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Sources Modal - Beautiful, Modern, Properly Centered with Even Spacings */}
      {showManageModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: isDark ? "rgba(10, 10, 18, 0.78)" : "rgba(15, 23, 42, 0.55)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          zIndex: 10000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          boxSizing: "border-box",
          animation: "fadeInToast 0.25s ease-out forwards",
        }}>
          <div style={{
            background: isDark ? "#171626" : "#ffffff",
            padding: "28px 30px",
            borderRadius: "22px",
            width: "740px",
            maxWidth: "100%",
            maxHeight: "88vh",
            boxSizing: "border-box",
            border: `1px solid ${isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(226, 232, 240, 0.9)"}`,
            boxShadow: isDark
              ? "0 24px 64px rgba(0, 0, 0, 0.7), 0 0 40px rgba(234, 88, 12, 0.08)"
              : "0 24px 64px rgba(15, 23, 42, 0.16), 0 4px 16px rgba(0, 0, 0, 0.04)",
            display: "flex",
            flexDirection: "column",
            gap: "18px",
            overflow: "hidden",
            position: "relative",
            fontFamily: "'Poppins', sans-serif",
            animation: "scaleInToast 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
          }}>
            {/* Close Button at top-right */}
            <button
              type="button"
              onClick={() => setShowManageModal(false)}
              aria-label="Close modal"
              style={{
                position: "absolute",
                top: "20px",
                right: "20px",
                background: "transparent",
                border: "none",
                color: isDark ? "#94a3b8" : "#64748b",
                cursor: "pointer",
                padding: "6px",
                borderRadius: "8px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.15s ease",
                zIndex: 10,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isDark ? "rgba(255, 255, 255, 0.08)" : "#f1f5f9";
                e.currentTarget.style.color = isDark ? "#ffffff" : "#0f172a";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = isDark ? "#94a3b8" : "#64748b";
              }}
            >
              <X size={18} />
            </button>

            {/* Modal Header with top-left aligned icon */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", paddingRight: "36px" }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  background: isDark ? "rgba(234, 88, 12, 0.15)" : "#fff7ed",
                  border: `1px solid ${isDark ? "rgba(234, 88, 12, 0.3)" : "#fed7aa"}`,
                  color: "#ea580c",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: "2px",
                }}
              >
                <Layers size={22} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                  <h3 style={{
                    margin: 0,
                    color: isDark ? "#f9fafb" : "#111827",
                    fontSize: "1.2rem",
                    fontWeight: 700,
                    lineHeight: 1.3,
                  }}>
                    Manage Source Documents
                  </h3>
                  <span style={{
                    fontSize: "0.76rem",
                    fontWeight: 600,
                    padding: "3px 10px",
                    borderRadius: "999px",
                    background: isDark ? "rgba(234, 88, 12, 0.18)" : "#ffedd5",
                    color: "#ea580c",
                    border: `1px solid ${isDark ? "rgba(234, 88, 12, 0.3)" : "#fed7aa"}`,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}>
                    {draftSelectedIds.size} of {manageDocsList.length} included
                  </span>
                </div>
                <p style={{
                  margin: "4px 0 0",
                  color: isDark ? "#94a3b8" : "#64748b",
                  fontSize: "0.85rem",
                  lineHeight: 1.45,
                }}>
                  Select assessed documents from your literature pool to include and cite in your introduction draft.
                </p>
              </div>
            </div>

            {/* Quick selection toolbar */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 14px",
              background: isDark ? "rgba(255, 255, 255, 0.03)" : "#f8fafc",
              borderRadius: "12px",
              border: `1px solid ${isDark ? "rgba(255, 255, 255, 0.06)" : "#e2e8f0"}`,
              fontSize: "0.82rem",
              color: isDark ? "#94a3b8" : "#64748b",
            }}>
              <span style={{ fontWeight: 500 }}>
                Literature review papers ({manageDocsList.length})
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => {
                    setDraftSelectedIds(new Set(manageDocsList.map(d => String(d.id))));
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#ea580c",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: "0.8rem",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    transition: "opacity 0.15s ease",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.textDecoration = "underline"}
                  onMouseLeave={(e) => e.currentTarget.style.textDecoration = "none"}
                >
                  Select All
                </button>
                <span style={{ color: isDark ? "rgba(255, 255, 255, 0.2)" : "#cbd5e1" }}>•</span>
                <button
                  type="button"
                  onClick={() => {
                    setDraftSelectedIds(new Set());
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: isDark ? "#94a3b8" : "#64748b",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: "0.8rem",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    transition: "opacity 0.15s ease",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.textDecoration = "underline"}
                  onMouseLeave={(e) => e.currentTarget.style.textDecoration = "none"}
                >
                  Deselect All
                </button>
              </div>
            </div>

            {/* Document list */}
            {manageLoading ? (
              <div style={{
                color: isDark ? "#9ca3af" : "#6b7280",
                textAlign: "center",
                padding: "48px 16px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "12px",
              }}>
                <div style={{
                  width: "28px",
                  height: "28px",
                  border: "3px solid rgba(234, 88, 12, 0.2)",
                  borderTopColor: "#ea580c",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }} />
                <span style={{ fontSize: "0.88rem" }}>Loading assessed documents...</span>
              </div>
            ) : (
              <div style={{
                overflowY: "auto",
                flex: 1,
                paddingRight: "4px",
                maxHeight: "420px",
              }}>
                <table style={{
                  width: "100%",
                  borderCollapse: "separate",
                  borderSpacing: "0 6px",
                  color: isDark ? "#f9fafb" : "#111827",
                }}>
                  <thead style={{
                    position: "sticky",
                    top: 0,
                    background: isDark ? "#171626" : "#ffffff",
                    zIndex: 5,
                  }}>
                    <tr style={{
                      color: isDark ? "#94a3b8" : "#64748b",
                      fontSize: "0.76rem",
                      fontWeight: 700,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                    }}>
                      <th style={{ padding: "8px 12px", textAlign: "left" }}>Document</th>
                      <th style={{ padding: "8px 12px", width: "110px", textAlign: "center" }}>AI Score</th>
                      <th style={{ padding: "8px 12px", width: "90px", textAlign: "center" }}>Include</th>
                      <th style={{ padding: "8px 12px", width: "70px", textAlign: "center" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {manageDocsList.map(doc => {
                      const isSelected = draftSelectedIds.has(String(doc.id));
                      return (
                        <tr
                          key={doc.id}
                          onClick={() => toggleDraftSelection(doc.id)}
                          style={{
                            background: isSelected
                              ? (isDark ? "rgba(234, 88, 12, 0.08)" : "rgba(255, 237, 213, 0.4)")
                              : (isDark ? "rgba(255, 255, 255, 0.025)" : "#f8fafc"),
                            borderRadius: "10px",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                            border: `1px solid ${
                              isSelected
                                ? (isDark ? "rgba(234, 88, 12, 0.3)" : "rgba(253, 186, 116, 0.8)")
                                : (isDark ? "rgba(255, 255, 255, 0.05)" : "#f1f5f9")
                            }`,
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.background = isDark ? "rgba(255, 255, 255, 0.06)" : "#f1f5f9";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.background = isDark ? "rgba(255, 255, 255, 0.025)" : "#f8fafc";
                            }
                          }}
                        >
                          <td style={{
                            padding: "12px 14px",
                            borderTopLeftRadius: "10px",
                            borderBottomLeftRadius: "10px",
                          }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <div style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "8px",
                                background: isDark ? "rgba(255, 255, 255, 0.06)" : "#ffffff",
                                border: `1px solid ${isDark ? "rgba(255, 255, 255, 0.08)" : "#e2e8f0"}`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: isDark ? "#cbd5e1" : "#64748b",
                                flexShrink: 0,
                              }}>
                                <FileText size={16} />
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
                                <span style={{
                                  fontSize: "0.88rem",
                                  fontWeight: 600,
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  maxWidth: "380px",
                                  color: isDark ? "#f9fafb" : "#111827",
                                }}>
                                  {doc.fileName || doc.name}
                                </span>
                                {doc.title && (
                                  <span style={{
                                    fontSize: "0.74rem",
                                    color: isDark ? "#94a3b8" : "#64748b",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    maxWidth: "380px",
                                    marginTop: "2px",
                                  }}>
                                    {doc.title}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: "12px", textAlign: "center" }}>
                            <span style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "3px 10px",
                              borderRadius: "999px",
                              fontSize: "0.8rem",
                              fontWeight: 700,
                              background: isDark ? "rgba(234, 88, 12, 0.16)" : "#fff7ed",
                              border: `1px solid ${isDark ? "rgba(234, 88, 12, 0.35)" : "#fed7aa"}`,
                              color: "#ea580c",
                            }}>
                              <Sparkles size={11} />
                              {doc.relevancyScore ? doc.relevancyScore.toFixed(1) : "N/A"}
                            </span>
                          </td>
                          <td style={{ padding: "12px", textAlign: "center" }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              readOnly
                              style={{
                                width: "18px",
                                height: "18px",
                                cursor: "pointer",
                                accentColor: "#ea580c",
                                pointerEvents: "none",
                              }}
                            />
                          </td>
                          <td style={{
                            padding: "12px",
                            textAlign: "center",
                            borderTopRightRadius: "10px",
                            borderBottomRightRadius: "10px",
                          }} onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              title="Delete document permanently"
                              onClick={() => setDeleteDocConfirm({ show: true, doc })}
                              style={{
                                background: "none",
                                border: "none",
                                color: isDark ? "#94a3b8" : "#9ca3af",
                                cursor: "pointer",
                                padding: "6px",
                                borderRadius: "6px",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                transition: "all 0.15s ease",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = "#dc2626";
                                e.currentTarget.style.background = isDark ? "rgba(220, 38, 38, 0.15)" : "#fee2e2";
                                e.currentTarget.style.transform = "scale(1.1)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = isDark ? "#94a3b8" : "#9ca3af";
                                e.currentTarget.style.background = "none";
                                e.currentTarget.style.transform = "scale(1)";
                              }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {manageDocsList.length === 0 && (
                  <div style={{
                    color: isDark ? "#94a3b8" : "#64748b",
                    textAlign: "center",
                    padding: "36px 16px",
                    fontStyle: "italic",
                    fontSize: "0.88rem",
                  }}>
                    No assessed documents found in this session.
                  </div>
                )}
              </div>
            )}

            {/* Modal Footer with even spacing */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              paddingTop: "16px",
              borderTop: `1px solid ${isDark ? "rgba(255, 255, 255, 0.08)" : "#e2e8f0"}`,
              flexWrap: "wrap",
            }}>
              <div style={{
                fontSize: "0.82rem",
                color: draftSelectedIds.size === 0 ? "#ea580c" : (isDark ? "#94a3b8" : "#64748b"),
                fontWeight: 500,
              }}>
                {draftSelectedIds.size === 0
                  ? "⚠️ No sources selected — draft will not have cited papers"
                  : `✓ ${draftSelectedIds.size} document(s) included for synthesis`}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setShowManageModal(false)}
                  style={{
                    background: "transparent",
                    color: isDark ? "#cbd5e1" : "#64748b",
                    border: `1px solid ${isDark ? "rgba(255, 255, 255, 0.15)" : "#cbd5e1"}`,
                    borderRadius: "10px",
                    cursor: "pointer",
                    padding: "9px 18px",
                    fontSize: "0.88rem",
                    fontWeight: 600,
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = isDark ? "rgba(255, 255, 255, 0.3)" : "#94a3b8";
                    e.currentTarget.style.color = isDark ? "#ffffff" : "#1e293b";
                    e.currentTarget.style.background = isDark ? "rgba(255, 255, 255, 0.06)" : "#f8fafc";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = isDark ? "rgba(255, 255, 255, 0.15)" : "#cbd5e1";
                    e.currentTarget.style.color = isDark ? "#cbd5e1" : "#64748b";
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const modalEl = document.getElementById("confirm-manage-sources");
                    if (modalEl) {
                      const modal = Modal.getInstance(modalEl) || new Modal(modalEl);
                      modal.show();
                    }
                  }}
                  style={{
                    background: "#ea580c",
                    color: "#ffffff",
                    border: "1px solid #ea580c",
                    borderRadius: "10px",
                    padding: "9px 20px",
                    cursor: "pointer",
                    fontSize: "0.88rem",
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    boxShadow: "0 2px 8px rgba(234, 88, 12, 0.25)",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#c2410c";
                    e.currentTarget.style.borderColor = "#c2410c";
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = "0 4px 14px rgba(234, 88, 12, 0.35)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#ea580c";
                    e.currentTarget.style.borderColor = "#ea580c";
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(234, 88, 12, 0.25)";
                  }}
                >
                  <Check size={16} />
                  Save Selection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Deletion Confirmation Modal */}
      {deleteDocConfirm.show && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: isDark ? "rgba(0, 0, 0, 0.75)" : "rgba(17, 24, 39, 0.6)",
          backdropFilter: "blur(12px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10001,
          animation: "fadeInToast 0.3s ease-out forwards",
        }}>
          <div style={{
            background: isDark ? "var(--cw-bg-surface-elevated, #1e2638)" : "#ffffff",
            border: `1px solid ${isDark ? "rgba(220, 38, 38, 0.4)" : "#fecaca"}`,
            borderRadius: "20px",
            padding: "2rem",
            maxWidth: "460px",
            width: "90%",
            textAlign: "center",
            boxShadow: isDark ? "0 24px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(220, 38, 38, 0.15)" : "0 24px 60px rgba(0, 0, 0, 0.15), 0 0 40px rgba(220, 38, 38, 0.1)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1.25rem",
          }}>
            <div style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              background: isDark ? "rgba(220, 38, 38, 0.18)" : "#fef2f2",
              border: "2px solid #dc2626",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 20px rgba(220, 38, 38, 0.15)",
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18"/>
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
              </svg>
            </div>
            <div>
              <h3 style={{
                fontFamily: "'Poppins', sans-serif",
                fontWeight: 700,
                fontSize: "1.2rem",
                color: isDark ? "#f9fafb" : "#111827",
                margin: "0 0 0.5rem 0",
              }}>
                Remove Document?
              </h3>
              <p style={{
                fontFamily: "'Poppins', sans-serif",
                fontSize: "0.85rem",
                color: isDark ? "#9ca3af" : "#6b7280",
                lineHeight: "1.5",
                margin: 0,
              }}>
                Are you sure you want to permanently delete <strong style={{ color: "#dc2626" }}>"{deleteDocConfirm.doc?.fileName || deleteDocConfirm.doc?.name}"</strong>? This will permanently remove it from both AI Assessment and Draft Generation.
              </p>
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0.75rem",
              width: "100%",
              marginTop: "0.5rem",
            }}>
              <button
                type="button"
                onClick={() => setDeleteDocConfirm({ show: false, doc: null })}
                disabled={isDeleting}
                style={{
                  background: "transparent",
                  border: `1px solid ${isDark ? "rgba(255, 255, 255, 0.14)" : "#e5e7eb"}`,
                  borderRadius: "10px",
                  color: isDark ? "#cbd5e1" : "#6b7280",
                  padding: "0.75rem 1rem",
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = isDark ? "rgba(255, 255, 255, 0.3)" : "#d1d5db";
                  e.currentTarget.style.color = isDark ? "#ffffff" : "#374151";
                  e.currentTarget.style.background = isDark ? "rgba(255, 255, 255, 0.08)" : "#f9fafb";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = isDark ? "rgba(255, 255, 255, 0.14)" : "#e5e7eb";
                  e.currentTarget.style.color = isDark ? "#cbd5e1" : "#6b7280";
                  e.currentTarget.style.background = "transparent";
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                style={{
                  background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
                  border: "none",
                  borderRadius: "10px",
                  color: "#ffffff",
                  padding: "0.75rem 1rem",
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  cursor: isDeleting ? "not-allowed" : "pointer",
                  opacity: isDeleting ? 0.7 : 1,
                  boxShadow: "0 4px 12px rgba(220, 38, 38, 0.25)",
                }}
              >
                {isDeleting ? "Deleting..." : "Remove File"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating 3-dots Menu for Document options */}
      {activeDocMenu && typeof document !== "undefined" && createPortal(
        <div
          style={{
            position: "fixed",
            top: `${activeDocMenu.top}px`,
            left: `${activeDocMenu.left}px`,
            background: isDark ? "#15141f" : "#ffffff",
            border: isDark ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid #e2e8f0",
            borderRadius: "12px",
            boxShadow: isDark
              ? "0 16px 36px rgba(0, 0, 0, 0.55)"
              : "0 16px 36px rgba(0, 0, 0, 0.12)",
            zIndex: 99999,
            minWidth: "165px",
            padding: "6px",
            display: "flex",
            flexDirection: "column",
            gap: "2px",
            animation: "cwFadeIn 0.15s ease-out",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Override Citation */}
          <button
            type="button"
            onClick={() => {
              handleEditClick(activeDocMenu.doc);
              setActiveDocMenu(null);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              width: "100%",
              padding: "8px 12px",
              borderRadius: "8px",
              border: "none",
              background: "transparent",
              color: isDark ? "#f3f4f6" : "#1f2937",
              fontFamily: "'Poppins', sans-serif",
              fontSize: "0.82rem",
              fontWeight: 500,
              cursor: "pointer",
              textAlign: "left",
              transition: "background 0.15s ease, color 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = isDark ? "rgba(255, 255, 255, 0.09)" : "rgba(0, 0, 0, 0.05)";
              e.currentTarget.style.color = isDark ? "#ffffff" : "#111827";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = isDark ? "#f3f4f6" : "#1f2937";
            }}
          >
            <Edit3 size={15} />
            <span>Override Citation</span>
          </button>

          {/* Divider */}
          <div
            style={{
              height: "1px",
              background: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)",
              margin: "3px 4px",
            }}
          />

          {/* Remove */}
          <button
            type="button"
            onClick={() => {
              setDeleteDocConfirm({ show: true, doc: activeDocMenu.doc });
              setActiveDocMenu(null);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              width: "100%",
              padding: "8px 12px",
              borderRadius: "8px",
              border: "none",
              background: "transparent",
              color: isDark ? "#ef4444" : "#dc2626",
              fontFamily: "'Poppins', sans-serif",
              fontSize: "0.82rem",
              fontWeight: 500,
              cursor: "pointer",
              textAlign: "left",
              transition: "background 0.15s ease, color 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = isDark ? "rgba(239, 68, 68, 0.16)" : "#fef2f2";
              e.currentTarget.style.color = isDark ? "#fca5a5" : "#b91c1c";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = isDark ? "#ef4444" : "#dc2626";
            }}
          >
            <Trash2 size={15} />
            <span>Remove</span>
          </button>
        </div>,
        document.body
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        id="confirm-manage-sources"
        title="Confirm Changes"
        message="Are you sure you want to update the selected sources? Generating a new draft will use this new set of documents."
        type="primary"
        warningMessage="Generating a new draft will use this updated set of documents."
        confirmText="Yes, Update Sources"
        onConfirm={applyManageSave}
      />

      {/* Modern Toast Notification */}
      <ModernToast
        show={toastState.show}
        type={toastState.type}
        title={toastState.title}
        message={toastState.message}
        onClose={() => setToastState(prev => ({ ...prev, show: false }))}
      />

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}