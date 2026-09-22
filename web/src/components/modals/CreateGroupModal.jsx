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

          {/* Modal Header (Navbar-like) */}
          <div className="workspace-create-header text-white">
            <div>
              <p className="workspace-create-kicker">New research space</p>
              <h5 className="mb-0 fw-bold">Create Workspace</h5>
            </div>
            <span className="workspace-create-header-mark" aria-hidden="true">+</span>
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
                      }}
                    />
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