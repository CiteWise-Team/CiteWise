import { useEffect, useState } from "react";
import theme, { ui } from "../../../theme";
import * as store from "../../../lib/citewiseStore";

const SOURCE_BADGE = {
  catalyst: { label: "CATalyst", color: theme.accent },
  user: { label: "Your gap", color: theme.success },
  combined: { label: "Combined", color: theme.warning },
};

export default function GapWorkshop({ sessionId, catalystData }) {
  const [gaps, setGaps] = useState(() => store.getGaps(sessionId));
  const [newGapText, setNewGapText] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [expandedNote, setExpandedNote] = useState(null);

  const [titleSuggestions, setTitleSuggestions] = useState([]);
  const [titleLoading, setTitleLoading] = useState(false);
  const [titleError, setTitleError] = useState("");
  const [chosenTitle, setChosenTitleState] = useState(() => store.getChosenTitle(sessionId));
  const [showTitlePanel, setShowTitlePanel] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    const catalystGaps = Array.isArray(catalystData?.gaps) ? catalystData.gaps : [];
    store.seedGapsFromCatalyst(sessionId, catalystGaps);
    setGaps(store.getGaps(sessionId));
  }, [sessionId, catalystData?.gaps]);

  useEffect(() => {
    const unsub = store.subscribe(({ name }) => {
      if (name === "gaps") setGaps(store.getGaps(sessionId));
      if (name === "chosenTitle") setChosenTitleState(store.getChosenTitle(sessionId));
    });
    return unsub;
  }, [sessionId]);

  const selectedGaps = gaps.filter((g) => g.selected);
  const selectedCount = selectedGaps.length;

  const handleAdd = () => {
    const text = newGapText.trim();
    if (!text) return;
    store.addGap(sessionId, text, "user");
    setNewGapText("");
  };

  const saveEdit = () => {
    if (editingId) store.updateGap(sessionId, editingId, { text: editingText.trim() });
    setEditingId(null);
    setEditingText("");
  };

  const handleCombine = () => {
    const ids = selectedGaps.map((g) => g.id);
    if (ids.length < 2) return;
    store.combineGaps(sessionId, ids);
  };

  const handleSuggestTitles = async () => {
    setTitleError("");
    setTitleLoading(true);
    setTitleSuggestions([]);
    setShowTitlePanel(true);
    try {
      const focus = selectedGaps.length ? selectedGaps : gaps;
      const res = await fetch("/api/v1/synthesis/titles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          gapText: focus.map((g) => g.text).join(" "),
          gaps: focus.map((g) => g.text),
          rationale: catalystData?.rationale || "",
        }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.success) throw new Error(payload?.message || "Could not derive titles.");
      setTitleSuggestions(payload.data?.titles || []);
    } catch (err) {
      setTitleError(err.message);
    } finally {
      setTitleLoading(false);
    }
  };

  const pickTitle = (title) => {
    store.setChosenTitle(sessionId, title);
    setChosenTitleState(title);
  };

  return (
    <div
      style={{
        background: "#1e1e2f",
        border: "1px solid #3a3a55",
        borderRadius: "16px",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        maxHeight: "calc(100vh - 120px)",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "1.25rem 1.5rem",
          borderBottom: "1px solid #3a3a55",
          background: "rgba(0,0,0,0.15)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h2 style={{ margin: 0, fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: "1rem", color: "#5b5bd6" }}>
              Research Gap Workshop
            </h2>
            <p style={{ margin: "3px 0 0", fontSize: "0.76rem", color: "#a1a1b5", fontFamily: "'Poppins', sans-serif", lineHeight: 1.4 }}>
              Select, edit, or create gaps. The title is derived from your selection.
            </p>
          </div>
          {selectedCount > 0 && (
            <span
              style={{
                background: "rgba(91,91,214,0.15)",
                border: "1px solid rgba(91,91,214,0.4)",
                borderRadius: "999px",
                padding: "2px 10px",
                fontSize: "0.72rem",
                fontWeight: 700,
                color: "#5b5bd6",
                fontFamily: "'Poppins', sans-serif",
                whiteSpace: "nowrap",
                marginLeft: 8,
                marginTop: 2,
              }}
            >
              {selectedCount} selected
            </span>
          )}
        </div>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>

        {/* Gap list */}
        {gaps.length === 0 ? (
          <div style={{ padding: "2rem 0", textAlign: "center" }}>
            <p style={{ color: "#a1a1b5", fontFamily: "'Poppins', sans-serif", fontSize: "0.85rem", margin: 0, fontStyle: "italic" }}>
              No gaps yet. Import a workspace or write your own below.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
            {gaps.map((gap) => {
              const badge = SOURCE_BADGE[gap.source] || SOURCE_BADGE.user;
              const isEditing = editingId === gap.id;
              const noteOpen = expandedNote === gap.id;
              return (
                <div
                  key={gap.id}
                  style={{
                    background: gap.selected ? "rgba(91,91,214,0.08)" : "rgba(0,0,0,0.15)",
                    border: `1px solid ${gap.selected ? "#5b5bd6" : "#3a3a55"}`,
                    borderRadius: "12px",
                    padding: "1rem",
                    transition: "border-color 0.15s ease, background 0.15s ease",
                  }}
                >
                  {/* Top row: checkbox + badge + focus label */}
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                    <input
                      type="checkbox"
                      checked={gap.selected}
                      onChange={() => store.toggleGapSelected(sessionId, gap.id)}
                      style={{ width: 17, height: 17, accentColor: "#5b5bd6", cursor: "pointer", flexShrink: 0 }}
                      title="Select as research focus"
                    />
                    <span
                      style={{
                        fontSize: "0.62rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        color: badge.color,
                        border: `1px solid ${badge.color}`,
                        borderRadius: "5px",
                        padding: "1px 7px",
                        fontFamily: "'Poppins', sans-serif",
                      }}
                    >
                      {badge.label}
                    </span>
                    {gap.selected && (
                      <span
                        style={{
                          fontSize: "0.62rem",
                          fontWeight: 700,
                          color: "#5b5bd6",
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                          fontFamily: "'Poppins', sans-serif",
                        }}
                      >
                        ● Research focus
                      </span>
                    )}
                  </div>

                  {/* Gap text */}
                  {isEditing ? (
                    <textarea
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      rows={3}
                      autoFocus
                      style={{
                        width: "100%",
                        background: "#25253a",
                        border: "1px solid #3a3a55",
                        borderRadius: "8px",
                        color: "#e4e4f0",
                        padding: "0.6rem 0.75rem",
                        fontFamily: "'Poppins', sans-serif",
                        fontSize: "0.875rem",
                        lineHeight: 1.6,
                        resize: "vertical",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  ) : (
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.875rem",
                        color: "#e4e4f0",
                        lineHeight: 1.65,
                        fontFamily: "'Poppins', sans-serif",
                      }}
                    >
                      {gap.text}
                    </p>
                  )}

                  {/* Note (expand/collapse) */}
                  {!isEditing && (
                    <div style={{ marginTop: "10px" }}>
                      {noteOpen ? (
                        <>
                          <textarea
                            value={gap.note || ""}
                            onChange={(e) => store.updateGap(sessionId, gap.id, { note: e.target.value })}
                            placeholder="Add your note or insight…"
                            rows={2}
                            style={{
                              width: "100%",
                              background: "transparent",
                              border: "1px dashed #3a3a55",
                              borderRadius: "8px",
                              color: "#a1a1b5",
                              padding: "0.5rem 0.75rem",
                              fontFamily: "'Poppins', sans-serif",
                              fontSize: "0.78rem",
                              lineHeight: 1.5,
                              resize: "vertical",
                              outline: "none",
                              boxSizing: "border-box",
                            }}
                          />
                          <button
                            onClick={() => setExpandedNote(null)}
                            style={{ background: "none", border: "none", color: "#a1a1b5", cursor: "pointer", fontSize: "0.72rem", padding: "2px 0", fontFamily: "'Poppins', sans-serif" }}
                          >
                            Hide note
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setExpandedNote(gap.id)}
                          style={{ background: "none", border: "none", color: gap.note ? "#5b5bd6" : "#a1a1b5", cursor: "pointer", fontSize: "0.72rem", padding: "2px 0", fontFamily: "'Poppins', sans-serif" }}
                        >
                          {gap.note ? `📝 Note — ${gap.note.slice(0, 40)}${gap.note.length > 40 ? "…" : ""}` : "+ Add note"}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: "flex", gap: "6px", marginTop: "10px" }}>
                    {isEditing ? (
                      <>
                        <button
                          onClick={saveEdit}
                          style={{ background: "#5b5bd6", color: "#fff", border: "none", borderRadius: "7px", padding: "5px 14px", cursor: "pointer", fontFamily: "'Poppins', sans-serif", fontSize: "0.76rem", fontWeight: 700 }}
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          style={{ background: "transparent", color: "#e4e4f0", border: "1px solid #3a3a55", borderRadius: "7px", padding: "5px 14px", cursor: "pointer", fontFamily: "'Poppins', sans-serif", fontSize: "0.76rem", fontWeight: 600 }}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => { setEditingId(gap.id); setEditingText(gap.text); }}
                          style={{ background: "transparent", color: "#a1a1b5", border: "1px solid #3a3a55", borderRadius: "7px", padding: "4px 12px", cursor: "pointer", fontFamily: "'Poppins', sans-serif", fontSize: "0.74rem", fontWeight: 600 }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => store.removeGap(sessionId, gap.id)}
                          style={{ background: "transparent", color: "#e5544b", border: "1px solid rgba(229,84,75,0.4)", borderRadius: "7px", padding: "4px 12px", cursor: "pointer", fontFamily: "'Poppins', sans-serif", fontSize: "0.74rem", fontWeight: 600 }}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Combine button */}
        {selectedCount >= 2 && (
          <button
            onClick={handleCombine}
            style={{
              background: "rgba(91,91,214,0.1)",
              color: "#5b5bd6",
              border: "1px solid rgba(91,91,214,0.4)",
              borderRadius: "9px",
              padding: "8px 16px",
              cursor: "pointer",
              fontFamily: "'Poppins', sans-serif",
              fontSize: "0.82rem",
              fontWeight: 700,
              alignSelf: "flex-start",
            }}
          >
            Combine {selectedCount} gaps →
          </button>
        )}

        {/* Add your own gap */}
        <div
          style={{
            paddingTop: "0.75rem",
            borderTop: "1px solid #3a3a55",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <span style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#a1a1b5", fontFamily: "'Poppins', sans-serif" }}>
            Add your own gap
          </span>
          <div style={{ display: "flex", gap: "8px" }}>
            <textarea
              value={newGapText}
              onChange={(e) => setNewGapText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAdd(); } }}
              placeholder="Describe a gap you've identified…"
              rows={2}
              style={{
                flex: 1,
                background: "#25253a",
                border: "1px solid #3a3a55",
                borderRadius: "10px",
                color: "#e4e4f0",
                padding: "0.6rem 0.75rem",
                fontFamily: "'Poppins', sans-serif",
                fontSize: "0.85rem",
                resize: "vertical",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <button
              onClick={handleAdd}
              disabled={!newGapText.trim()}
              style={{
                background: newGapText.trim() ? "#5b5bd6" : "#25253a",
                color: newGapText.trim() ? "#fff" : "#a1a1b5",
                border: "none",
                borderRadius: "10px",
                padding: "0 18px",
                cursor: newGapText.trim() ? "pointer" : "not-allowed",
                fontFamily: "'Poppins', sans-serif",
                fontSize: "0.85rem",
                fontWeight: 700,
                flexShrink: 0,
                transition: "background 0.2s ease",
              }}
            >
              Add
            </button>
          </div>
        </div>

        {/* Title section */}
        <div style={{ paddingTop: "0.75rem", borderTop: "1px solid #3a3a55", display: "flex", flexDirection: "column", gap: "0.875rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#a1a1b5", fontFamily: "'Poppins', sans-serif" }}>
              Title from gap(s)
            </span>
            <button
              onClick={handleSuggestTitles}
              disabled={titleLoading || gaps.length === 0}
              style={{
                background: "#5b5bd6",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                padding: "6px 14px",
                cursor: titleLoading || gaps.length === 0 ? "not-allowed" : "pointer",
                fontFamily: "'Poppins', sans-serif",
                fontSize: "0.78rem",
                fontWeight: 700,
                opacity: titleLoading || gaps.length === 0 ? 0.6 : 1,
                whiteSpace: "nowrap",
              }}
            >
              {titleLoading ? "Generating…" : "Suggest titles"}
            </button>
          </div>

          {titleError && (
            <p style={{ color: "#e5544b", fontSize: "0.78rem", margin: 0, fontFamily: "'Poppins', sans-serif" }}>{titleError}</p>
          )}

          {showTitlePanel && titleSuggestions.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {titleSuggestions.map((t, idx) => {
                const active = chosenTitle === t;
                return (
                  <button
                    key={idx}
                    onClick={() => pickTitle(t)}
                    style={{
                      textAlign: "left",
                      background: active ? "rgba(91,91,214,0.12)" : "rgba(0,0,0,0.15)",
                      border: `1px solid ${active ? "#5b5bd6" : "#3a3a55"}`,
                      borderRadius: "10px",
                      padding: "0.7rem 0.9rem",
                      color: "#e4e4f0",
                      cursor: "pointer",
                      fontFamily: "'Poppins', sans-serif",
                      fontSize: "0.82rem",
                      lineHeight: 1.5,
                      transition: "border-color 0.15s ease",
                    }}
                  >
                    {active && (
                      <span style={{ color: "#5b5bd6", fontWeight: 700, fontSize: "0.64rem", display: "block", marginBottom: 3, textTransform: "uppercase" }}>
                        ✓ Chosen
                      </span>
                    )}
                    {t}
                  </button>
                );
              })}
            </div>
          )}

          <div>
            <label style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#a1a1b5", fontFamily: "'Poppins', sans-serif", display: "block", marginBottom: 6 }}>
              Working title
            </label>
            <input
              value={chosenTitle}
              onChange={(e) => pickTitle(e.target.value)}
              placeholder={catalystData?.title || "Derive a title from your gaps above…"}
              style={{
                width: "100%",
                background: "#25253a",
                border: "1px solid #3a3a55",
                borderRadius: "10px",
                color: "#e4e4f0",
                padding: "0.6rem 0.75rem",
                fontFamily: "'Poppins', sans-serif",
                fontSize: "0.85rem",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            {catalystData?.title && (
              <p style={{ margin: "5px 0 0", fontSize: "0.7rem", color: "#a1a1b5", fontFamily: "'Poppins', sans-serif", lineHeight: 1.45 }}>
                Original: "{catalystData.title.slice(0, 80)}{catalystData.title.length > 80 ? "…" : ""}"
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
