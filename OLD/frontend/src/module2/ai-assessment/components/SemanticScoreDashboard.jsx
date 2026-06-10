// Metrics definition using first file's keys, but labels from second file
const METRICS = [
  { label: "Gap Alignment", key: "gapAlignment" },
  { label: "Methodology", key: "methodology" },
  { label: "Theory / Framework", key: "theoretical" },
  { label: "Citation Quality", key: "citation" },
];

const FLAG_LABELS = {
  TOPIC_MISMATCH: "Topic mismatch",
  NO_METHOD_JUSTIFICATION: "No method justification",
  NO_EVALUATION_METRICS: "No evaluation metrics",
  NO_THEORY_OR_FRAMEWORK: "No theory or framework",
  FRAMEWORK_NAMED_NOT_USED: "Framework named but not meaningfully used",
  REFERENCES_MISSING_OR_UNCLEAR: "References missing or unclear",
  CATALYST_GAP_COVERAGE_TOO_LOW: "CATalyst gap coverage too low",
  SOURCE_COVERAGE_BELOW_80_PERCENT: "Source coverage below 80%",
};

const SPECIAL_TERM_LABELS = {
  ai: "AI",
  apa: "APA",
  doi: "DOI",
  pdf: "PDF",
  rag: "RAG",
  catalyst: "CATalyst",
  api: "API",
};

const formatFlagLabel = (flag) => {
  if (flag === undefined || flag === null) return "";

  const rawValue = String(flag).trim();
  if (!rawValue) return "";

  if (FLAG_LABELS[rawValue]) {
    return FLAG_LABELS[rawValue];
  }

  if (!/^[A-Z0-9_]+$/.test(rawValue)) {
    return rawValue.replace(/\s+/g, " ");
  }

  const readable = rawValue
    .replace(/_/g, " ")
    .toLowerCase()
    .split(/\s+/)
    .map((word) => {
      if (!word) return word;
      if (/^\d+%$/.test(word)) return word;

      const specialLabel = SPECIAL_TERM_LABELS[word];
      if (specialLabel) return specialLabel;

      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");

  return readable.charAt(0).toUpperCase() + readable.slice(1);
};

// Helper to normalise values: 0.75 → 75, 85 → 85
const getPercentage = (value) => {
  if (value === undefined || value === null) return 0;
  if (value <= 1 && value > 0) return Math.round(value * 100);
  return Math.round(value);
};

const ScoreBar = ({ label, value }) => {
  const percent = getPercentage(value);
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "200px 1fr 44px",
        alignItems: "center",
        gap: "16px",
      }}
    >
      <span
        style={{
          fontFamily: "'Poppins', sans-serif",
          fontSize: "13px",
          fontWeight: 500,
          color: "#e0d7cc",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>

      {/* Bar track */}
      <div
        style={{
          height: "8px",
          background: "rgba(255, 255, 255, 0.08)",
          borderRadius: "4px",
          overflow: "hidden",
          border: "1px solid rgba(217, 138, 33, 0.1)",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${percent}%`,
            background: "#D85A30",
            borderRadius: "3px",
            transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
            boxShadow: "0 0 12px rgba(217, 138, 33, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.2)",
          }}
        />
      </div>

      <span
        style={{
          fontFamily: "'Poppins', sans-serif",
          fontSize: "13px",
          color: "#D85A30",
          fontWeight: "700",
          textAlign: "right",
        }}
      >
        {percent}%
      </span>
    </div>
  );
};

const SemanticScoreDashboard = ({ scores = {}, recommendationStatus, confidenceLevel, relevanceLevel, weaknessFlags = [], validationFlags = [] }) => {
  const displayValidationFlags = validationFlags.filter((flag) => {
    const label = String(flag ?? "");
    if (getPercentage(scores.theoretical) === 0 && /^Theory\/Framework.*capped/i.test(label)) {
      return false;
    }
    return true;
  });

  const renderFlagList = (flags, variant) => {
    if (!flags || flags.length === 0) return null;

    return flags.map((flag, idx) => {
      const label = formatFlagLabel(flag);
      return (
        <li
          key={`${variant}-${idx}-${String(flag)}`}
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "13px",
            color: "#f0ece6",
            lineHeight: 1.65,
            marginBottom: "6px",
            fontWeight: 400,
          }}
        >
          {label}
        </li>
      );
    });
  };

  const overallScore = scores.overall !== null && scores.overall !== undefined ? Math.round(scores.overall) : 0;
  const displayStatus = recommendationStatus ? String(recommendationStatus).trim() : "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", fontFamily: "'Poppins', sans-serif" }}>
      {/* Section Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D98A21" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="3" fill="#D98A21" />
          <line x1="12" y1="2" x2="12" y2="6" />
          <line x1="12" y1="18" x2="12" y2="22" />
          <line x1="2" y1="12" x2="6" y2="12" />
          <line x1="18" y1="12" x2="22" y2="12" />
        </svg>
        <span
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: "16px",
            fontWeight: "700",
            color: "#D98A21",
          }}
        >
          Semantic Alignment Scores
        </span>
      </div>

      {/* Top Section: Circular Score + Metric Bars */}
      <div
        style={{
          display: "flex",
          gap: "60px",
          alignItems: "flex-start",
        }}
      >
        {/* Circular Score */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
            minWidth: "140px",
            flexShrink: 0,
            marginLeft: "25px",
          }}
        >
          <div
            style={{
              width: "120px",
              height: "120px",
              borderRadius: "50%",
              border: "10px solid #D85A30",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(217, 138, 33, 0.05)",
            }}
          >
            <span
              style={{
                fontFamily: "'Poppins', sans-serif",
                fontSize: "48px",
                fontWeight: "800",
                color: "#ffffff",
              }}
            >
              {overallScore}
            </span>
          </div>
          {displayStatus && (
            <span
              style={{
                fontFamily: "'Poppins', sans-serif",
                fontSize: "14px",
                fontWeight: "700",
                color: displayStatus.toUpperCase() === 'RECOMMENDED' ? '#D98A21' : '#f0ece6',
                textAlign: "center",
              }}
            >
              {displayStatus}
            </span>
          )}
        </div>

        {/* Score Bars */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "18px",
            flex: 1,
          }}
        >
          {METRICS.map(({ label, key }) => (
            <ScoreBar key={key} label={label} value={scores[key]} />
          ))}
        </div>
      </div>

      {/* Bottom Section: 2x2 Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "16px",
        }}
      >
        {/* Confidence Box */}
        <div
          style={{
            padding: "20px",
            borderRadius: "8px",
            border: "1px solid #3A3630",
            backgroundColor: "#1E1C19",
            minHeight: "108px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "flex-start",
            textAlign: "left",
          }}
        >
          <div
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontSize: "12px",
              fontWeight: 700,
              color: "#D98A21",
              letterSpacing: "0.02em",
              marginBottom: "10px",
              width: "100%",
              textAlign: "left",
            }}
          >
            CONFIDENCE:
          </div>
          <div
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontSize: "30px",
              fontWeight: "800",
              color: "#f0ece6",
              lineHeight: 1,
              width: "100%",
              textAlign: "center",
            }}
          >
            {confidenceLevel || "Unknown"}
          </div>
        </div>

        {/* Relevance Box */}
        <div
          style={{
            padding: "20px",
            borderRadius: "8px",
            border: "1px solid #3A3630",
            backgroundColor: "#1E1C19",
            minHeight: "108px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "flex-start",
            textAlign: "left",
          }}
        >
          <div
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontSize: "12px",
              fontWeight: 700,
              color: "#D98A21",
              letterSpacing: "0.02em",
              marginBottom: "10px",
              width: "100%",
              textAlign: "left",
            }}
          >
            RELEVANCE:
          </div>
          <div
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontSize: "30px",
              fontWeight: "800",
              color: "#f0ece6",
              lineHeight: 1,
              width: "100%",
              textAlign: "center",
            }}
          >
            {relevanceLevel || "Unknown"}
          </div>
        </div>

        {/* Weakness Box */}
        <div
          style={{
            padding: "20px",
            borderRadius: "8px",
            border: "1px solid #3A3630",
            backgroundColor: "rgba(0, 0, 0, 0.15)",
          }}
        >
          <div
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontSize: "12px",
              fontWeight: 700,
              color: "#D98A21",
              letterSpacing: "0.02em",
              marginBottom: "12px",
            }}
          >
            WEAKNESS:
          </div>
          <ul
            style={{
              margin: 0,
              paddingLeft: "22px",
              listStyle: "disc",
            }}
          >
            {renderFlagList(weaknessFlags, 'weakness')}
          </ul>
        </div>

        {/* Validation Box */}
        <div
          style={{
            padding: "20px",
            borderRadius: "8px",
            border: "1px solid #3A3630",
            backgroundColor: "rgba(0, 0, 0, 0.15)",
          }}
        >
          <div
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontSize: "12px",
              fontWeight: 700,
              color: "#D98A21",
              letterSpacing: "0.02em",
              marginBottom: "12px",
            }}
          >
            VALIDATION:
          </div>
          <ul
            style={{
              margin: 0,
              paddingLeft: "22px",
              listStyle: "disc",
            }}
          >
            {renderFlagList(displayValidationFlags, 'validation')}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SemanticScoreDashboard;
