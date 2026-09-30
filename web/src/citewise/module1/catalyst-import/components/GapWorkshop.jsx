import { useEffect, useState, useRef } from "react";
import { Pencil, Trash2, Check, X } from "lucide-react";
import theme, { ui } from "../../../theme";
import * as store from "../../../lib/citewiseStore";
import { apiFetch } from "../../../../api/http";
import useIsMobile from "../../../../hooks/useIsMobile";

const SOURCE_BADGE = {
  catalyst: { label: "CATalyst", color: theme.accent },
  user: { label: "Your gap", color: theme.success },
  combined: { label: "Combined", color: theme.warning },
};

export default function GapWorkshop({ sessionId, catalystData }) {
  const isMobile = useIsMobile();
  const [gaps, setGaps] = useState(() => store.getGaps(sessionId));
  const [newGapText, setNewGapText] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [expandedNote, setExpandedNote] = useState(null);
  const newGapInputRef = useRef(null);

  useEffect(() => {
    const el = newGapInputRef.current;
    if (!el) return;
    el.style.height = "auto";
    const nextHeight = Math.min(Math.max(el.scrollHeight, 38), 180);
    el.style.height = `${nextHeight}px`;
  }, [newGapText]);

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
      const { res, data: payload } = await apiFetch("/api/v1/synthesis/titles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          gapText: focus.map((g) => g.text).join(" "),
          gaps: focus.map((g) => g.text),
          rationale: catalystData?.rationale || "",
        }),
      });
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
    <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? "16px" : "24px" }}>
      {/* ── Panel 1: Research Gap Workshop ─────────────────────── */}
      <div
        className="citewise-gap-workshop-panel cw-m-auto-height"
        data-guide="citewise-gap-workshop"
        style={{
          background: "var(--cw-bg-surface, #ffffff)",
          border: "1px solid var(--cw-border, #e5e7eb)",
          borderRadius: "16px",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.05)",
        }}
      >
        {/* Header */}
        <div
          className="workflow-card-header"
          style={{
            padding: "1.125rem 1.5rem",
            borderBottom: "1px solid var(--cw-border, #e5e7eb)",
            background: "var(--cw-bg-surface-elevated, #f9fafb)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1rem",
            flexShrink: 0,
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: "1.05rem", color: "var(--cw-text-primary, #0f0e17)" }}>
              Research Gap Workshop
            </h2>
            <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "var(--cw-text-muted, #6b7280)", fontFamily: "'Poppins', sans-serif", lineHeight: 1.4 }}>
              Select, edit, or create gaps. The title is derived from your selection.
            </p>
          </div>
          {selectedCount > 0 && (
            <span
              style={{
                background: "rgba(234, 88, 12, 0.1)",
                border: "1px solid rgba(234, 88, 12, 0.4)",
                borderRadius: "999px",
                padding: "2px 10px",
                fontSize: "0.72rem",
                fontWeight: 700,
                color: "#ea580c",
                fontFamily: "'Poppins', sans-serif",
                whiteSpace: "nowrap",
                marginLeft: 8,
              }}
            >
              {selectedCount} selected
            </span>
          )}
        </div>

        {/* Scrollable body */}
        <div style={{ padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Gap list */}
          {gaps.length === 0 ? (
            <div style={{ padding: "2rem 0", textAlign: "center" }}>
              <p style={{ color: "var(--cw-text-muted, #9ca3af)", fontFamily: "'Poppins', sans-serif", fontSize: "0.85rem", margin: 0, fontStyle: "italic" }}>
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
                    className={`citewise-gap-card ${gap.selected ? "selected" : ""}`}
                    role={isEditing ? undefined : "button"}
                    tabIndex={isEditing ? undefined : 0}
                    aria-pressed={isEditing ? undefined : gap.selected}
                    onClick={(e) => {
                      if (isEditing) return;
                      if (e.target.closest("button, textarea, input, a")) return;
                      store.toggleGapSelected(sessionId, gap.id);
                    }}
                    onKeyDown={(e) => {
                      if (isEditing) return;
                      if (e.key === "Enter" || e.key === " ") {
                        if (e.target.closest("button, textarea, input, a")) return;
                        e.preventDefault();
                        store.toggleGapSelected(sessionId, gap.id);
                      }
                    }}
                    style={{
                      borderRadius: "12px",
                      padding: "1rem",
                      cursor: isEditing ? "default" : "pointer",
                      transition: "border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease",
                    }}
                  >
                    {/* Top row: checkbox + badge + focus label ON LEFT, Edit/Delete icons ON RIGHT */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", marginBottom: "10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", minWidth: 0 }}>
                        <input
                          type="checkbox"
                          checked={gap.selected}
                          onChange={() => store.toggleGapSelected(sessionId, gap.id)}
                          onClick={(e) => e.stopPropagation()}
                          style={{ width: 17, height: 17, accentColor: "#ea580c", cursor: "pointer", flexShrink: 0 }}
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
                              color: "#ea580c",
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                              fontFamily: "'Poppins', sans-serif",
                            }}
                          >
                            ● Research focus
                          </span>
                        )}
                      </div>

                      {/* Top-Right Action Icons */}
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                        {!isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setEditingId(gap.id); setEditingText(gap.text); }}
                              title="Edit gap"
                              aria-label="Edit gap"
                              style={{
                                background: "transparent",
                                border: "1px solid var(--cw-border, #e5e7eb)",
                                borderRadius: "6px",
                                color: "var(--cw-text-muted, #9ca3af)",
                                cursor: "pointer",
                                padding: "5px",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                transition: "all 0.15s ease",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = "#ea580c";
                                e.currentTarget.style.borderColor = "#ea580c";
                                e.currentTarget.style.background = "rgba(234, 88, 12, 0.08)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = "var(--cw-text-muted, #9ca3af)";
                                e.currentTarget.style.borderColor = "var(--cw-border, #e5e7eb)";
                                e.currentTarget.style.background = "transparent";
                              }}
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); store.removeGap(sessionId, gap.id); }}
                              title="Delete gap"
                              aria-label="Delete gap"
                              style={{
                                background: "transparent",
                                border: "1px solid var(--cw-border, #e5e7eb)",
                                borderRadius: "6px",
                                color: "var(--cw-text-muted, #9ca3af)",
                                cursor: "pointer",
                                padding: "5px",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                transition: "all 0.15s ease",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = "#dc2626";
                                e.currentTarget.style.borderColor = "#dc2626";
                                e.currentTarget.style.background = "rgba(220, 38, 38, 0.08)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = "var(--cw-text-muted, #9ca3af)";
                                e.currentTarget.style.borderColor = "var(--cw-border, #e5e7eb)";
                                e.currentTarget.style.background = "transparent";
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setEditingId(null); setEditingText(""); }}
                            title="Cancel editing"
                            aria-label="Cancel editing"
                            style={{
                              background: "transparent",
                              border: "1px solid var(--cw-border, #e5e7eb)",
                              borderRadius: "6px",
                              color: "var(--cw-text-muted, #9ca3af)",
                              cursor: "pointer",
                              padding: "5px",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              transition: "all 0.15s ease",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = "#dc2626";
                              e.currentTarget.style.borderColor = "#dc2626";
                              e.currentTarget.style.background = "rgba(220, 38, 38, 0.08)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = "var(--cw-text-muted, #9ca3af)";
                              e.currentTarget.style.borderColor = "var(--cw-border, #e5e7eb)";
                              e.currentTarget.style.background = "transparent";
                            }}
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Gap text */}
                    {isEditing ? (
                      <div onClick={(e) => e.stopPropagation()}>
                        <textarea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          rows={3}
                          autoFocus
                          style={{
                            width: "100%",
                            background: "var(--cw-bg-input, #ffffff)",
                            border: "1px solid #ea580c",
                            borderRadius: "8px",
                            color: "var(--cw-text-primary, #111827)",
                            padding: "0.6rem 0.75rem",
                            fontFamily: "'Poppins', sans-serif",
                            fontSize: "0.875rem",
                            lineHeight: 1.6,
                            resize: "vertical",
                            outline: "none",
                            boxSizing: "border-box",
                            boxShadow: "0 0 0 2px rgba(234, 88, 12, 0.15)",
                          }}
                        />
                        <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); saveEdit(); }}
                            disabled={!editingText.trim()}
                            className="citewise-gap-btn-save"
                            title={!editingText.trim() ? "Enter gap text to save" : "Save changes"}
                          >
                            <Check size={14} />
                            <span>Save</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setEditingId(null); setEditingText(""); }}
                            className="citewise-gap-btn-cancel"
                            title="Cancel editing"
                          >
                            <X size={14} />
                            <span>Cancel</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p
                        style={{
                          margin: 0,
                          fontSize: "0.875rem",
                          color: "var(--cw-text-primary, #1f2937)",
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
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => store.updateGap(sessionId, gap.id, { note: e.target.value })}
                              placeholder="Add your note or insight…"
                              rows={2}
                              style={{
                                width: "100%",
                                background: "transparent",
                                border: "1px dashed var(--cw-border, #d1d5db)",
                                borderRadius: "8px",
                                color: "var(--cw-text-secondary, #6b7280)",
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
                              onClick={(e) => { e.stopPropagation(); setExpandedNote(null); }}
                              style={{ background: "none", border: "none", color: "var(--cw-text-muted, #9ca3af)", cursor: "pointer", fontSize: "0.72rem", padding: "2px 0", fontFamily: "'Poppins', sans-serif" }}
                            >
                              Hide note
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); setExpandedNote(gap.id); }}
                            style={{ background: "none", border: "none", color: gap.note ? "#ea580c" : "var(--cw-text-muted, #9ca3af)", cursor: "pointer", fontSize: "0.72rem", padding: "2px 0", fontFamily: "'Poppins', sans-serif" }}
                          >
                            {gap.note ? `📝 Note — ${gap.note.slice(0, 40)}${gap.note.length > 40 ? "…" : ""}` : "+ Add note"}
                          </button>
                        )}
                      </div>
                    )}
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
                background: "rgba(234, 88, 12, 0.08)",
                color: "#ea580c",
                border: "1px solid rgba(234, 88, 12, 0.4)",
                borderRadius: "8px",
                padding: "8px 16px",
                cursor: "pointer",
                fontFamily: "'Poppins', sans-serif",
                fontSize: "0.82rem",
                fontWeight: 700,
                alignSelf: "flex-start",
                transition: "all 180ms ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.borderColor = "#ea580c";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(234, 88, 12, 0.18)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.borderColor = "rgba(234, 88, 12, 0.4)";
                e.currentTarget.style.boxShadow = "none";
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              Combine {selectedCount} gaps →
            </button>
          )}
        </div>
      </div>

      {/* ── Panel 2: Add Your Own Gap ──────────────────────────── */}
      <div
        className="citewise-add-gap-panel"
        data-guide="citewise-add-gap"
        style={{
          background: "var(--cw-bg-surface, #ffffff)",
          border: "1px solid var(--cw-border, #e5e7eb)",
          borderRadius: "16px",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.05)",
        }}
      >
        <div
          className="workflow-card-header"
          style={{
            padding: "1.125rem 1.5rem",
            borderBottom: "1px solid var(--cw-border, #e5e7eb)",
            background: "var(--cw-bg-surface-elevated, #f9fafb)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1rem",
            flexShrink: 0,
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: "1.05rem", color: "var(--cw-text-primary, #0f0e17)" }}>
              Add Your Own Gap
            </h2>
            <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "var(--cw-text-muted, #6b7280)", fontFamily: "'Poppins', sans-serif", lineHeight: 1.4 }}>
              Describe an identified research gap to add it to your working list.
            </p>
          </div>
        </div>

        <div style={{ padding: "1.25rem 1.5rem" }}>
          <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
            <textarea
              ref={newGapInputRef}
              value={newGapText}
              onChange={(e) => {
                setNewGapText(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(Math.max(e.target.scrollHeight, 38), 180)}px`;
              }}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAdd(); } }}
              placeholder="Describe a gap you've identified…"
              rows={1}
              style={{
                flex: 1,
                minHeight: "38px",
                height: "38px",
                maxHeight: "180px",
                background: "var(--cw-bg-input, #ffffff)",
                border: "1px solid var(--cw-border, #e5e7eb)",
                borderRadius: "8px",
                color: "var(--cw-text-primary, #111827)",
                padding: "0.5rem 0.85rem",
                fontFamily: "'Poppins', sans-serif",
                fontSize: "0.85rem",
                lineHeight: 1.45,
                resize: "none",
                overflowY: "auto",
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.15s ease, box-shadow 0.15s ease",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#ea580c";
                e.currentTarget.style.boxShadow = "0 0 0 2px rgba(234, 88, 12, 0.15)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--cw-border, #e5e7eb)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
            <button
              onClick={handleAdd}
              disabled={!newGapText.trim()}
              style={{
                background: newGapText.trim() ? "#ea580c" : "var(--cw-border-subtle, rgba(255, 255, 255, 0.08))",
                color: newGapText.trim() ? "#ffffff" : "var(--cw-text-muted, #9ca3af)",
                border: `1px solid ${newGapText.trim() ? "#ea580c" : "var(--cw-border, #e5e7eb)"}`,
                borderRadius: "8px",
                padding: "0 18px",
                height: "38px",
                cursor: newGapText.trim() ? "pointer" : "not-allowed",
                fontFamily: "'Poppins', sans-serif",
                fontSize: "0.82rem",
                fontWeight: 700,
                flexShrink: 0,
                transition: "all 180ms ease",
                boxShadow: newGapText.trim() ? "0 2px 8px rgba(234, 88, 12, 0.22)" : "none",
              }}
              onMouseEnter={(e) => {
                if (newGapText.trim()) {
                  e.currentTarget.style.background = "#c2410c";
                  e.currentTarget.style.borderColor = "#c2410c";
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 4px 14px rgba(234, 88, 12, 0.35)";
                }
              }}
              onMouseLeave={(e) => {
                if (newGapText.trim()) {
                  e.currentTarget.style.background = "#ea580c";
                  e.currentTarget.style.borderColor = "#ea580c";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(234, 88, 12, 0.22)";
                }
              }}
              onMouseDown={(e) => {
                if (newGapText.trim()) {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 2px 6px rgba(234, 88, 12, 0.2)";
                }
              }}
            >
              Add
            </button>
          </div>
        </div>
      </div>

      {/* ── Panel 3: Title From Gap(s) ─────────────────────────── */}
      <div
        className="citewise-title-gap-panel"
        data-guide="citewise-title-gap"
        style={{
          background: "var(--cw-bg-surface, #ffffff)",
          border: "1px solid var(--cw-border, #e5e7eb)",
          borderRadius: "16px",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.05)",
        }}
      >
        <div
          className="workflow-card-header"
          style={{
            padding: "1.125rem 1.5rem",
            borderBottom: "1px solid var(--cw-border, #e5e7eb)",
            background: "var(--cw-bg-surface-elevated, #f9fafb)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1rem",
            flexShrink: 0,
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: "1.05rem", color: "var(--cw-text-primary, #0f0e17)" }}>
              Title from Gap(s)
            </h2>
            <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "var(--cw-text-muted, #6b7280)", fontFamily: "'Poppins', sans-serif", lineHeight: 1.4 }}>
              Derive or refine your working paper title from the selected gaps.
            </p>
          </div>
          <button
            onClick={handleSuggestTitles}
            disabled={titleLoading || gaps.length === 0}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              height: "38px",
              minHeight: "38px",
              padding: "0 16px",
              background: "#ea580c",
              color: "#ffffff",
              border: "1px solid #ea580c",
              borderRadius: "8px",
              cursor: titleLoading || gaps.length === 0 ? "not-allowed" : "pointer",
              fontFamily: "'Poppins', sans-serif",
              fontSize: "0.82rem",
              fontWeight: 600,
              opacity: titleLoading || gaps.length === 0 ? 0.6 : 1,
              whiteSpace: "nowrap",
              boxShadow: "0 2px 8px rgba(234, 88, 12, 0.22)",
              flexShrink: 0,
              transition: "all 180ms ease",
            }}
            onMouseEnter={(e) => {
              if (!titleLoading && gaps.length > 0) {
                e.currentTarget.style.background = "#c2410c";
                e.currentTarget.style.borderColor = "#c2410c";
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 4px 14px rgba(234, 88, 12, 0.35)";
              }
            }}
            onMouseLeave={(e) => {
              if (!titleLoading && gaps.length > 0) {
                e.currentTarget.style.background = "#ea580c";
                e.currentTarget.style.borderColor = "#ea580c";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(234, 88, 12, 0.22)";
              }
            }}
            onMouseDown={(e) => {
              if (!titleLoading && gaps.length > 0) {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 2px 6px rgba(234, 88, 12, 0.2)";
              }
            }}
          >
            {titleLoading ? "Generating…" : "Suggest titles"}
          </button>
        </div>

        <div style={{ padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          {titleError && (
            <p style={{ color: "#dc2626", fontSize: "0.78rem", margin: 0, fontFamily: "'Poppins', sans-serif" }}>{titleError}</p>
          )}

          {showTitlePanel && titleSuggestions.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <span style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--cw-text-muted, #6b7280)", fontFamily: "'Poppins', sans-serif" }}>
                AI Suggested Titles
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {titleSuggestions.map((t, idx) => {
                  const active = chosenTitle === t;
                  return (
                    <button
                      key={idx}
                      onClick={() => pickTitle(t)}
                      style={{
                        textAlign: "left",
                        background: active ? "rgba(234, 88, 12, 0.08)" : "var(--cw-bg-surface-elevated, #f9fafb)",
                        border: `1px solid ${active ? "#ea580c" : "var(--cw-border, #e5e7eb)"}`,
                        borderRadius: "10px",
                        padding: "0.7rem 0.9rem",
                        color: "var(--cw-text-primary, #1f2937)",
                        cursor: "pointer",
                        fontFamily: "'Poppins', sans-serif",
                        fontSize: "0.82rem",
                        lineHeight: 1.5,
                        transition: "border-color 0.15s ease",
                      }}
                    >
                      {active && (
                        <span style={{ color: "#ea580c", fontWeight: 700, fontSize: "0.64rem", display: "block", marginBottom: 3, textTransform: "uppercase" }}>
                          ✓ Chosen
                        </span>
                      )}
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <label style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#ea580c", fontFamily: "'Poppins', sans-serif", display: "block", marginBottom: 6 }}>
              Working title
            </label>
            <input
              value={chosenTitle}
              onChange={(e) => pickTitle(e.target.value)}
              placeholder={catalystData?.title || "Derive a title from your gaps above…"}
              style={{
                width: "100%",
                background: "var(--cw-bg-input, #ffffff)",
                border: "1px solid var(--cw-border, #e5e7eb)",
                borderRadius: "10px",
                color: "var(--cw-text-primary, #111827)",
                padding: "0.65rem 0.85rem",
                fontFamily: "'Poppins', sans-serif",
                fontSize: "0.85rem",
                outline: "none",
                boxSizing: "border-box",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#ea580c";
                e.currentTarget.style.boxShadow = "0 0 0 2px rgba(234, 88, 12, 0.15)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--cw-border, #e5e7eb)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
            {catalystData?.title && (
              <p style={{ margin: "6px 0 0", fontSize: "0.72rem", color: "var(--cw-text-muted, #6b7280)", fontFamily: "'Poppins', sans-serif", lineHeight: 1.45 }}>
                Original: "{catalystData.title.slice(0, 90)}{catalystData.title.length > 90 ? "…" : ""}"
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}