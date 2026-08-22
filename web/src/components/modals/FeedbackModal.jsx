export default function FeedbackModal({ type, title, message }) {
  const isSuccess = type === "success";

  return (
    <div
      className="modal fade"
      id="feedbackModal"
      tabIndex="-1"
      aria-hidden="true"
    >
      <div className="modal-dialog modal-dialog-centered">
        <div
          className="modal-content text-center p-4"
          style={{
            backgroundColor: "#25253a",
            border: "1px solid #3a3a55",
            borderRadius: "16px",
            color: "#e4e4f0",
            fontFamily: "'Poppins', sans-serif",
            boxShadow: "0 24px 60px rgba(0, 0, 0, 0.45)",
          }}
        >

          {/* Icon */}
          <div
            className="mx-auto mb-3 d-flex align-items-center justify-content-center rounded-circle"
            style={{
              width: 64,
              height: 64,
              backgroundColor: isSuccess ? "rgba(91, 91, 214, 0.1)" : "rgba(229, 84, 75, 0.14)",
              border: `1px solid ${isSuccess ? "#5b5bd6" : "#e5544b"}`,
              color: isSuccess ? "#5b5bd6" : "#e5544b",
              boxShadow: isSuccess ? "0 0 20px rgba(91, 91, 214, 0.14)" : "none",
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
          <h5 className="fw-bold" style={{ color: "#e4e4f0" }}>{title}</h5>
          <p className="mb-4" style={{ color: "#a1a1b5" }}>{message}</p>

          {/* OK Button */}
          <button
            className="btn px-5"
            style={{
              backgroundColor: "#5b5bd6",
              border: "1px solid #5b5bd6",
              borderRadius: "10px",
              color: "#fff",
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 600,
            }}
            data-bs-dismiss="modal"
          >
            OK
          </button>

        </div>
      </div>
    </div>
  );
}
