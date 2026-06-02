// citewise/theme.js
//
// Unified design tokens so CiteWise matches the CATalyst visual language.
// CATalyst uses a navy/indigo dark theme with a violet accent (see the
// CATalyst workspace components, e.g. #1e1e2f / #25253a / #3a3a55 / #5b5bd6).
// New CiteWise components import from here; existing components were remapped
// to the same palette.

export const theme = {
  // Surfaces
  bg: "#1e1e2f", // page / panel background
  surface: "#25253a", // raised card / input background
  surfaceAlt: "rgba(0, 0, 0, 0.15)",
  border: "#3a3a55",

  // Accents (CATalyst violet)
  accent: "#5b5bd6",
  accentHover: "#6f6fe0",
  accentSoft: "rgba(91, 91, 214, 0.12)",
  accentBorder: "rgba(91, 91, 214, 0.35)",

  // Text
  text: "#e4e4f0",
  textMuted: "#a1a1b5",
  textFaint: "rgba(228, 228, 240, 0.45)",

  // Status
  danger: "#e5544b",
  warning: "#e0a32e",
  success: "#3ecf8e",

  font: "'Poppins', sans-serif",
  radius: "12px",
  radiusLg: "16px",
};

// Common composed styles reused by the new CiteWise components.
export const ui = {
  card: {
    background: theme.bg,
    border: `1px solid ${theme.border}`,
    borderRadius: theme.radiusLg,
    overflow: "hidden",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "1rem 1.25rem",
    borderBottom: `1px solid ${theme.border}`,
    background: theme.surfaceAlt,
  },
  cardTitle: {
    fontFamily: theme.font,
    fontWeight: 700,
    fontSize: "1.02rem",
    color: theme.accent,
    letterSpacing: "0.01em",
  },
  label: {
    fontSize: "0.72rem",
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: theme.textMuted,
    fontFamily: theme.font,
  },
  input: {
    width: "100%",
    background: theme.surface,
    border: `1px solid ${theme.border}`,
    borderRadius: "10px",
    color: theme.text,
    padding: "0.6rem 0.75rem",
    fontFamily: theme.font,
    fontSize: "0.85rem",
    outline: "none",
    boxSizing: "border-box",
  },
  primaryBtn: {
    background: theme.accent,
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    padding: "0.6rem 1rem",
    cursor: "pointer",
    fontFamily: theme.font,
    fontSize: "0.85rem",
    fontWeight: 700,
  },
  ghostBtn: {
    background: "transparent",
    color: theme.text,
    border: `1px solid ${theme.border}`,
    borderRadius: "10px",
    padding: "0.5rem 0.85rem",
    cursor: "pointer",
    fontFamily: theme.font,
    fontSize: "0.8rem",
    fontWeight: 600,
  },
};

export default theme;
