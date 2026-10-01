import useIsMobile, { MOBILE_TABBAR_HEIGHT } from "../../../../hooks/useIsMobile";
import { useTheme } from "../../../../context/ThemeContext";

export default function ValidationSummaryFooter({
    approvedCount = 0,
    totalCount = 0,
    averageScore = 0,
    onProceed,
}) {
    const canProceed = approvedCount > 0;
    const isMobile = useIsMobile();
    const { isDark } = useTheme();

    return (
        <footer
            style={{
                background: isDark ? "#15141f" : "linear-gradient(180deg, #fffaf5 0%, #fff5ec 100%)",
                borderTop: isDark ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(249, 115, 22, 0.18)",
                height: isMobile ? "64px" : "72px",
                display: "flex",
                alignItems: "center",
                position: "fixed",
                bottom: isMobile ? `calc(${MOBILE_TABBAR_HEIGHT}px + env(safe-area-inset-bottom))` : 0,
                left: 0,
                right: 0,
                zIndex: 100,
                width: "100%",
                boxShadow: isDark ? "0 -4px 16px rgba(0, 0, 0, 0.4)" : "0 -2px 12px rgba(249, 115, 22, 0.06)",
            }}
        >
            <div
                style={{
                    width: "100%",
                    margin: "0 auto",
                    padding: isMobile ? "0 1rem" : "0 clamp(1rem, 4vw, 4rem)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: isMobile ? "10px" : "24px",
                    boxSizing: "border-box",
                }}
            >
                {/* Stats */}
                <div style={{ display: "flex", alignItems: "center", gap: "0" }}>
                    {/* Approved Documents */}
                    <div
                        style={{
                            paddingRight: isMobile ? "12px" : "32px",
                            borderRight: "1px solid rgba(249, 115, 22, 0.2)",
                        }}
                    >
                        <div
                            style={{
                                fontFamily: "'Poppins', sans-serif",
                                fontSize: isMobile ? "18px" : "24px",
                                fontWeight: "700",
                                color: isDark ? "#ffffff" : "#111827",
                                lineHeight: 1.1,
                            }}
                        >
                            {approvedCount} / {totalCount}
                        </div>
                        <div
                            style={{
                                fontFamily: "'Poppins', sans-serif",
                                fontSize: isMobile ? "9px" : "10px",
                                color: "#f97316",
                                letterSpacing: "1px",
                                textTransform: "uppercase",
                                marginTop: "3px",
                                fontWeight: 700,
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
                                color: isDark ? "#ffffff" : "#111827",
                                lineHeight: 1.1,
                            }}
                        >
                            {averageScore.toFixed(2)}%
                        </div>
                        <div
                            style={{
                                fontFamily: "'Poppins', sans-serif",
                                fontSize: isMobile ? "9px" : "10px",
                                color: "#f97316",
                                letterSpacing: "1px",
                                textTransform: "uppercase",
                                marginTop: "3px",
                                fontWeight: 700,
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
                        background: canProceed
                            ? "#ea580c"
                            : (isDark ? "rgba(255, 255, 255, 0.08)" : "#f3f4f6"),
                        border: canProceed ? "1px solid #ea580c" : (isDark ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid #e5e7eb"),
                        borderRadius: "8px",
                        padding: isMobile ? "10px 14px" : "12px 24px",
                        cursor: canProceed ? "pointer" : "not-allowed",
                        transition: "all 180ms ease",
                        opacity: canProceed ? 1 : 0.6,
                        boxShadow: canProceed ? "0 2px 8px rgba(234, 88, 12, 0.22)" : "none",
                    }}
                    onMouseEnter={(e) => {
                        if (canProceed) {
                            e.currentTarget.style.background = "#c2410c";
                            e.currentTarget.style.borderColor = "#c2410c";
                            e.currentTarget.style.transform = "translateY(-1px)";
                            e.currentTarget.style.boxShadow = "0 4px 14px rgba(234, 88, 12, 0.35)";
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (canProceed) {
                            e.currentTarget.style.background = "#ea580c";
                            e.currentTarget.style.borderColor = "#ea580c";
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.boxShadow = "0 2px 8px rgba(234, 88, 12, 0.22)";
                        }
                    }}
                    onMouseDown={(e) => {
                        if (canProceed) {
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.boxShadow = "0 2px 6px rgba(234, 88, 12, 0.2)";
                        }
                    }}
                    onMouseUp={(e) => {
                        if (canProceed) e.currentTarget.style.transform = "translateY(-1px)";
                    }}
                >
                    {/* Arrow icon */}
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <path
                            d="M3 9H15M15 9L10.5 4.5M15 9L10.5 13.5"
                            stroke={canProceed ? "#ffffff" : (isDark ? "#6b7280" : "#9ca3af")}
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
                            color: canProceed ? "#ffffff" : (isDark ? "#6b7280" : "#9ca3af"),
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