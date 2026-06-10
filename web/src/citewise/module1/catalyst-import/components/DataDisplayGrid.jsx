import { useEffect, useMemo, useState } from "react";

/**
 * DataDisplayGrid
 * Renders CATalyst Research Title, Rationale, and Research Gap data.
 */
function normalizeGaps(value) {
  if (value == null) return [];

  if (Array.isArray(value)) {
    return value
      .map((gap) => {
        if (typeof gap === "string") return gap.trim();
        if (gap && typeof gap === "object") {
          return String(
            gap.gap ??
              gap.researchGap ??
              gap.research_gap ??
              gap.description ??
              gap.statement ??
              gap.text ??
              ""
          ).trim();
        }
        return String(gap ?? "").trim();
      })
      .filter(Boolean);
  }

  if (typeof value === "object") {
    return normalizeGaps(
      value.gaps ?? value.gap ?? value.researchGaps ?? value.research_gap ?? value.researchGap
    );
  }

  const raw = String(value).trim();
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    const parsedGaps = normalizeGaps(parsed);
    if (parsedGaps.length) return parsedGaps;
  } catch {
    // Plain text gap strings are valid CATalyst input too.
  }

  return raw
    .split(/\r?\n+/)
    .map((gap) => gap.replace(/^\s*(?:[-*]|\d+[.)])\s*/, "").trim())
    .filter(Boolean);
}

function getChosenGapStorageKey(sessionId) {
  return sessionId ? `citewise_chosen_gap_${sessionId}` : "citewise_chosen_gap_default";
}

function saveChosenGap(sessionId, gapIndex, gapText) {
  localStorage.setItem(getChosenGapStorageKey(sessionId), gapText);
  localStorage.setItem(
    `${getChosenGapStorageKey(sessionId)}_meta`,
    JSON.stringify({
      gapIndex,
      gapText,
      selectedAt: new Date().toISOString(),
    })
  );
}

function loadChosenGap(sessionId) {
  const stored = localStorage.getItem(getChosenGapStorageKey(sessionId));
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored);
    return typeof parsed === "string" ? { gapText: parsed } : parsed;
  } catch {
    return { gapText: stored };
  }
}

export default function DataDisplayGrid({ catalystData, isLoading, error }) {
  if (error) {
    return (
      <div
        style={{
          margin: "1.25rem",
          background: "rgba(91, 91, 214, 0.08)",
          border: "1px solid rgba(91, 91, 214, 0.25)",
          borderRadius: "8px",
          color: "#5b5bd6",
          fontSize: "0.875rem",
          fontFamily: "'Poppins', sans-serif",
          fontWeight: 600,
          padding: "0.75rem 1rem",
          textAlign: "center",
        }}
      >
        {error}
      </div>
    );
  }

  if (!catalystData && !isLoading) return null;

  return (
    <div style={{ padding: "1.5rem 2rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Research Title */}
      <div>
        <p style={{ margin: "0 0 6px", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#5b5bd6", fontFamily: "'Poppins', sans-serif" }}>
          Research Title
        </p>
        {isLoading ? (
          <div style={{ height: 24, background: "#25253a", borderRadius: 6, width: "60%" }} />
        ) : (
          <p style={{ margin: 0, fontSize: "1.05rem", fontWeight: 600, color: "#e4e4f0", lineHeight: 1.5, fontFamily: "'Poppins', sans-serif" }}>
            {catalystData?.title || <span style={{ color: "#a1a1b5", fontStyle: "italic" }}>No title imported</span>}
          </p>
        )}
      </div>

      {/* Rationale */}
      <div>
        <p style={{ margin: "0 0 6px", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#5b5bd6", fontFamily: "'Poppins', sans-serif" }}>
          Rationale
        </p>
        {isLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[100, 85, 70].map((w) => (
              <div key={w} style={{ height: 14, background: "#25253a", borderRadius: 4, width: `${w}%` }} />
            ))}
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: "0.875rem", color: "#a1a1b5", lineHeight: 1.7, fontFamily: "'Poppins', sans-serif" }}>
            {catalystData?.rationale || <span style={{ fontStyle: "italic" }}>No rationale imported</span>}
          </p>
        )}
      </div>
    </div>
  );
}

function DataColumn({
  label,
  value,
  isLoading,
  isList,
  isTitleRow,
  selectedGapIndex,
  onGapSelect,
}) {
  const hasListValue = isList && Array.isArray(value) && value.length > 0;
  const hasPlainValue = !isList && value;

  return (
    <div
      style={{
        background: "rgba(0, 0, 0, 0.15)",
        border: "1px solid #3a3a55",
        borderRadius: "12px",
        padding: "1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        minHeight: isTitleRow ? "120px" : "240px",
        transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "#5b5bd6";
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 6px 20px rgba(91, 91, 214, 0.08)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "#3a3a55";
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <p
        style={{
          fontSize: "0.75rem",
          fontWeight: "700",
          letterSpacing: "0.08em",
          color: "#5b5bd6",
          textTransform: "uppercase",
          fontFamily: "'Poppins', sans-serif",
          margin: 0,
        }}
      >
        {label}
      </p>

      <div
        style={{
          background: "none",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-start",
          overflowY: "auto",
        }}
      >
        {isLoading ? (
          <p style={placeholderText(isTitleRow)}>Loading...</p>
        ) : hasListValue ? (
          <PrimaryGapSelector
            gaps={value}
            selectedGapIndex={selectedGapIndex}
            onGapSelect={onGapSelect}
          />
        ) : hasPlainValue ? (
          <p
            style={{
              fontSize: isTitleRow ? "1.15rem" : "0.85rem",
              fontWeight: isTitleRow ? "600" : "400",
              color: "#e4e4f0",
              lineHeight: isTitleRow ? 1.45 : 1.65,
              margin: 0,
              fontFamily: "'Poppins', sans-serif",
            }}
          >
            {value}
          </p>
        ) : (
          <p style={placeholderText(isTitleRow)}>[Awaiting Import]</p>
        )}
      </div>
    </div>
  );
}

function PrimaryGapSelector({ gaps, selectedGapIndex, onGapSelect }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
      {gaps.length > 1 && (
        <p
          style={{
            fontSize: "0.78rem",
            color: "rgba(240, 236, 230, 0.72)",
            lineHeight: 1.5,
            margin: 0,
            fontFamily: "'Poppins', sans-serif",
          }}
        >
          Select the primary focus for scoring and synthesis. All imported gaps remain available.
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
        {gaps.map((gap, idx) => {
          const isSelected = selectedGapIndex === idx;
          return (
            <button
              key={`${idx}-${gap}`}
              type="button"
              onClick={() => onGapSelect?.(idx, gap)}
              style={{
                appearance: "none",
                width: "100%",
                textAlign: "left",
                background: isSelected ? "rgba(91, 91, 214, 0.12)" : "rgba(0, 0, 0, 0.18)",
                border: isSelected ? "1px solid #5b5bd6" : "1px solid rgba(240, 236, 230, 0.12)",
                borderRadius: "10px",
                color: "#e4e4f0",
                cursor: "pointer",
                padding: "0.85rem",
                boxShadow: isSelected
                  ? "0 0 0 1px rgba(91, 91, 214, 0.18), 0 10px 24px rgba(91, 91, 214, 0.08)"
                  : "none",
                transition:
                  "border-color 0.2s ease, background 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease",
                fontFamily: "'Poppins', sans-serif",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#5b5bd6";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = isSelected ? "#5b5bd6" : "rgba(240, 236, 230, 0.12)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              {isSelected && (
                <span
                  style={{
                    display: "block",
                    color: "#5b5bd6",
                    fontSize: "0.68rem",
                    fontWeight: 800,
                    letterSpacing: "0.06em",
                    marginBottom: "0.4rem",
                    textTransform: "uppercase",
                  }}
                >
                  Primary focus
                </span>
              )}
              <span style={{ display: "block", fontSize: "0.84rem", lineHeight: 1.55 }}>
                {gap}
              </span>
            </button>
          );
        })}
      </div>
      {selectedGapIndex != null && (
        <p
          style={{
            fontSize: "0.72rem",
            color: "rgba(240, 236, 230, 0.55)",
            lineHeight: 1.45,
            margin: 0,
            fontFamily: "'Poppins', sans-serif",
          }}
        >
          Selected gap is saved locally in your browser and marked as the primary focus.
        </p>
      )}
    </div>
  );
}

function placeholderText(isTitleRow) {
  return {
    fontSize: isTitleRow ? "1.05rem" : "0.85rem",
    color: "rgba(240, 236, 230, 0.4)",
    fontStyle: "italic",
    margin: 0,
    fontFamily: "'Poppins', sans-serif",
  };
}
