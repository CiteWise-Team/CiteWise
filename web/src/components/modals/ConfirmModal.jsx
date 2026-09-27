import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Modal } from "bootstrap";

export default function ConfirmModal({
  id = "confirmModal",
  title = "Confirm Action",
  message = "Are you sure you want to continue?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "primary",
  onConfirm,
}) {
  useEffect(() => {
    const modalEl = document.getElementById(id);
    if (!modalEl) return;

    return () => {
      const instance = Modal.getInstance(modalEl);
      if (instance) instance.hide();
    };
  }, [id]);

  function handleConfirm() {
    onConfirm?.();

    const modalEl = document.getElementById(id);
    const modal = Modal.getInstance(modalEl) || new Modal(modalEl);
    modal.hide();
  }

  const isDanger = type === "danger";

  return createPortal(
    <div className="modal fade" id={id} tabIndex="-1" aria-hidden="true">
      <div className="modal-dialog modal-dialog-centered workspace-create-dialog">
        <div className="modal-content workspace-create-modal border-0 overflow-hidden">
          {/* Header */}
          <div className={`workspace-create-header text-white${isDanger ? " is-danger" : ""}`}>
            <div className="workspace-create-header-content">
              <p className="workspace-create-kicker">
                {isDanger ? "Permanent action" : "Confirm action"}
              </p>
              <h5 className="mb-0 fw-bold">{title}</h5>
            </div>
            <span className="workspace-create-header-mark" aria-hidden="true">
              {isDanger ? "!" : "?"}
            </span>
          </div>

          {/* Body */}
          <div className="workspace-create-body">
            <p style={{ color: "#4b5563", fontSize: "0.92rem", lineHeight: 1.6, margin: isDanger ? "0 0 14px" : "0" }}>
              {message}
            </p>
            {isDanger && (
              <div
                style={{
                  backgroundColor: "#fef2f2",
                  border: "1px solid #fee2e2",
                  borderRadius: "10px",
                  padding: "10px 14px",
                  color: "#b91c1c",
                  fontSize: "0.8rem",
                  lineHeight: 1.5,
                }}
              >
                <strong>Warning:</strong> All evidence, topic notes, and drafting history linked to this workspace will be deleted.
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="d-flex justify-content-end gap-2 p-4 pt-0" style={{ backgroundColor: "#ffffff" }}>
            <button
              type="button"
              className="workspace-modal-button workspace-modal-cancel"
              data-bs-dismiss="modal"
            >
              {cancelText}
            </button>

            <button
              type="button"
              className={`workspace-modal-button ${isDanger ? "workspace-modal-danger" : "workspace-modal-submit"}`}
              onClick={handleConfirm}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}