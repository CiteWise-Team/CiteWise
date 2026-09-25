import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { LogOut, Menu, X } from "lucide-react";
import citeWiseLogo from "../assets/citewise-logo.png";
import "../App.css";

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false); // dropdown state
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("home");

  const isLanding = location.pathname === "/";
  const isCiteWise = location.pathname.startsWith("/citewise");
  const isCatalyst = isLanding
    || location.pathname === "/groups"
    || location.pathname.startsWith("/workspace/")
    || location.pathname === "/upload";
  const appName = isCatalyst ? "CATalyst" : "CiteWise";

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
              backgroundColor: "rgba(255, 255, 255, 0.94)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              borderBottom: "1px solid rgba(229, 231, 235, 0.85)",
              height: "68px",
              padding: 0,
              boxSizing: "border-box",
              position: "sticky",
              top: 0,
              zIndex: 1030,
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.02)",
            }
          : {
              backgroundColor: "#1e1e2f",
              borderBottom: "1px solid #3a3a55",
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
        className="container-fluid"
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
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.06)",
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
              color: isLanding ? "#0f0e17" : "#e4e4f0",
              fontFamily: "'Sora', sans-serif",
              fontWeight: 700,
              fontSize: "1.25rem",
              letterSpacing: "-0.02em",
              lineHeight: 1,
            }}
          >
            {appName}
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
            style={{ color: "#0f0e17" }}
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            onClick={() => setMobileMenuOpen(prev => !prev)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        )}

        {/* NON-LANDING APP DROPDOWN */}
        {!isLanding && isAuthenticated && user && (
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
              background: "#ffffff",
              borderRadius: "18px",
              overflow: "hidden",
              boxShadow: "0 24px 60px rgba(0, 0, 0, 0.22)",
              border: "none",
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
            <div className="workspace-create-body" style={{ padding: "26px 24px 24px", background: "#ffffff" }}>
              <p
                style={{
                  margin: 0,
                  color: "#4b5563",
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
                background: "#ffffff",
              }}
            >
              <button
                type="button"
                className="workspace-modal-button workspace-modal-cancel"
                onClick={() => setShowLogoutConfirm(false)}
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