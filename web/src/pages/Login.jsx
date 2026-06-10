import { useFeedbackModal } from "../hooks/useFeedbackModel";
import FeedbackModal from "../components/modals/FeedbackModal";

import PublicLayout from "../layouts/PublicLayout";
import { useState } from "react";
import { login as loginAPI } from "../api/auth.api";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

import { FaCheckCircle } from "react-icons/fa";
import { GrSecure } from "react-icons/gr";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuth();
  const { config, showFeedback } = useFeedbackModal();

  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const data = await loginAPI({ email, password });
      login(data.user, data.token);
      setTimeout(() => navigate("/groups"), 1000);
    } catch (err) {
      showFeedback({
        type: "error",
        title: "Login Failed",
        message: err.response?.data?.message || "Invalid credentials",
      });
    }
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
                Join our community to streamline your research workflow
              </h1>

              <p className=" mb-5 text-white">
                Experience an AI-powered platform that helps researchers discover
                literature insights, identify research gaps, and generate
                actionable thesis topics.
              </p>

              <div className="row g-4">

                <div className="col-md-6 d-flex">
                  <span className="text-primary me-3">
                    <FaCheckCircle size={24} />
                  </span>
                  <div>
                    <strong className="text-white">AI Gap Detection</strong>
                    <div className="small text-white">Automatically identify research gaps.</div>
                  </div>
                </div>

                <div className="col-md-6 d-flex">
                  <span className="text-primary me-3">
                    <GrSecure size={24} />
                  </span>
                  <div>
                    <strong className="text-white">Secure Workspace</strong>
                    <div className="small text-white">Private and secure document processing.</div>
                  </div>
                </div>

              </div>

            </div>
          </div>

          {/* RIGHT SIDE (LOGIN FORM) */}
          <div className="col-lg-6 d-flex align-items-center justify-content-center" style={{ backgroundColor: "#25253a" }}>
            <div className="p-4 rounded-4 shadow-sm" style={{ maxWidth: "420px", width: "100%", backgroundColor: "#1e1e2f", border: "1px solid #3a3a55" }}>
              <h3 className="fw-bold mb-2 text-white">Welcome Back</h3>
              <p className="mb-4 text-white">Sign in to continue using CATalyst</p>

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
                  Login
                </button>

                <p className="text-center small text-white">
                  Don't have an account? <a href="/register">Register</a>
                </p>

              </form>
            </div>
          </div>

        </div>
      </div>

      <FeedbackModal type={config.type} title={config.title} message={config.message} />
    </PublicLayout>
  );
}