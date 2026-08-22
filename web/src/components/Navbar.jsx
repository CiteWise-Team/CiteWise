import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import "../App.css";

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false); // dropdown state

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
                  backgroundColor: "#25253a",
                  border: "1px solid #3a3a55",
                  borderRadius: "10px",
                  padding: "6px",
                }}
              >
                <li>
                  <button
                    className="dropdown-item"
                    style={{
                      color: "#e4e4f0",
                      borderRadius: "6px",
                    }}
                    onClick={() => {
                      navigate("/settings");
                      setOpen(false);
                    }}
                  >
                    Settings
                  </button>
                </li>
                <li><hr className="dropdown-divider" /></li>
                <li>
                  <button
                    className="dropdown-item text-danger"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </li>
              </ul>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
