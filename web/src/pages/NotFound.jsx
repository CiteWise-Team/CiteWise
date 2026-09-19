import { Link } from "react-router-dom";

// Any unmatched path used to fall through React Router and render an empty
// document — no message, nothing to click. `message` lets the workspace routes
// reuse this for a workspace that does not exist or is not yours.
export default function NotFound({
  title = "Page not found",
  message = "That link doesn't lead anywhere. It may have been moved, or the address may be mistyped.",
}) {
  return (
    <main style={styles.wrap}>
      <div style={styles.card}>
        <p style={styles.eyebrow}>CITEWISE</p>
        <h1 style={styles.title}>{title}</h1>
        <p style={styles.body}>{message}</p>
        <div style={styles.actions}>
          <Link to="/groups" style={styles.primary}>Back to workspaces</Link>
          <Link to="/" style={styles.secondary}>Go to home</Link>
        </div>
      </div>
    </main>
  );
}

const styles = {
  wrap: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#0f1117",
    padding: "24px",
  },
  card: {
    maxWidth: "520px",
    width: "100%",
    background: "#161923",
    border: "1px solid #252a38",
    borderRadius: "12px",
    padding: "40px 36px",
    textAlign: "center",
  },
  eyebrow: {
    margin: "0 0 10px",
    color: "#6366f1",
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "1.5px",
  },
  title: { margin: "0 0 12px", color: "#f3f4f6", fontSize: "26px", fontWeight: 700 },
  body: { margin: "0 0 28px", color: "#9ca3af", fontSize: "15px", lineHeight: 1.6 },
  actions: { display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" },
  primary: {
    background: "#6366f1",
    color: "#fff",
    padding: "10px 20px",
    borderRadius: "8px",
    textDecoration: "none",
    fontWeight: 600,
    fontSize: "14px",
  },
  secondary: {
    background: "transparent",
    color: "#c7cad1",
    padding: "10px 20px",
    borderRadius: "8px",
    textDecoration: "none",
    fontWeight: 600,
    fontSize: "14px",
    border: "1px solid #2d3242",
  },
};
