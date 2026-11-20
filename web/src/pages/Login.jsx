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
  CheckCircle2
} from "lucide-react";

import { login as loginAPI } from "../api/auth.api";
import { useAuth } from "../context/AuthContext";
import { useFeedbackModal } from "../hooks/useFeedbackModel";
import FeedbackModal from "../components/modals/FeedbackModal";
import citeWiseLogo from "../assets/citewise-logo.png";
import { AuthPreviewCard, AuthBackdropChips } from "../components/auth/AuthShowcaseMotion";
import "../styles/AuthSplitScreen.css";
import "../styles/auth-motion.css";

const LOGIN_SCENES = [
  {
    badge: "SciRAG Baseline",
    title: "Adaptive, Citation-Aware Literature Synthesis",
    gapLabel: "Detected Research Gap",
    gap: "Cross-domain validation under constrained computational environments with real-time citation graphs.",
    metaLabel: "Relevance Score",
    score: 98.4,
  },
  {
    badge: "Policy Baseline",
    title: "Targeted Policing and Adolescent Violence Prevention",
    gapLabel: "Detected Research Gap",
    gap: "Few studies compare outcomes across cities that use different enforcement models.",
    metaLabel: "Relevance Score",
    score: 94.1,
  },
  {
    badge: "Topic Draft",
    title: "Lightweight Citation-Aware Synthesis for Small Labs",
    gapLabel: "Suggested Thesis Topic",
    gap: "Answers two gaps found across your selected papers and is ready to send to CiteWise.",
    metaLabel: "Gap Coverage",
    score: 96.7,
  },
];

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

      // Check if this user was newly registered to trigger Guide Flow on their very first time
      const isNewlyRegistered = localStorage.getItem("citewise.newlyRegistered") === "true";
      const registeredEmail = localStorage.getItem("citewise.newlyRegisteredEmail");
      const loggedInEmail = (data.user?.email || email || "").trim().toLowerCase();

      if (isNewlyRegistered && (!registeredEmail || registeredEmail === loggedInEmail)) {
        localStorage.setItem(`citewise.guidePending.${data.user.id}`, "true");
      }
      localStorage.removeItem("citewise.newlyRegistered");
      localStorage.removeItem("citewise.newlyRegisteredEmail");

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
        <AuthBackdropChips />

        {/* Header with Brand Logo & Back to Home */}
        <div className="auth-showcase-header">
          <Link to="/" className="auth-brand-badge" title="Back to CATalyst Home">
            <div className="auth-brand-icon-box">
              <img
                src={citeWiseLogo}
                alt="CATalyst Logo"
                style={{ width: "26px", height: "26px", objectFit: "contain" }}
              />
            </div>
            <span className="auth-brand-title">
              <span style={{ color: "#ea580c" }}>CAT</span>alyst
            </span>
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
          <AuthPreviewCard status="Active Research Corpus" scenes={LOGIN_SCENES} />

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
          <span>CATalyst Research Assistant</span>
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
                  alt="CATalyst Logo"
                  style={{ width: "24px", height: "24px", objectFit: "contain" }}
                />
              </div>
              <span className="auth-brand-title">
                <span style={{ color: "#ea580c" }}>CAT</span>alyst
              </span>
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
                <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                  <svg width="16" height="16" viewBox="0 0 50 50">
                    <circle cx="25" cy="25" r="20" fill="none" stroke="rgba(255, 255, 255, 0.3)" strokeWidth="5" />
                    <circle cx="25" cy="25" r="20" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" strokeDasharray="50 70">
                      <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="0.8s" repeatCount="indefinite" />
                    </circle>
                  </svg>
                  <span>Signing in...</span>
                </span>
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
          <Sparkles size={14} color="#ea580c" style={{ flexShrink: 0 }} />
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