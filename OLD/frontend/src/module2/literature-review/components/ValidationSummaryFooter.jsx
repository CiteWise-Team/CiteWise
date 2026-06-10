export default function ValidationSummaryFooter({
    approvedCount = 0,
    totalCount = 0,
    averageScore = 0,
    onProceed,
}) {
    const canProceed = approvedCount > 0;

    return (
        <footer
            style={{
                background: "#1E1C19",
                borderTop: "1px solid #3A3630",
                height: "72px",
                display: "flex",
                alignItems: "center",
                position: "sticky",
                bottom: 0,
                zIndex: 100,
                width: "100%",
            }}
        >
            <div
                style={{
                    maxWidth: 1280,
                    width: "100%",
                    margin: "0 auto",
                    padding: "0 32px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "24px",
                }}
            >
                {/* Stats */}
                <div style={{ display: "flex", alignItems: "center", gap: "0" }}>
                    {/* Approved Documents */}
                    <div
                        style={{
                            paddingRight: "32px",
                            borderRight: "1px solid #3A3630",
                        }}
                    >
                        <div
                            style={{
                                fontFamily: "'Poppins', sans-serif",
                                fontSize: "24px",
                                fontWeight: "700",
                                color: "#f0ece6",
                                lineHeight: 1.1,
                            }}
                        >
                            {approvedCount} / {totalCount}
                        </div>
                        <div
                            style={{
                                fontFamily: "'Geist Mono', monospace",
                                fontSize: "10px",
                                color: "#D98A21",
                                letterSpacing: "1px",
                                textTransform: "uppercase",
                                marginTop: "3px",
                            }}
                        >
                            Approved Documents
                        </div>
                    </div>

                    {/* Average Score */}
                    <div style={{ paddingLeft: "32px" }}>
                        <div
                            style={{
                                fontFamily: "'Poppins', sans-serif",
                                fontSize: "24px",
                                fontWeight: "700",
                                color: "#f0ece6",
                                lineHeight: 1.1,
                            }}
                        >
                            {averageScore.toFixed(2)}%
                        </div>
                        <div
                            style={{
                                fontFamily: "'Geist Mono', monospace",
                                fontSize: "10px",
                                color: "#D98A21",
                                letterSpacing: "1px",
                                textTransform: "uppercase",
                                marginTop: "3px",
                            }}
                        >
                            Average Score
                        </div>
                    </div>
                </div>

                {/* Proceed Button */}
                <button
                    onClick={canProceed ? onProceed : undefined}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        background: canProceed ? "#D85A30" : "#3A3630",
                        border: "none",
                        borderRadius: "8px",
                        padding: "14px 28px",
                        cursor: canProceed ? "pointer" : "not-allowed",
                        transition: "background 0.2s ease, transform 0.1s ease",
                        opacity: canProceed ? 1 : 0.5,
                    }}
                    onMouseEnter={(e) => {
                        if (canProceed) e.currentTarget.style.background = "#e96439";
                    }}
                    onMouseLeave={(e) => {
                        if (canProceed) e.currentTarget.style.background = "#D85A30";
                    }}
                    onMouseDown={(e) => {
                        if (canProceed) e.currentTarget.style.transform = "scale(0.97)";
                    }}
                    onMouseUp={(e) => {
                        if (canProceed) e.currentTarget.style.transform = "scale(1)";
                    }}
                >
                    {/* Arrow icon */}
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <path
                            d="M3 9H15M15 9L10.5 4.5M15 9L10.5 13.5"
                            stroke="#f0ece6"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                    <span
                        style={{
                            fontFamily: "'Poppins', sans-serif",
                            fontSize: "14px",
                            fontWeight: "700",
                            color: "#f0ece6",
                            whiteSpace: "nowrap",
                            letterSpacing: "0.2px",
                        }}
                    >
                        Proceed to Synthesis
                    </span>
                </button>
            </div>
        </footer>
    );
}