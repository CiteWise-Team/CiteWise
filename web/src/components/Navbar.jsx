import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import CatLogo from "../assets/Untitled.png";
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
    <nav className="navbar navbar-dark  sticky-top" style={{backgroundColor: "#2a2f36"}}>
      <div className="container-fluid">
        {/* <a className="navbar-brand" href="/" >
          CATalyst
        </a> */}
        <Link
          to="/groups"
          className="navbar-brand text-decoration-none"
        >
          <span className="brand-text" style={{color: "#c9a44c" }}>CATalyst</span>
        </Link>

        {isAuthenticated && user && (
          <div className="dropdown ms-auto" style={{ position: "relative" }}>
            <button
              className="btn btn-dark dropdown-toggle"
              type="button"
              style={{
                backgroundColor: "#2a2f36",
                color: "#d4af37",
                border: "1px solid #2a2f36"
              }}
              onClick={() => setOpen(prev => !prev)}
            >
              {user.username || user.email}
            </button>

            {open && (
              <ul
                className="dropdown-menu dropdown-menu-end show"
                style={{ display: "block", position: "absolute", right: 0,backgroundColor: "#2a2f36" }}
              >
                <li>
                  <button
                    className="dropdown-item"
                    style={{
                      color: "#d4af37",
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
