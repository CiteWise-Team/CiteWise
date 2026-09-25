import { useState } from "react";
import { apiRequest, apiFetch } from "../../../../api/http";
import { ChevronDown, ChevronRight, Settings, Trash2 } from "lucide-react";
import { Modal } from "bootstrap";
import ConfirmModal from "../../../../components/modals/ConfirmModal";
import * as store from "../../../lib/citewiseStore";

export default function ApprovedSourceList({ sessionId, documents, loading, onOverrideComplete, onUpdateSources }) {
  const [editingDoc, setEditingDoc] = useState(null);
  const [citationText, setCitationText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

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

      // Purge storage
      const DOCS_STORAGE_KEY = `citewise_approved_docs_${sessionId}`;
      localStorage.setItem(DOCS_STORAGE_KEY, JSON.stringify(updatedDocs));
      sessionStorage.setItem(DOCS_STORAGE_KEY, JSON.stringify(updatedDocs));

      // Purge store
      const currentUsage = store.getRrlUsage(sessionId) || {};
      if (currentUsage[docToDelete.id] || currentUsage[String(docToDelete.id)]) {
        const nextUsage = { ...currentUsage };
        delete nextUsage[docToDelete.id];
        delete nextUsage[String(docToDelete.id)];
        store.setRrlUsage(sessionId, nextUsage);
      }
    } catch (err) {
      console.error("Failed to delete document:", err);
      alert(`Failed to delete document: ${err.message}`);
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
      if (onOverrideComplete) onOverrideComplete();
    } catch (err) {
      console.error("Failed to override citation", err);
      alert(`Failed to override citation: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenManage = async () => {
    if (!sessionId) {
      alert("No active session ID.");
      return;
    }
    setShowManageModal(true);
    setManageLoading(true);
    try {
      const { res, data } = await apiFetch(`/api/v1/documents/session/${sessionId}`, {
        headers: { 'X-Session-Id': sessionId }
      });
      if (res.ok && Array.isArray(data)) {
        // Find docs that have been assessed (they have an insight, meaning relevancyScore is not null)
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

    // Sync approval state to database so Step 2 respects unselected documents
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
        background: "#1e1e2f",
        border: "1px solid #3a3a55",
        borderRadius: "16px",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div 
        style={{ 
          padding: "16px 20px", 
          background: "rgba(0, 0, 0, 0.15)",
          borderBottom: isOpen ? "1px solid #3a3a55" : "none",
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          cursor: "pointer",
          userSelect: "none"
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div>
          <span
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 700,
              fontSize: "1.05rem",
              color: "#5b5bd6",
              letterSpacing: "0.01em",
            }}
          >
            Source Documents ({documents.length})
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button 
            onClick={(e) => { e.stopPropagation(); handleOpenManage(); }}
            style={{
              background: "transparent", border: "none", color: "#a1a1b5",
              padding: "4px", fontSize: "0.8rem", fontFamily: "'Poppins', sans-serif",
              cursor: "pointer", display: "flex", alignItems: "center", gap: "4px"
            }}
          >
            <Settings size={14} /> <span style={{ textDecoration: "underline" }}>Manage Sources</span>
          </button>
          {isOpen ? <ChevronDown size={18} color="#5b5bd6" /> : <ChevronRight size={18} color="#a1a1b5" />}
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
                background: "rgba(0, 0, 0, 0.15)",
                borderRadius: "8px",
              }}
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  border: "2px solid #3a3a55",
                  borderTop: "2px solid #5b5bd6",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }}
              />
              <span style={{ fontSize: "0.85rem", color: "#a1a1b5" }}>
                Loading source documents...
              </span>
            </div>
          ) : documents.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "32px 20px",
                background: "rgba(0, 0, 0, 0.15)",
                borderRadius: "8px",
                color: "#7d7d95",
                fontSize: "0.9rem",
              }}
            >
              No documents available. Go to AI Assessment to approve documents.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {documents.map((doc, idx) => (
                <div
                  key={doc.id || idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    padding: "12px",
                    background: "rgba(0, 0, 0, 0.2)",
                    border: "1px solid #3a3a55",
                    borderRadius: "8px",
                  }}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "6px",
                      background: "rgba(91, 91, 214, 0.1)",
                      border: "1px solid rgba(91, 91, 214, 0.3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#5b5bd6",
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
                        color: "#e4e4f0",
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
                          color: "#7d7d95",
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
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "2px" }}>
                      <span
                        onClick={() => handleEditClick(doc)}
                        style={{
                          fontSize: "0.7rem",
                          color: "#a1a1b5",
                          cursor: "pointer",
                          textDecoration: "underline",
                        }}
                      >
                        Override Citation
                      </span>
                      <span
                        onClick={() => setDeleteDocConfirm({ show: true, doc })}
                        style={{
                          fontSize: "0.7rem",
                          color: "#e5544b",
                          cursor: "pointer",
                          textDecoration: "underline",
                        }}
                        title="Remove document permanently"
                      >
                        Remove
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      width: "16px",
                      height: "16px",
                      borderRadius: "50%",
                      background: "#5b5bd6",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path
                        d="M1 4L3.5 6.5L9 1"
                        stroke="#e4e4f0"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
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
          background: "rgba(0,0,0,0.6)", zIndex: 1000,
          display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <div className="cw-m-modal" style={{
            background: "#1e1e2f", padding: "24px", borderRadius: "12px",
            width: "400px", border: "1px solid #3a3a55",
            display: "flex", flexDirection: "column", gap: "16px"
          }}>
            <h3 style={{ margin: 0, color: "#e4e4f0", fontSize: "1.1rem" }}>Override Citation</h3>
            <p style={{ margin: 0, color: "#a1a1b5", fontSize: "0.85rem", lineHeight: "1.5" }}>
              Paste the correct APA citation for <strong>{editingDoc.fileName || editingDoc.name}</strong>. The system will automatically extract the in-text citation format and use it in your synthesis.
            </p>
            <textarea
              value={citationText}
              onChange={(e) => setCitationText(e.target.value)}
              placeholder="e.g. Gao, Y., Xiong, Y... (2023). Retrieval-Augmented Generation..."
              style={{
                width: "100%", height: "120px", background: "#25253a",
                color: "#e4e4f0", border: "1px solid #3a3a55", borderRadius: "8px",
                padding: "12px", outline: "none", resize: "none", boxSizing: "border-box"
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "8px" }}>
              <button 
                onClick={() => setEditingDoc(null)}
                style={{ background: "transparent", color: "#a1a1b5", border: "none", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                disabled={isSubmitting || !citationText.trim()}
                style={{ 
                  background: "#5b5bd6", color: "#fff", border: "none", 
                  borderRadius: "6px", padding: "8px 16px", cursor: "pointer",
                  opacity: (isSubmitting || !citationText.trim()) ? 0.5 : 1
                }}
              >
                {isSubmitting ? "Saving..." : "Save Citation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Sources Modal */}
      {showManageModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.7)", zIndex: 1000,
          display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <div style={{
            background: "#1e1e2f", padding: "24px", borderRadius: "12px",
            width: "700px", maxWidth: "calc(100vw - 24px)", boxSizing: "border-box", border: "1px solid #3a3a55",
            display: "flex", flexDirection: "column", gap: "16px",
            maxHeight: "85vh", overflow: "hidden"
          }}>
            <h3 style={{ margin: 0, color: "#e4e4f0", fontSize: "1.2rem", fontFamily: "'Poppins', sans-serif" }}>Manage Source Documents</h3>
            <p style={{ margin: 0, color: "#a1a1b5", fontSize: "0.9rem", fontFamily: "'Poppins', sans-serif" }}>
              Select documents from your AI Assessment to include in the synthesis draft.
            </p>
            
            {manageLoading ? (
              <div style={{ color: "#a1a1b5", textAlign: "center", padding: "32px", fontFamily: "'Poppins', sans-serif" }}>Loading assessed documents...</div>
            ) : (
              <div style={{ overflowY: "auto", flex: 1, paddingRight: "8px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", color: "#e4e4f0", fontFamily: "'Poppins', sans-serif" }}>
                  <thead style={{ position: "sticky", top: 0, background: "#1e1e2f", zIndex: 10 }}>
                    <tr style={{ borderBottom: "1px solid #3a3a55", color: "#a1a1b5", fontSize: "0.85rem", textAlign: "left" }}>
                      <th style={{ padding: "12px 8px", fontWeight: 600 }}>Document</th>
                      <th style={{ padding: "12px 8px", width: "120px", textAlign: "center", fontWeight: 600 }}>AI Score</th>
                      <th style={{ padding: "12px 8px", width: "100px", textAlign: "center", fontWeight: 600 }}>Include</th>
                      <th style={{ padding: "12px 8px", width: "80px", textAlign: "center", fontWeight: 600 }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {manageDocsList.map(doc => (
                      <tr key={doc.id} style={{ borderBottom: "1px solid rgba(58, 58, 85, 0.4)", cursor: "pointer", transition: "background 0.2s ease" }}
                          onClick={() => toggleDraftSelection(doc.id)}
                          onMouseEnter={(e) => e.currentTarget.style.background = "rgba(0,0,0,0.15)"}
                          onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                      >
                        <td style={{ padding: "16px 8px" }}>
                          <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
                            <span style={{ fontSize: "0.95rem", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "450px" }}>
                              {doc.fileName || doc.name}
                            </span>
                            {doc.title && (
                              <span style={{ fontSize: "0.75rem", color: "#a1a1b5", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "450px", marginTop: "2px" }}>
                                {doc.title}
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: "16px 8px", textAlign: "center", fontSize: "0.9rem", color: "#5b5bd6", fontWeight: 700 }}>
                          {doc.relevancyScore ? doc.relevancyScore.toFixed(1) : "N/A"}
                        </td>
                        <td style={{ padding: "16px 8px", textAlign: "center" }}>
                          <input 
                            type="checkbox" 
                            checked={draftSelectedIds.has(String(doc.id))} 
                            readOnly
                            style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "#5b5bd6", pointerEvents: "none" }}
                          />
                        </td>
                        <td style={{ padding: "16px 8px", textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            title="Delete document permanently"
                            onClick={() => setDeleteDocConfirm({ show: true, doc })}
                            style={{
                              background: "none",
                              border: "none",
                              color: "rgba(240, 236, 230, 0.4)",
                              cursor: "pointer",
                              padding: "4px 8px",
                              borderRadius: "4px",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              transition: "color 0.15s, transform 0.15s",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = "#e5544b";
                              e.currentTarget.style.transform = "scale(1.15)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = "rgba(240, 236, 230, 0.4)";
                              e.currentTarget.style.transform = "scale(1)";
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {manageDocsList.length === 0 && (
                  <div style={{ color: "#7d7d95", textAlign: "center", padding: "32px", fontFamily: "'Poppins', sans-serif" }}>
                    No fully assessed documents found in this session.
                  </div>
                )}
              </div>
            )}
            
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", paddingTop: "16px", borderTop: "1px solid #3a3a55" }}>
              <button 
                onClick={() => setShowManageModal(false)}
                style={{ background: "transparent", color: "#a1a1b5", border: "1px solid #3a3a55", borderRadius: "6px", cursor: "pointer", padding: "10px 20px", fontFamily: "'Poppins', sans-serif", fontSize: "0.9rem" }}
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  const modalEl = document.getElementById("confirm-manage-sources");
                  if (modalEl) {
                    const modal = Modal.getInstance(modalEl) || new Modal(modalEl);
                    modal.show();
                  }
                }}
                style={{ background: "#5b5bd6", color: "#fff", border: "none", borderRadius: "6px", padding: "10px 20px", cursor: "pointer", fontFamily: "'Poppins', sans-serif", fontSize: "0.9rem", fontWeight: 600 }}
              >
                Save Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Deletion Confirmation Modal */}
      {deleteDocConfirm.show && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(14, 12, 10, 0.75)",
          backdropFilter: "blur(12px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10001,
          animation: "fadeInToast 0.3s ease-out forwards",
        }}>
          <div style={{
            background: "#1e1e2f",
            border: "1px solid rgba(229, 84, 75, 0.3)",
            borderRadius: "20px",
            padding: "2rem",
            maxWidth: "460px",
            width: "90%",
            textAlign: "center",
            boxShadow: "0 24px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(229, 84, 75, 0.1)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1.25rem",
          }}>
            <div style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              background: "rgba(229, 84, 75, 0.1)",
              border: "2px solid #e5544b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 20px rgba(229, 84, 75, 0.2)",
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#e5544b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
                color: "#e4e4f0",
                margin: "0 0 0.5rem 0",
              }}>
                Remove Document?
              </h3>
              <p style={{
                fontFamily: "'Poppins', sans-serif",
                fontSize: "0.85rem",
                color: "#a1a1b5",
                lineHeight: "1.5",
                margin: 0,
              }}>
                Are you sure you want to permanently delete <strong style={{ color: "#e5544b" }}>"{deleteDocConfirm.doc?.fileName || deleteDocConfirm.doc?.name}"</strong>? This will permanently remove it from both AI Assessment and Draft Generation.
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
                  border: "1px solid #3a3a55",
                  borderRadius: "10px",
                  color: "#a1a1b5",
                  padding: "0.75rem 1rem",
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                style={{
                  background: "#e5544b",
                  border: "none",
                  borderRadius: "10px",
                  color: "#fff",
                  padding: "0.75rem 1rem",
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  cursor: isDeleting ? "not-allowed" : "pointer",
                  opacity: isDeleting ? 0.7 : 1,
                  boxShadow: "0 4px 12px rgba(229, 84, 75, 0.3)",
                }}
              >
                {isDeleting ? "Deleting..." : "Remove File"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        id="confirm-manage-sources"
        title="Confirm Changes"
        message="Are you sure you want to update the selected sources? Generating a new draft will use this new set of documents."
        type="danger"
        confirmText="Yes, Update Sources"
        onConfirm={applyManageSave}
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
