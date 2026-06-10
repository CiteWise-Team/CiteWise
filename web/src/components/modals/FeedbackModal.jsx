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
        <div className="modal-content border-0 rounded-4 text-center p-4">

          {/* Icon */}
          <div
            className="mx-auto mb-3 d-flex align-items-center justify-content-center rounded-circle"
            style={{
              width: 72,
              height: 72,
              backgroundColor: isSuccess ? "#198754" : "#dc3545",
              color: "white",
            }}
          >
            <span className="material-symbols-outlined fs-1">
              {isSuccess ? "check" : "error"}
            </span>
          </div>

          {/* Text */}
          <h5 className="fw-bold">{title}</h5>
          <p className="text-muted mb-4">{message}</p>

          {/* OK Button */}
          <button
            className="btn btn-dark px-5 rounded-pill"
            data-bs-dismiss="modal"
          >
            OK
          </button>

        </div>
      </div>
    </div>
  );
}
