export default function DataDisplayGrid({ catalystData, isLoading, error }) {
  if (error) {
    return (
      <div
        style={{
          margin: "1.25rem",
          background: "rgba(220, 38, 38, 0.06)",
          border: "1px solid rgba(220, 38, 38, 0.25)",
          borderRadius: "10px",
          color: "#dc2626",
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
        <p style={sectionLabel}>Research Title</p>
        {isLoading ? (
          <div style={{ height: 24, background: "#f3f4f6", borderRadius: 6, width: "60%" }} />
        ) : (
          <p style={{ margin: 0, fontSize: "1.05rem", fontWeight: 600, color: "#111827", lineHeight: 1.5, fontFamily: "'Poppins', sans-serif" }}>
            {catalystData?.title || <span style={{ color: "#9ca3af", fontStyle: "italic" }}>No title imported</span>}
          </p>
        )}
      </div>

      {/* Rationale */}
      <div>
        <p style={sectionLabel}>Rationale</p>
        {isLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[100, 85, 70].map((w) => (
              <div key={w} style={{ height: 14, background: "#f3f4f6", borderRadius: 4, width: `${w}%` }} />
            ))}
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: "0.875rem", color: "#4b5563", lineHeight: 1.7, fontFamily: "'Poppins', sans-serif" }}>
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
        background: "#f9fafb",
        border: "1px solid #e5e7eb",
        borderRadius: "12px",
        padding: "1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        minHeight: isTitleRow ? "120px" : "240px",
        transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "#f97316";
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 8px 24px rgba(249, 115, 22, 0.10)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "#e5e7eb";
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <p
        style={{
          fontSize: "0.75rem",
          fontWeight: "700",
          letterSpacing: "0.08em",
          color: "#f97316",
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
              color: "#111827",
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
            color: "#6b7280",
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
                background: isSelected ? "rgba(249, 115, 22, 0.06)" : "#ffffff",
                border: isSelected ? "1px solid #f97316" : "1px solid #e5e7eb",
                borderRadius: "10px",
                color: "#1f2937",
                cursor: "pointer",
                padding: "0.85rem",
                boxShadow: isSelected
                  ? "0 0 0 1px rgba(249, 115, 22, 0.15), 0 10px 24px rgba(249, 115, 22, 0.06)"
                  : "none",
                transition:
                  "border-color 0.2s ease, background 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease",
                fontFamily: "'Poppins', sans-serif",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#f97316";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = isSelected ? "#f97316" : "#e5e7eb";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              {isSelected && (
                <span
                  style={{
                    display: "block",
                    color: "#f97316",
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
            color: "#9ca3af",
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

const sectionLabel = {
  margin: "0 0 6px",
  fontSize: "0.7rem",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#f97316",
  fontFamily: "'Poppins', sans-serif",
};

function placeholderText(isTitleRow) {
  return {
    fontSize: isTitleRow ? "1.05rem" : "0.85rem",
    color: "#9ca3af",
    fontStyle: "italic",
    margin: 0,
    fontFamily: "'Poppins', sans-serif",
  };
}