import useIsMobile, { MOBILE_TABBAR_HEIGHT } from "../../../../hooks/useIsMobile";

export default function ValidationSummaryFooter({
    approvedCount = 0,
    totalCount = 0,
    averageScore = 0,
    onProceed,
}) {
    const canProceed = approvedCount > 0;
    const isMobile = useIsMobile();

    return (
        <footer
            style={{
                background: "#1e1e2f",
                borderTop: "1px solid #3a3a55",
                height: isMobile ? "64px" : "72px",
                display: "flex",
                alignItems: "center",
                position: "sticky",
                bottom: isMobile ? `calc(${MOBILE_TABBAR_HEIGHT}px + env(safe-area-inset-bottom))` : 0,
                zIndex: 100,
                width: "100%",
            }}
        >
            <div
                style={{
                    maxWidth: 1280,
                    width: "100%",
                    margin: "0 auto",
                    padding: isMobile ? "0 12px" : "0 32px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: isMobile ? "10px" : "24px",
                }}
            >
                {/* Stats */}
                <div style={{ display: "flex", alignItems: "center", gap: "0" }}>
                    {/* Approved Documents */}
                    <div
                        style={{
                            paddingRight: isMobile ? "12px" : "32px",
                            borderRight: "1px solid #3a3a55",
                        }}
                    >
                        <div
                            style={{
                                fontFamily: "'Poppins', sans-serif",
                                fontSize: isMobile ? "18px" : "24px",
                                fontWeight: "700",
                                color: "#e4e4f0",
                                lineHeight: 1.1,
                            }}
                        >
                            {approvedCount} / {totalCount}
                        </div>
                        <div
                            style={{
                                fontFamily: "'Geist Mono', monospace",
                                fontSize: isMobile ? "9px" : "10px",
                                color: "#5b5bd6",
                                letterSpacing: "1px",
                                textTransform: "uppercase",
                                marginTop: "3px",
                            }}
                        >
                            {isMobile ? "Approved" : "Approved Documents"}
                        </div>
                    </div>

                    {/* Average Score */}
                    <div style={{ paddingLeft: isMobile ? "12px" : "32px" }}>
                        <div
                            style={{
                                fontFamily: "'Poppins', sans-serif",
                                fontSize: isMobile ? "18px" : "24px",
                                fontWeight: "700",
                                color: "#e4e4f0",
                                lineHeight: 1.1,
                            }}
                        >
                            {averageScore.toFixed(2)}%
                        </div>
                        <div
                            style={{
                                fontFamily: "'Geist Mono', monospace",
                                fontSize: isMobile ? "9px" : "10px",
                                color: "#5b5bd6",
                                letterSpacing: "1px",
                                textTransform: "uppercase",
                                marginTop: "3px",
                            }}
                        >
                            {isMobile ? "Avg Score" : "Average Score"}
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
                        background: canProceed ? "#5b5bd6" : "#3a3a55",
                        border: "none",
                        borderRadius: "8px",
                        padding: isMobile ? "12px 14px" : "14px 28px",
                        cursor: canProceed ? "pointer" : "not-allowed",
                        transition: "background 0.2s ease, transform 0.1s ease",
                        opacity: canProceed ? 1 : 0.5,
                    }}
                    onMouseEnter={(e) => {
                        if (canProceed) e.currentTarget.style.background = "#6f6fe0";
                    }}
                    onMouseLeave={(e) => {
                        if (canProceed) e.currentTarget.style.background = "#5b5bd6";
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
                            stroke="#e4e4f0"
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
                            color: "#e4e4f0",
                            whiteSpace: "nowrap",
                            letterSpacing: "0.2px",
                        }}
                    >
                        {isMobile ? "Proceed" : "Proceed to Synthesis"}
                    </span>
                </button>
            </div>
        </footer>
    );
}