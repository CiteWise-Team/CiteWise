import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import "../App.css";

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false); // dropdown state
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav
      className="navbar navbar-dark sticky-top"
      style={{
        backgroundColor: "#1e1e2f",
        borderBottom: "1px solid #3a3a55",
        height: "65px",
        padding: 0,
        boxSizing: "border-box",
      }}
    >
      <div
        className="container-fluid"
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          padding: "0 2.5rem",
          height: "64px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
        }}
      >
        <Link
          to="/groups"
          className="navbar-brand text-decoration-none d-flex align-items-center gap-2"
          style={{ margin: 0, flexShrink: 0 }}
        >
          <span
            aria-hidden="true"
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "9px",
              background: "#25253a",
              border: "1px solid rgba(91, 91, 214, 0.35)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#5b5bd6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2 17L12 22L22 17" stroke="#5b5bd6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2 12L12 17L22 12" stroke="#5b5bd6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
            </svg>
          </span>
          <span
            className="brand-text"
            style={{
              color: "#e4e4f0",
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 700,
              fontSize: "1.1rem",
              letterSpacing: "-0.01em",
              lineHeight: 1,
            }}
          >
            CATalyst
          </span>
        </Link>

        {isAuthenticated && user && (
          <div className="dropdown ms-auto" style={{ position: "relative" }}>
            <button
              className="btn btn-dark dropdown-toggle"
              type="button"
              style={{
                backgroundColor: "#25253a",
                color: "#e4e4f0",
                border: "1px solid #3a3a55",
                borderRadius: "8px",
                padding: "6px 14px",
                fontFamily: "'Poppins', sans-serif",
                fontSize: "0.8rem",
                fontWeight: 600,
              }}
              onClick={() => setOpen(prev => !prev)}
            >
              {user.username || user.email}
            </button>

            {open && (
              <ul
                className="dropdown-menu dropdown-menu-end show"
                style={{
                  display: "block",
                  position: "absolute",
                  right: 0,
                  top: "calc(100% + 8px)",
                  backgroundColor: "#25253a",
                  border: "1px solid #3a3a55",
                  borderRadius: "10px",
                  padding: "6px",
                  minWidth: "160px",
                  boxShadow: "0 16px 32px rgba(0, 0, 0, 0.3)",
                }}
              >
                <li>
                  <button
                    className="dropdown-item"
                    style={{
                      color: "#e4e4f0",
                      borderRadius: "6px",
                      padding: "8px 10px",
                      fontFamily: "'Poppins', sans-serif",
                      fontSize: "0.8rem",
                      transition: "background 0.2s ease, color 0.2s ease",
                    }}
                    onMouseEnter={(event) => {
                      event.currentTarget.style.background = "rgba(91, 91, 214, 0.14)";
                      event.currentTarget.style.color = "#a5b4fc";
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.background = "transparent";
                      event.currentTarget.style.color = "#e4e4f0";
                    }}
                    onClick={() => {
                      navigate("/settings");
                      setOpen(false);
                    }}
                  >
                    Settings
                  </button>
                </li>
                <li><hr className="dropdown-divider" style={{ borderColor: "#3a3a55", opacity: 1 }} /></li>
                <li>
                  <button
                    className="dropdown-item"
                    style={{
                      color: "#e5544b",
                      borderRadius: "6px",
                      padding: "8px 10px",
                      fontFamily: "'Poppins', sans-serif",
                      fontSize: "0.8rem",
                      transition: "background 0.2s ease, color 0.2s ease",
                    }}
                    onMouseEnter={(event) => {
                      event.currentTarget.style.background = "rgba(229, 84, 75, 0.12)";
                      event.currentTarget.style.color = "#ff8b84";
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.background = "transparent";
                      event.currentTarget.style.color = "#e5544b";
                    }}
                    onClick={() => {
                      setOpen(false);
                      setShowLogoutConfirm(true);
                    }}
                  >
                    Logout
                  </button>
                </li>
              </ul>
            )}
          </div>
        )}
      </div>

      {showLogoutConfirm && (
        <div
          role="presentation"
          onClick={() => setShowLogoutConfirm(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1050,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            background: "rgba(14, 12, 10, 0.75)",
            backdropFilter: "blur(8px)",
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-confirm-title"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(100%, 420px)",
              padding: "28px",
              border: "1px solid #3a3a55",
              borderRadius: "16px",
              background: "#25253a",
              color: "#e4e4f0",
              fontFamily: "'Poppins', sans-serif",
              textAlign: "center",
              boxShadow: "0 24px 60px rgba(0, 0, 0, 0.5)",
            }}
          >
            <div
              style={{
                width: "64px",
                height: "64px",
                margin: "0 auto 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid #e5544b",
                borderRadius: "50%",
                background: "rgba(229, 84, 75, 0.14)",
                color: "#e5544b",
              }}
            >
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M10.3 3.3 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.3a2 2 0 0 0-3.4 0Z" />
                <path d="M12 9v4" />
                <path d="M12 17h.01" />
              </svg>
            </div>
            <h2 id="logout-confirm-title" style={{ margin: "0 0 8px", fontSize: "1.15rem", fontWeight: 700 }}>
              Log out of CiteWise?
            </h2>
            <p style={{ margin: "0 0 24px", color: "#a1a1b5", fontSize: "0.85rem", lineHeight: 1.6 }}>
              You will need to sign in again to access your workspaces.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                style={{
                  padding: "9px 12px",
                  border: "1px solid #3a3a55",
                  borderRadius: "10px",
                  background: "transparent",
                  color: "#e4e4f0",
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "background 0.2s ease, border-color 0.2s ease, color 0.2s ease",
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.background = "rgba(91, 91, 214, 0.14)";
                  event.currentTarget.style.borderColor = "#5b5bd6";
                  event.currentTarget.style.color = "#a5b4fc";
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.background = "transparent";
                  event.currentTarget.style.borderColor = "#3a3a55";
                  event.currentTarget.style.color = "#e4e4f0";
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogout}
                style={{
                  padding: "9px 12px",
                  border: "1px solid #e5544b",
                  borderRadius: "10px",
                  background: "#e5544b",
                  color: "#fff",
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "background 0.2s ease, border-color 0.2s ease, color 0.2s ease",
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.background = "#ff6f66";
                  event.currentTarget.style.borderColor = "#ff6f66";
                  event.currentTarget.style.color = "#fff";
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.background = "#e5544b";
                  event.currentTarget.style.borderColor = "#e5544b";
                  event.currentTarget.style.color = "#fff";
                }}
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
