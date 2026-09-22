import { useState } from "react";

const COLORS = [
"#7a1e1e", // maroon
"#d4af37", // gold
"#1e40af", // blue
"#047857", // green
"#7c3aed", // purple
"#be123c", // rose
"#0f766e", // teal
"#374151", // gray
];

export default function CreateGroupModal({ onSubmit }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(COLORS[0]);

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({ name, description, color });
  }

  return (
    <div
      className="modal fade"
      id="createGroupModal"
      tabIndex="-1"
      aria-hidden="true"
    >
      <div className="modal-dialog modal-dialog-centered modal-lg workspace-create-dialog">
        <div className="modal-content workspace-create-modal border-0 overflow-hidden">

          {/* Modal Header */}
          <div
            className="workspace-create-header text-white"
            style={{
              background: `linear-gradient(135deg, ${color} 0%, ${color}e6 55%, ${color}cc 100%)`,
            }}
          >
            <div className="workspace-create-header-content">
              <p className="workspace-create-kicker">New research space</p>
              <h5 className="mb-0 fw-bold">Create Workspace</h5>
            </div>
            <span className="workspace-create-header-mark" aria-hidden="true">+</span>

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
          <div
            className="workspace-create-body"
          >
            <form onSubmit={handleSubmit}>
              {/* Name */}
              <div className="mb-3">
                <label className="form-label workspace-create-label">Workspace Name</label>
                <input
                  type="text"
                  className="form-control workspace-create-field"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              {/* Description */}
              <div className="mb-4">
                <label className="form-label workspace-create-label">Description</label>
                <textarea
                  className="form-control workspace-create-field"
                  rows="3"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* Color Picker */}
              <div className="mb-4">
                <label className="form-label workspace-create-label">Workspace Color</label>
                <div className="d-flex gap-3 flex-wrap">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`workspace-color-swatch${color === c ? " is-selected" : ""}`}
                      style={{
                        width: 36,
                        height: 36,
                        backgroundColor: c,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                      }}
                      aria-label={`Color swatch ${c}`}
                    >
                      {color === c && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
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
                  Create Group
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}