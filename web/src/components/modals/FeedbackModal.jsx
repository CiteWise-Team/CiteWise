export default function FeedbackModal({ isOpen, type, title, message, onClose }) {
  if (!isOpen) return null;

  const isSuccess = type === "success";

  return (
    <div
      className="modal fade show d-block"
      tabIndex="-1"
      role="dialog"
      aria-modal="true"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="modal-dialog modal-dialog-centered">
        <div
          className="modal-content text-center p-4"
          style={{
            backgroundColor: "#ffffff",
            border: "none",
            outline: "none",
            borderRadius: "16px",
            color: "#4b5563",
            fontFamily: "'Poppins', sans-serif",
            boxShadow: "0 24px 60px rgba(0, 0, 0, 0.15)",
          }}
        >

          {/* Icon */}
          <div
            className="mx-auto mb-3 d-flex align-items-center justify-content-center rounded-circle"
            style={{
              width: 64,
              height: 64,
              backgroundColor: isSuccess ? "rgba(234, 88, 12, 0.12)" : "rgba(242, 95, 76, 0.14)",
              border: `1px solid ${isSuccess ? "#ea580c" : "#f25f4c"}`,
              color: isSuccess ? "#ea580c" : "#f25f4c",
              boxShadow: isSuccess ? "0 0 20px rgba(234, 88, 12, 0.2)" : "none",
            }}
          >
            {isSuccess ? (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M10.3 3.3 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.3a2 2 0 0 0-3.4 0Z" />
                <path d="M12 9v4" />
                <path d="M12 17h.01" />
              </svg>
            )}
          </div>

          {/* Text */}
          <h5 className="fw-bold" style={{ color: "#0f0e17" }}>{title}</h5>
          <p className="mb-4" style={{ color: "#4b5563" }}>{message}</p>

          {/* OK Button */}
          <button
            className="btn"
            style={{
              height: "38px",
              minHeight: "38px",
              padding: "0 28px",
              backgroundColor: "#ea580c",
              border: "1px solid #ea580c",
              borderRadius: "8px",
              color: "#ffffff",
              fontFamily: "'Poppins', sans-serif",
              fontSize: "0.85rem",
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 8px rgba(234, 88, 12, 0.25)",
              transition: "all 0.18s ease",
            }}
            onClick={onClose}
          >
            OK
          </button>

        </div>
      </div>
    </div>
  );
}
