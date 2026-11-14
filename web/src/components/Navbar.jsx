import { useEffect, useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { LogOut, Menu, Moon, Sun, X, Compass, User } from "lucide-react";
import citeWiseLogo from "../assets/citewise-logo.png";
import "../App.css";

export default function Navbar({ onGuideClick }) {
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false); // dropdown state
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("home");
  const dropdownRef = useRef(null);

  const isLanding = location.pathname === "/";
  const isCiteWise = location.pathname.startsWith("/citewise");
  const isCatalyst = isLanding
    || location.pathname === "/groups"
    || location.pathname.startsWith("/workspace/")
    || location.pathname === "/upload";
  const appName = isCatalyst ? "CATalyst" : "CiteWise";

  const accountEmail = user?.email || user?.username || "Researcher";

  const handleTriggerGuide = () => {
    if (typeof onGuideClick === "function") {
      onGuideClick();
    }
    window.dispatchEvent(new CustomEvent("open-page-guide"));
  };

  useEffect(() => {
    if (!open) return undefined;
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [open]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const scrollToSection = (id) => {
    setMobileMenuOpen(false);
    if (location.pathname !== "/") {
      navigate(`/#${id}`);
      return;
    }
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  useEffect(() => {
    if (!isLanding) return;
    const handleScroll = () => {
      const scrollPos = window.scrollY + 140;
      const overviewElem = document.getElementById("overview");
      const featuresElem = document.getElementById("features");

      if (overviewElem && scrollPos >= overviewElem.offsetTop) {
        setActiveSection("overview");
      } else if (featuresElem && scrollPos >= featuresElem.offsetTop) {
        setActiveSection("features");
      } else {
        setActiveSection("home");
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isLanding]);

  return (
    <nav
      className={`navbar sticky-top ${isLanding ? "landing-navbar-top" : "navbar-dark"}`}
      style={
        isLanding
          ? {
              backgroundColor: isDark ? "rgba(15, 14, 23, 0.94)" : "rgba(255, 255, 255, 0.94)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              borderBottom: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(229, 231, 235, 0.85)",
              height: "68px",
              padding: 0,
              boxSizing: "border-box",
              position: "sticky",
              top: 0,
              zIndex: 1030,
              boxShadow: isDark ? "0 1px 3px rgba(0, 0, 0, 0.4)" : "0 1px 3px rgba(0, 0, 0, 0.02)",
            }
          : {
              backgroundColor: isDark ? "#0f0e17" : "#1e1e2f",
              borderBottom: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid #3a3a55",
              height: "65px",
              padding: 0,
              boxSizing: "border-box",
              position: "sticky",
              top: 0,
              zIndex: 1030,
            }
      }
    >
      <div
        className="container-fluid cw-nav-inner"
        style={{
          width: "100%",
          padding: "0 clamp(1.2rem, 4vw, 4rem)",
          height: isLanding ? "67px" : "64px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Brand */}
        <Link
          to={isLanding ? "/" : (isAuthenticated ? "/groups" : "/login")}
          onClick={(e) => {
            if (isLanding) {
              e.preventDefault();
              scrollToSection("home");
            }
          }}
          className="navbar-brand text-decoration-none d-flex align-items-center gap-2"
          style={{ margin: 0, flexShrink: 0 }}
        >
          <span
            className="navbar-brand-icon-box"
            aria-hidden="true"
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "9px",
              background: isDark ? "#171624" : "#ffffff",
              border: isDark ? "1px solid rgba(255, 255, 255, 0.12)" : "1px solid #e5e7eb",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: isDark ? "0 1px 3px rgba(0, 0, 0, 0.25)" : "0 1px 3px rgba(0, 0, 0, 0.06)",
            }}
          >
            <img
              src={citeWiseLogo}
              alt={appName}
              style={{ width: "22px", height: "22px", objectFit: "contain" }}
            />
          </span>
          <span
            className="brand-text"
            style={{
              color: isDark ? "#ffffff" : "#0f0e17",
              fontFamily: "'Sora', sans-serif",
              fontWeight: 700,
              fontSize: "1.25rem",
              letterSpacing: "-0.02em",
              lineHeight: 1,
            }}
          >
            {appName === "CATalyst" ? (
              <>
                <span style={{ color: "#ea580c" }}>CAT</span>
                <span style={{ color: isDark ? "#ffffff" : "#0f0e17" }}>alyst</span>
              </>
            ) : appName === "CiteWise" ? (
              <>
                <span style={{ color: isDark ? "#ffffff" : "#0f0e17" }}>Cite</span>
                <span style={{ color: "#ea580c" }}>Wise</span>
              </>
            ) : (
              appName
            )}
          </span>
        </Link>

        {/* LANDING PAGE NAVBAR: ALL ITEMS GROUPED ON RIGHT (Home, Features, Overview, Login, [Sign up]) */}
        {isLanding && (
          <div className="d-none d-md-flex align-items-center ms-auto landing-nav-cluster">
            <button
              type="button"
              className={`landing-nav-clean-link${activeSection === "home" ? " is-active" : ""}`}
              onClick={() => scrollToSection("home")}
            >
              Home
            </button>
            <button
              type="button"
              className={`landing-nav-clean-link${activeSection === "features" ? " is-active" : ""}`}
              onClick={() => scrollToSection("features")}
            >
              Features
            </button>
            <button
              type="button"
              className={`landing-nav-clean-link${activeSection === "overview" ? " is-active" : ""}`}
              onClick={() => scrollToSection("overview")}
            >
              Overview
            </button>

            <Link
              to="/login"
              className="landing-nav-clean-link text-decoration-none ms-md-2"
            >
              Login
            </Link>

            <Link
              to="/register"
              className="landing-nav-clean-signup-btn text-decoration-none ms-md-2"
            >
              Sign up
            </Link>

            {isAuthenticated && (
              <Link
                to="/groups"
                className="landing-nav-workspace-pill text-decoration-none ms-md-2"
                title="Go to Workspaces"
              >
                Workspaces
              </Link>
            )}
          </div>
        )}

        {/* LANDING PAGE MOBILE HAMBURGER BUTTON */}
        {isLanding && (
          <button
            type="button"
            className="d-md-none landing-mobile-toggle-btn"
            style={{ color: isDark ? "#ffffff" : "#0f0e17" }}
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            onClick={() => setMobileMenuOpen(prev => !prev)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        )}

        {/* NON-LANDING APP CLUSTER: GUIDE BUTTON + USER PROFILE BUTTON */}
        {!isLanding && isAuthenticated && user && (
          <div className="d-flex align-items-center gap-2 ms-auto" style={{ position: "relative" }}>
            {/* Guide button on the left side of profile button - Solid Orange */}
            <button
              type="button"
              className="navbar-guide-btn"
              data-guide="workflow-guide-button"
              onClick={handleTriggerGuide}
              aria-label="Open page guide"
              title="Open interactive guide"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                height: "36px",
                padding: "0 13px",
                backgroundColor: "#ea580c",
                color: "#ffffff",
                border: "1px solid #ea580c",
                borderRadius: "8px",
                cursor: "pointer",
                fontFamily: "'Poppins', sans-serif",
                fontSize: "0.82rem",
                fontWeight: 600,
                transition: "all 0.18s ease",
                whiteSpace: "nowrap",
                boxShadow: "0 2px 8px rgba(234, 88, 12, 0.25)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#c2410c";
                e.currentTarget.style.borderColor = "#c2410c";
                e.currentTarget.style.boxShadow = "0 4px 14px rgba(234, 88, 12, 0.35)";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#ea580c";
                e.currentTarget.style.borderColor = "#ea580c";
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(234, 88, 12, 0.25)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <Compass size={16} color="#ffffff" strokeWidth={2.2} />
              <span style={{ color: "#ffffff", fontWeight: 600 }}>Guide</span>
            </button>

            {/* Modern profile button: rounded rectangle container, orange profile icon */}
            <div className="dropdown" ref={dropdownRef} style={{ position: "relative" }}>
              <button
                className="cw-nav-avatar-btn"
                type="button"
                aria-label="User profile menu"
                aria-expanded={open}
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  backgroundColor: isDark ? "rgba(255, 255, 255, 0.06)" : "#ffffff",
                  color: "#ea580c",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  border: open
                    ? "1px solid #ea580c"
                    : isDark ? "1px solid rgba(255, 255, 255, 0.14)" : "1px solid #e2e8f0",
                  boxShadow: open
                    ? "0 0 0 3px rgba(234, 88, 12, 0.35), 0 2px 8px rgba(0, 0, 0, 0.15)"
                    : "0 1px 3px rgba(0, 0, 0, 0.05)",
                  transition: "all 0.18s ease",
                  userSelect: "none",
                  padding: 0,
                  outline: "none",
                }}
                onClick={() => setOpen((prev) => !prev)}
                onMouseEnter={(e) => {
                  if (!open) {
                    e.currentTarget.style.borderColor = "#ea580c";
                    e.currentTarget.style.backgroundColor = isDark ? "rgba(234, 88, 12, 0.12)" : "rgba(234, 88, 12, 0.06)";
                    e.currentTarget.style.boxShadow = "0 0 0 2px rgba(234, 88, 12, 0.25)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!open) {
                    e.currentTarget.style.borderColor = isDark ? "rgba(255, 255, 255, 0.14)" : "#e2e8f0";
                    e.currentTarget.style.backgroundColor = isDark ? "rgba(255, 255, 255, 0.06)" : "#ffffff";
                    e.currentTarget.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.05)";
                  }
                }}
              >
                <User size={19} color="#ea580c" strokeWidth={2.2} />
              </button>

              {open && (
                <ul
                  className="dropdown-menu dropdown-menu-end show"
                  style={{
                    display: "block",
                    position: "absolute",
                    right: 0,
                    top: "calc(100% + 8px)",
                    backgroundColor: isDark ? "#15141f" : "#ffffff",
                    border: isDark ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid #e2e8f0",
                    borderRadius: "12px",
                    padding: "6px",
                    minWidth: "230px",
                    boxShadow: isDark ? "0 16px 36px rgba(0, 0, 0, 0.55)" : "0 16px 36px rgba(0, 0, 0, 0.12)",
                    zIndex: 1050,
                  }}
                >
                  {/* Whole account email display */}
                  <li
                    style={{
                      padding: "10px 12px 12px 12px",
                      borderBottom: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid #f1f5f9",
                      marginBottom: "6px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div
                        style={{
                          width: "34px",
                          height: "34px",
                          borderRadius: "8px",
                          backgroundColor: isDark ? "rgba(234, 88, 12, 0.12)" : "rgba(234, 88, 12, 0.08)",
                          border: isDark ? "1px solid rgba(234, 88, 12, 0.3)" : "1px solid rgba(234, 88, 12, 0.25)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <User size={18} color="#ea580c" strokeWidth={2.2} />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            fontSize: "0.68rem",
                            textTransform: "uppercase",
                            fontWeight: 700,
                            letterSpacing: "0.06em",
                            color: "#ea580c",
                            fontFamily: "'Poppins', sans-serif",
                            lineHeight: 1.2,
                          }}
                        >
                          Signed in as
                        </div>
                        <div
                          style={{
                            fontSize: "0.82rem",
                            fontWeight: 600,
                            color: isDark ? "#ffffff" : "#0f0e17",
                            fontFamily: "'Poppins', sans-serif",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            marginTop: "2px",
                          }}
                          title={accountEmail}
                        >
                          {accountEmail}
                        </div>
                      </div>
                    </div>
                  </li>

                  {/* Dark/Light mode button */}
                  <li>
                    <button
                      type="button"
                      className="dropdown-item d-flex align-items-center gap-2"
                      style={{
                        color: isDark ? "#e4e4f0" : "#1e293b",
                        borderRadius: "8px",
                        padding: "8px 12px",
                        fontFamily: "'Poppins', sans-serif",
                        fontSize: "0.82rem",
                        fontWeight: 500,
                        transition: "background 0.15s ease, color 0.15s ease",
                        border: "none",
                        background: "transparent",
                        width: "100%",
                        textAlign: "left",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(event) => {
                        event.currentTarget.style.background = isDark ? "rgba(234, 88, 12, 0.16)" : "rgba(234, 88, 12, 0.08)";
                        event.currentTarget.style.color = "#ea580c";
                      }}
                      onMouseLeave={(event) => {
                        event.currentTarget.style.background = "transparent";
                        event.currentTarget.style.color = isDark ? "#e4e4f0" : "#1e293b";
                      }}
                      onClick={() => {
                        toggleTheme();
                        setOpen(false);
                      }}
                    >
                      {isDark ? <Sun size={15} color="#ea580c" /> : <Moon size={15} color="#ea580c" />}
                      <span>{isDark ? "Light Mode" : "Dark Mode"}</span>
                    </button>
                  </li>

                  <li>
                    <hr
                      className="dropdown-divider"
                      style={{
                        borderColor: isDark ? "rgba(255, 255, 255, 0.08)" : "#e2e8f0",
                        opacity: 1,
                        margin: "4px 0",
                      }}
                    />
                  </li>

                  {/* Logout button */}
                  <li>
                    <button
                      type="button"
                      className="dropdown-item d-flex align-items-center gap-2"
                      style={{
                        color: "#ea580c",
                        borderRadius: "8px",
                        padding: "8px 12px",
                        fontFamily: "'Poppins', sans-serif",
                        fontSize: "0.82rem",
                        fontWeight: 500,
                        transition: "background 0.15s ease, color 0.15s ease",
                        border: "none",
                        background: "transparent",
                        width: "100%",
                        textAlign: "left",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(event) => {
                        event.currentTarget.style.background = isDark ? "rgba(234, 88, 12, 0.16)" : "rgba(234, 88, 12, 0.1)";
                        event.currentTarget.style.color = "#f97316";
                      }}
                      onMouseLeave={(event) => {
                        event.currentTarget.style.background = "transparent";
                        event.currentTarget.style.color = "#ea580c";
                      }}
                      onClick={() => {
                        setOpen(false);
                        setShowLogoutConfirm(true);
                      }}
                    >
                      <LogOut size={15} color="#ea580c" />
                      <span>Logout</span>
                    </button>
                  </li>
                </ul>
              )}
            </div>
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
            padding: "20px",
            background: "rgba(15, 14, 23, 0.65)",
          }}
        >
          <div
            className="logout-confirm-modal workspace-create-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-confirm-title"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(100%, 420px)",
              background: isDark ? "#15141f" : "#ffffff",
              borderRadius: "18px",
              overflow: "hidden",
              boxShadow: "0 24px 60px rgba(0, 0, 0, 0.22)",
              border: isDark ? "1px solid rgba(255, 255, 255, 0.12)" : "none",
              outline: "none",
              textAlign: "left",
            }}
          >
            {/* Modal Header */}
            <div
              className="workspace-create-header text-white"
              style={{
                minHeight: "auto",
                padding: "20px 24px",
                background: "linear-gradient(135deg, #ea580c, #c2410c)",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                border: "none",
                outline: "none",
                borderRadius: "18px 18px 0 0",
              }}
            >
              <div className="workspace-create-header-content">
                <p
                  className="workspace-create-kicker logout-kicker"
                  style={{
                    margin: "0 0 3px",
                    color: "#f3f4f6",
                    fontFamily: "'Poppins', sans-serif",
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  Session Sign-Out
                </p>
                <h5
                  id="logout-confirm-title"
                  className="mb-0 fw-bold"
                  style={{ color: "#ffffff", fontFamily: "'Poppins', sans-serif", fontSize: "1.18rem", fontWeight: 700, margin: 0 }}
                >
                  Log out of {appName}?
                </h5>
              </div>
              <div
                className="logout-header-mark"
                aria-hidden="true"
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  border: "1.5px solid #ffffff",
                  background: "rgba(154, 52, 18, 0.55)",
                  display: "grid",
                  placeItems: "center",
                  color: "#ffffff",
                  boxShadow: "0 2px 10px rgba(0, 0, 0, 0.15)",
                  backdropFilter: "none",
                  WebkitBackdropFilter: "none",
                  flexShrink: 0,
                }}
              >
                <LogOut size={18} strokeWidth={2.4} color="#ffffff" stroke="#ffffff" />
              </div>
            </div>

            {/* Modal Body - Matching Delete Modal font style and font color */}
            <div className="workspace-create-body" style={{ padding: "26px 24px 24px", background: isDark ? "#15141f" : "#ffffff" }}>
              <p
                style={{
                  margin: 0,
                  color: isDark ? "#cbd5e1" : "#4b5563",
                  fontSize: "0.92rem",
                  lineHeight: 1.6,
                  fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", "Noto Sans", "Liberation Sans", Arial, sans-serif',
                  fontWeight: 400,
                }}
              >
                Are you sure you want to log out? You will need to sign in again to access your {isCiteWise ? "session." : "workspaces."}
              </p>
            </div>

            {/* Modal Actions */}
            <div
              style={{
                padding: "0 24px 24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: "10px",
                background: isDark ? "#15141f" : "#ffffff",
              }}
            >
              <button
                type="button"
                className="workspace-modal-button workspace-modal-cancel"
                onClick={() => setShowLogoutConfirm(false)}
                style={isDark ? { border: "1px solid rgba(255, 255, 255, 0.15)", color: "#cbd5e1", background: "transparent" } : {}}
              >
                Cancel
              </button>
              <button
                type="button"
                className="workspace-modal-button workspace-modal-submit"
                onClick={handleLogout}
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE DRAWER MENU ON LANDING */}
      {isLanding && mobileMenuOpen && (
        <div className="landing-mobile-menu">
          <button
            type="button"
            className={`landing-mobile-link${activeSection === "home" ? " is-active" : ""}`}
            onClick={() => scrollToSection("home")}
          >
            Home
          </button>
          <button
            type="button"
            className={`landing-mobile-link${activeSection === "features" ? " is-active" : ""}`}
            onClick={() => scrollToSection("features")}
          >
            Features
          </button>
          <button
            type="button"
            className={`landing-mobile-link${activeSection === "overview" ? " is-active" : ""}`}
            onClick={() => scrollToSection("overview")}
          >
            Overview
          </button>
          <button
            type="button"
            className="landing-mobile-link d-flex align-items-center justify-content-between"
            onClick={toggleTheme}
          >
            <span>Theme Mode</span>
            <span className="badge" style={{ background: isDark ? "#282738" : "#f1f5f9", color: isDark ? "#fbbf24" : "#475569" }}>
              {isDark ? "Dark" : "Light"}
            </span>
          </button>
          <hr className="landing-mobile-divider" />
          <div className="d-flex flex-column gap-2 pt-1">
            <Link
              to="/login"
              className="landing-mobile-link text-center text-decoration-none py-1"
              onClick={() => setMobileMenuOpen(false)}
            >
              Login
            </Link>
            <Link
              to="/register"
              className="landing-nav-clean-signup-btn w-100 text-center text-decoration-none"
              onClick={() => setMobileMenuOpen(false)}
            >
              Sign up
            </Link>
            {isAuthenticated && (
              <Link
                to="/groups"
                className="landing-nav-workspace-pill w-100 text-center text-decoration-none"
                onClick={() => setMobileMenuOpen(false)}
              >
                Workspaces
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}