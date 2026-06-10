import PublicLayout from "../layouts/PublicLayout";
import { useState } from "react";
import { register as registerAPI } from "../api/auth.api";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

import { FaCheckCircle } from "react-icons/fa";
import { GrSecure } from "react-icons/gr";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    const data = await registerAPI({ email, password });
    login(data.user, data.token);
    navigate("/groups");
  }

  return (
    <PublicLayout>
      <div className="container-fluid min-vh-100">
        <div className="row flex-grow-1" style={{ minHeight: "100vh" }}>

          {/* LEFT SIDE (Marketing Panel) */}
          <div className="col-lg-6 d-none d-lg-flex align-items-center" style={{ backgroundColor: "#25253a" }}>
            <div className="p-5 w-100">

              <div className="mb-4 text-primary">
                <span className="material-symbols-outlined" style={{ fontSize: "36px" }}>
                  CATalyst
                </span>
              </div>

              <h1 className="fw-bold mb-4 text-white">
                Join CATalyst and start discovering research gaps
              </h1>

              <p className="mb-5 text-white">
                Register now to access AI-powered tools that help you analyze literature, identify research gaps, 
                and generate actionable thesis topics faster than ever.
              </p>

              <div className="row g-4">
                <div className="col-md-6 d-flex">
                  <span className="text-primary me-3"><FaCheckCircle size={24} /></span>
                  <div>
                    <strong className="text-white">Instant Insights</strong>
                    <div className="small text-white">Get AI-powered gap analysis immediately.</div>
                  </div>
                </div>

                <div className="col-md-6 d-flex">
                  <span className="text-primary me-3"><GrSecure size={24} /></span>
                  <div>
                    <strong className="text-white">Secure Workspace</strong>
                    <div className="small text-white">Your research and notes remain private.</div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* RIGHT SIDE (REGISTER FORM) */}
          <div className="col-lg-6 d-flex align-items-center justify-content-center" style={{ backgroundColor: "#25253a" }}>
            <div className="p-4 rounded-4 shadow-sm" style={{ maxWidth: "420px", width: "100%", backgroundColor: "#1e1e2f", border: "1px solid #3a3a55" }}>
              <h3 className="fw-bold mb-2 text-white">Create Account</h3>
              <p className="text-white mb-4">Sign up to start using CATalyst</p>

              <form onSubmit={handleSubmit}>

                <div className="mb-3">
                  <label className="form-label text-white">Email Address</label>
                  <input
                    type="email"
                    className="form-control bg-dark text-white border-secondary"
                    placeholder="john@example.com"
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>

                <div className="mb-4">
                  <label className="form-label text-white">Password</label>
                  <input
                    type="password"
                    className="form-control bg-dark text-white border-secondary"
                    placeholder="••••••••"
                    onChange={e => setPassword(e.target.value)}
                  />
                </div>

                <button className="btn w-100 mb-3" style={{ backgroundColor: "#5b5bd6", color: "#fff", border: "none" }}>
                  Register
                </button>

                <p className="text-center small text-white">
                  Already have an account? <a href="/login">Login</a>
                </p>

              </form>
            </div>
          </div>

        </div>
      </div>
    </PublicLayout>
  );
}