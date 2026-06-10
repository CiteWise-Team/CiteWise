import { NavLink } from "react-router-dom";

export default function Sidebar() {
  return (
    <div className="position-sticky pt-3">
      <ul className="nav flex-column">
        <li className="nav-item">
          <NavLink to="/dashboard" className="nav-link">
            Groups
          </NavLink>
        </li>
        <li className="nav-item">
          <NavLink to="/upload" className="nav-link">
            Upload
          </NavLink>
        </li>
        <li className="nav-item">
          <NavLink to="/upload" className="nav-link">
            Upload
          </NavLink>
        </li>
        <li className="nav-item">
          <NavLink to="/upload" className="nav-link">
            Upload
          </NavLink>
        </li>
      </ul>
    </div>
  );
}
