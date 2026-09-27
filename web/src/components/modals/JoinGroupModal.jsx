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
      <div className="modal-dialog modal-dialog-centered modal-lg workspace-create-dialog">
        <div className="modal-content workspace-create-modal border-0 overflow-hidden">

          {/* Modal Header */}
          <div className="workspace-create-header text-white">
            <div className="workspace-create-header-content">
              <p className="workspace-create-kicker">Join research space</p>
              <h5 className="mb-0 fw-bold">Join Group</h5>
            </div>
            <span className="workspace-create-header-mark" aria-hidden="true">#</span>

            {/* Organic Layered Waves at bottom transition (Image 1 reference) */}
            <div className="workspace-create-wave-wrap" aria-hidden="true">
              <svg viewBox="0 0 600 56" preserveAspectRatio="none" className="workspace-create-wave-svg">
                <path d="M 0,22 C 120,40 240,10 380,28 C 460,38 530,24 600,18 L 600,56 L 0,56 Z" fill="rgba(255, 255, 255, 0.2)" />
                <path d="M 0,28 C 140,14 260,42 390,20 C 470,8 540,26 600,32 L 600,56 L 0,56 Z" fill="rgba(251, 191, 36, 0.4)" />
                <path d="M 0,36 C 130,50 250,22 370,38 C 450,48 520,32 600,26 L 600,56 L 0,56 Z" fill="rgba(192, 132, 252, 0.35)" />
                <path d="M 0,30 C 150,44 270,16 400,32 C 480,42 550,28 600,24 L 600,56 L 0,56 Z" fill="rgba(251, 146, 60, 0.3)" />
                <path d="M 0,38 C 140,52 260,26 390,42 C 470,52 540,38 600,34 L 600,56 L 0,56 Z" fill="#ffffff" />
              </svg>
            </div>
          </div>

          {/* Modal Body */}
          <div className="workspace-create-body">
            <form onSubmit={handleSubmit}>
              {/* Code */}
              <div className="mb-4">
                <label className="form-label workspace-create-label">Group Code</label>
                <input
                  type="text"
                  className="form-control workspace-create-field"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="Enter 6-digit workspace invite code"
                  required
                />
              </div>

              {/* Actions */}
              <div className="d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className="workspace-modal-button workspace-modal-cancel"
                  data-bs-dismiss="modal"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="workspace-modal-button workspace-modal-submit"
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
