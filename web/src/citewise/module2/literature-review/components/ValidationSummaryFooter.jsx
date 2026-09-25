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
                background: "linear-gradient(180deg, #fffaf5 0%, #fff5ec 100%)",
                borderTop: "1px solid rgba(249, 115, 22, 0.18)",
                height: "72px",
                display: "flex",
                alignItems: "center",
                position: "sticky",
                bottom: 0,
                zIndex: 100,
                width: "100%",
                boxShadow: "0 -2px 12px rgba(249, 115, 22, 0.06)",
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
                            borderRight: "1px solid rgba(249, 115, 22, 0.2)",
                        }}
                    >
                        <div
                            style={{
                                fontFamily: "'Poppins', sans-serif",
                                fontSize: "24px",
                                fontWeight: "700",
                                color: "#111827",
                                lineHeight: 1.1,
                            }}
                        >
                            {approvedCount} / {totalCount}
                        </div>
                        <div
                            style={{
                                fontFamily: "'Poppins', sans-serif",
                                fontSize: "10px",
                                color: "#f97316",
                                letterSpacing: "1px",
                                textTransform: "uppercase",
                                marginTop: "3px",
                                fontWeight: 700,
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
                                color: "#111827",
                                lineHeight: 1.1,
                            }}
                        >
                            {averageScore.toFixed(2)}%
                        </div>
                        <div
                            style={{
                                fontFamily: "'Poppins', sans-serif",
                                fontSize: "10px",
                                color: "#f97316",
                                letterSpacing: "1px",
                                textTransform: "uppercase",
                                marginTop: "3px",
                                fontWeight: 700,
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
                        background: canProceed
                            ? "linear-gradient(135deg, #f97316 0%, #ea580c 100%)"
                            : "#f3f4f6",
                        border: "none",
                        borderRadius: "8px",
                        padding: "14px 28px",
                        cursor: canProceed ? "pointer" : "not-allowed",
                        transition: "background 0.2s ease, transform 0.1s ease, box-shadow 0.2s ease",
                        opacity: canProceed ? 1 : 0.6,
                        boxShadow: canProceed ? "0 4px 12px rgba(249, 115, 22, 0.25)" : "none",
                    }}
                    onMouseEnter={(e) => {
                        if (canProceed) {
                            e.currentTarget.style.background = "linear-gradient(135deg, #fb8c3a 0%, #f97316 100%)";
                            e.currentTarget.style.boxShadow = "0 6px 16px rgba(249, 115, 22, 0.4)";
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (canProceed) {
                            e.currentTarget.style.background = "linear-gradient(135deg, #f97316 0%, #ea580c 100%)";
                            e.currentTarget.style.boxShadow = "0 4px 12px rgba(249, 115, 22, 0.25)";
                        }
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
                            stroke={canProceed ? "#ffffff" : "#9ca3af"}
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
                            color: canProceed ? "#ffffff" : "#9ca3af",
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