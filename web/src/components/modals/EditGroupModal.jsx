import { useState, useEffect } from "react";

export default function EditWorkspaceModal({ onSubmit, data }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#5b5bd6");

  useEffect(() => {
    if (data) {
      setName(data.name || "");
      setDescription(data.description || "");
      setColor(data.color || "#5b5bd6");
    }
  }, [data]);

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({ name, description, color });
  }

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

  return (
    <div
      className="modal fade"
      id="editWorkspaceModal"
      tabIndex="-1"
      aria-hidden="true"
    >
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content border-0 rounded-4 overflow-hidden">

          {/* Header */}
          <div
            className="px-4 py-3 text-white"
            style={{ backgroundColor: "#5b5bd6" }}
          >
            <h5 className="mb-0 fw-bold">Edit Workspace</h5>
          </div>

          {/* Body */}
          <div className="p-4" style={{ backgroundColor: "#25253a" }}>
            <form onSubmit={handleSubmit}>

              {/* Name */}
              <div className="mb-3">
                <label className="form-label fw-bold" style={{ color: "#e4e4f0" }}>
                  Workspace Name
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  style={{
                    backgroundColor: "#1e1e2f",
                    color: "#e4e4f0",
                    border: "1px solid #3a3a55",
                  }}
                />
              </div>

              {/* Description */}
              <div className="mb-4">
                <label className="form-label fw-bold" style={{ color: "#e4e4f0" }}>
                  Description
                </label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{
                    backgroundColor: "#1e1e2f",
                    color: "#e4e4f0",
                    border: "1px solid #3a3a55",
                  }}
                />
              </div>

              {/* Color Picker */}
              <div className="mb-4">
                <label className="form-label fw-bold" style={{ color: "#e4e4f0" }}>
                  Workspace Color
                </label>
                <div className="d-flex gap-3 flex-wrap">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className="border-0 rounded-circle"
                      style={{
                        width: 36,
                        height: 36,
                        backgroundColor: c,
                        outline:
                          color === c
                            ? "3px solid #5b5bd6"
                            : "2px solid rgba(255,255,255,0.2)",
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  data-bs-dismiss="modal"
                  style={{ color: "#e4e4f0", borderColor: "#3a3a55" }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="btn text-white"
                  style={{ backgroundColor: "#5b5bd6" }}
                >
                  Save Changes
                </button>
              </div>

            </form>
          </div>

        </div>
      </div>
    </div>
  );
}