import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ArrowLeft, 
  Sparkles, 
  ShieldCheck, 
  FileText, 
  CheckCircle2
} from "lucide-react";

import { login as loginAPI } from "../api/auth.api";
import { useAuth } from "../context/AuthContext";
import { useFeedbackModal } from "../hooks/useFeedbackModel";
import FeedbackModal from "../components/modals/FeedbackModal";
import citeWiseLogo from "../assets/citewise-logo.png";
import "../styles/AuthSplitScreen.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { config, showFeedback, hideFeedback } = useFeedbackModal();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setIsLoading(true);
    try {
      const data = await loginAPI({ email, password });
      login(data.user, data.access_token);
      if (data.refresh_token) {
        localStorage.setItem("refresh_token", data.refresh_token);
      }
      setTimeout(() => navigate("/groups"), 600);
    } catch (err) {
      showFeedback({
        type: "error",
        title: "Sign In Failed",
        message: err.message || "Invalid email or password",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="auth-split-wrapper">
      {/* ====================================================================
          LEFT SIDE: Brand Showcase & Interactive Preview
          ==================================================================== */}
      <div className="auth-showcase-panel">
        <div className="auth-glow-orb-1" />
        <div className="auth-glow-orb-2" />
        <div className="auth-mesh-grid" />

        {/* Header with Brand Logo & Back to Home */}
        <div className="auth-showcase-header">
          <Link to="/" className="auth-brand-badge" title="Back to CiteWise Home">
            <div className="auth-brand-icon-box">
              <img
                src={citeWiseLogo}
                alt="CiteWise Logo"
                style={{ width: "26px", height: "26px", objectFit: "contain" }}
              />
            </div>
            <span className="auth-brand-title">CiteWise</span>
          </Link>

          <Link to="/" className="auth-back-link">
            <ArrowLeft size={15} />
            <span>Back to website</span>
          </Link>
        </div>

        {/* Hero Showcase Content */}
        <div className="auth-showcase-content">
          <div className="auth-tag-pill">
            <span className="auth-tag-pill-pulse" />
            <span>AI Research Synthesis</span>
          </div>

          <h1 className="auth-showcase-title">
            Accelerate your literature review from <span className="auth-text-gradient">weeks to hours</span>.
          </h1>

          <p className="auth-showcase-desc">
            Sign in to access your research baselines, extract evidence, and discover critical literature gaps with verified citations.
          </p>

          {/* Interactive Feature Preview Card */}
          <div className="auth-preview-card">
            <div className="auth-preview-header">
              <div className="auth-preview-status">
                <span className="auth-preview-status-dot" />
                <span>Active Research Corpus</span>
              </div>
              <span className="auth-preview-badge">SciRAG Baseline</span>
            </div>

            <div className="auth-preview-paper-title">
              <FileText size={16} color="#8b85f0" />
              <span>Adaptive, Citation-Aware Literature Synthesis</span>
            </div>

            <div className="auth-preview-gap-box">
              <span className="auth-preview-gap-label">Detected Research Gap</span>
              Cross-domain validation under constrained computational environments with real-time citation graphs.
            </div>

            <div className="auth-preview-meta">
              <span>Relevance Score</span>
              <div className="auth-preview-progress-bar">
                <div className="auth-preview-progress-fill" />
              </div>
              <span style={{ color: "#a5b4fc", fontWeight: 600 }}>98.4%</span>
            </div>
          </div>

          {/* Capability Feature Badges */}
          <div className="auth-feature-row">
            <div className="auth-feature-pill">
              <span className="auth-feature-pill-icon"><Sparkles size={16} /></span>
              <span>AI Gap Detection</span>
            </div>
            <div className="auth-feature-pill">
              <span className="auth-feature-pill-icon"><CheckCircle2 size={16} /></span>
              <span>Multi-Paper Synthesis</span>
            </div>
            <div className="auth-feature-pill">
              <span className="auth-feature-pill-icon"><ShieldCheck size={16} /></span>
              <span>Academic Integrity</span>
            </div>
          </div>
        </div>

        {/* Showcase Footer */}
        <div className="auth-showcase-footer">
          <span>AI Pipeline: Extract • Summarize • Gap Discovery • Topic Formulation</span>
          <span>CiteWise Research Assistant</span>
        </div>
      </div>

      {/* ====================================================================
          RIGHT SIDE: Focused Authentication Form
          ==================================================================== */}
      <div className="auth-form-panel">
        {/* Top bar with quick navigation switch */}
        <div className="auth-form-topbar">
          <span>Don't have an account?</span>
          <Link to="/register" className="auth-form-topbar-link">
            <span>Create account</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {/* Centered Form Body */}
        <div className="auth-form-box">
          {/* Visible on mobile only */}
          <div className="auth-mobile-brand">
            <Link to="/" className="auth-brand-badge">
              <div className="auth-brand-icon-box">
                <img
                  src={citeWiseLogo}
                  alt="CiteWise Logo"
                  style={{ width: "24px", height: "24px", objectFit: "contain" }}
                />
              </div>
              <span className="auth-brand-title">CiteWise</span>
            </Link>
          </div>

          <h2 className="auth-form-heading">Welcome back</h2>
          <p className="auth-form-subheading">
            Enter your credentials to access your research workspaces
          </p>

          <form onSubmit={handleSubmit}>
            {/* Email Field */}
            <div className="auth-input-group">
              <div className="auth-input-label-row">
                <label htmlFor="login-email" className="auth-input-label">
                  Email Address
                </label>
              </div>
              <div className="auth-input-container">
                <span className="auth-input-prefix-icon">
                  <Mail size={18} />
                </span>
                <input
                  id="login-email"
                  type="email"
                  required
                  autoComplete="email"
                  className="auth-input-field"
                  placeholder="name@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="auth-input-group">
              <div className="auth-input-label-row">
                <label htmlFor="login-password" className="auth-input-label">
                  Password
                </label>
                <a href="#forgot" className="auth-forgot-link" onClick={(e) => {
                  e.preventDefault();
                  showFeedback({
                    type: "info",
                    title: "Password Recovery",
                    message: "Please contact your system administrator or check back soon for automated self-service recovery.",
                  });
                }}>
                  Forgot password?
                </a>
              </div>
              <div className="auth-input-container">
                <span className="auth-input-prefix-icon">
                  <Lock size={18} />
                </span>
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  className="auth-input-field"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="auth-password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="auth-submit-btn"
              disabled={isLoading}
            >
              <div className="auth-btn-shine" />
              {isLoading ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <span>Sign in to Workspace</span>
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Form Footer System Description */}
        <div className="auth-form-footer">
          <Sparkles size={14} color="#8b85f0" style={{ flexShrink: 0 }} />
          <span>Analyze research papers, discover literature gaps, and draft thesis introductions</span>
        </div>
      </div>

      <FeedbackModal
        isOpen={config.isOpen}
        type={config.type}
        title={config.title}
        message={config.message}
        onClose={hideFeedback}
      />
    </div>
  );
}