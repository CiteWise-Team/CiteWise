import { useState } from "react";


export default function JoinGroupModal({ onSubmit }) {
  const [joinCode, setJoinCode] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({ joinCode });
  }

  return (
    <div
      className="modal fade"
      id="joinGroupModal"
      tabIndex="-1"
      aria-hidden="true"
    >
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content border-0 rounded-4 overflow-hidden">

          {/* Modal Header (Navbar-like) */}
          <div
            className="px-4 py-3 text-white"
            style={{ backgroundColor: "#7a1e1e" }}
          >
            <h5 className="mb-0 fw-bold">Join Group</h5>
          </div>

          {/* Modal Body */}
          <div
            className="p-4"
            style={{
              backgroundColor: "rgba(212, 175, 55, 0.15)",
            }}
          >
            <form onSubmit={handleSubmit}>
              {/* Name */}
              <div className="mb-3">
                <label className="form-label fw-bold">Group Code</label>
                <input
                  type="text"
                  className="form-control"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  required
                />
              </div>

              {/* Actions */}
              <div className="d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  data-bs-dismiss="modal"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn text-white"
                  style={{ backgroundColor: "#7a1e1e" }}
                >
                  Send Join Request
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
