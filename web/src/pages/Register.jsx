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

import { register as registerAPI } from "../api/auth.api";
import { useAuth } from "../context/AuthContext";
import { useFeedbackModal } from "../hooks/useFeedbackModel";
import FeedbackModal from "../components/modals/FeedbackModal";
import citeWiseLogo from "../assets/citewise-logo.png";
import "../styles/AuthSplitScreen.css";

export default function Register() {
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
      const data = await registerAPI({ email, password });
      // Flag this as a newly registered user so the Guide Flow automatically welcomes them on first login
      localStorage.setItem("citewise.newlyRegistered", "true");
      localStorage.setItem("citewise.newlyRegisteredEmail", email.trim().toLowerCase());
      showFeedback({
        type: "success",
        title: "Account Created Successfully",
        message: "Your account is ready! Please sign in with your credentials.",
      });
      setTimeout(() => navigate("/login"), 1400);
    } catch (err) {
      showFeedback({
        type: "error",
        title: "Registration Failed",
        message: err.message || "Unable to create account. Please check your details and try again.",
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
            <span>Join Academic Researchers</span>
          </div>

          <h1 className="auth-showcase-title">
            Synthesize research. <span className="auth-text-gradient">Uncover literature gaps</span>.
          </h1>

          <p className="auth-showcase-desc">
            Transform fragmented papers into structured, defensible literature reviews. Join thousands of scholars using AI-driven synthesis with rigorous citation provenance.
          </p>

          {/* Interactive Feature Preview Card */}
          <div className="auth-preview-card">
            <div className="auth-preview-header">
              <div className="auth-preview-status">
                <span className="auth-preview-status-dot" />
                <span>AI Gap Extraction Matrix</span>
              </div>
              <span className="auth-preview-badge">Automated Synthesis</span>
            </div>

            <div className="auth-preview-paper-title">
              <FileText size={16} color="#8b85f0" />
              <span>Multi-Source Literature Correlation</span>
            </div>

            <div className="auth-preview-gap-box">
              <span className="auth-preview-gap-label">Methodological Opportunity</span>
              Identified 3 under-explored avenues in multimodal scientific claim verification across distributed datasets.
            </div>

            <div className="auth-preview-meta">
              <span>Citation Confidence</span>
              <div className="auth-preview-progress-bar">
                <div className="auth-preview-progress-fill" style={{ width: "96%" }} />
              </div>
              <span style={{ color: "#a5b4fc", fontWeight: 600 }}>99.2%</span>
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
              <span>Automated BibTeX</span>
            </div>
            <div className="auth-feature-pill">
              <span className="auth-feature-pill-icon"><ShieldCheck size={16} /></span>
              <span>End-to-End Privacy</span>
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
          <span>Already have an account?</span>
          <Link to="/login" className="auth-form-topbar-link">
            <span>Sign in</span>
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

          <h2 className="auth-form-heading">Create your account</h2>
          <p className="auth-form-subheading">
            Start discovering research gaps and synthesizing papers in seconds
          </p>

          <form onSubmit={handleSubmit}>
            {/* Email Field */}
            <div className="auth-input-group">
              <div className="auth-input-label-row">
                <label htmlFor="register-email" className="auth-input-label">
                  Email Address
                </label>
              </div>
              <div className="auth-input-container">
                <span className="auth-input-prefix-icon">
                  <Mail size={18} />
                </span>
                <input
                  id="register-email"
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
                <label htmlFor="register-password" className="auth-input-label">
                  Password
                </label>
                <span style={{ fontSize: "0.74rem", color: "#64748b" }}>
                  Min. 8 characters
                </span>
              </div>
              <div className="auth-input-container">
                <span className="auth-input-prefix-icon">
                  <Lock size={18} />
                </span>
                <input
                  id="register-password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  autoComplete="new-password"
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
                <span>Creating account...</span>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight size={17} />
                </>
              )}
            </button>

            {/* Terms notice */}
            <p className="auth-terms-text">
              By creating an account, you agree to our{" "}
              <a href="#terms" onClick={(e) => e.preventDefault()}>Terms of Service</a> and{" "}
              <a href="#privacy" onClick={(e) => e.preventDefault()}>Privacy Policy</a>.
            </p>
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