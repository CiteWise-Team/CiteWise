import { useEffect } from "react";
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

  const getColor = () => {
    switch (type) {
      case "danger":
        return "#ef4444";
      case "warning":
        return "#f59e0b";
      case "success":
        return "#22c55e";
      default:
        return "#5b5bd6";
    }
  };

  return (
    <div className="modal fade" id={id} tabIndex="-1" aria-hidden="true">
      <div className="modal-dialog modal-dialog-centered">
        <div
          className="modal-content border-0 rounded-4 overflow-hidden"
          style={{ backgroundColor: "#25253a" }}
        >
          {/* Header */}
          <div
            className="px-4 py-3 text-white"
            style={{ backgroundColor: getColor() }}
          >
            <h5 className="mb-0 fw-bold">{title}</h5>
          </div>

          {/* Body */}
          <div className="p-4" style={{ color: "#e4e4f0" }}>
            <p className="mb-0" style={{ color: "#a1a1b5" }}>
              {message}
            </p>
          </div>

          {/* Actions */}
          <div className="d-flex justify-content-end gap-2 p-3">
            <button
              className="btn"
              data-bs-dismiss="modal"
              style={{
                backgroundColor: "transparent",
                border: "1px solid #3a3a55",
                color: "#e4e4f0",
              }}
            >
              {cancelText}
            </button>

            <button
              className="btn text-white"
              onClick={handleConfirm}
              style={{ backgroundColor: getColor() }}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}