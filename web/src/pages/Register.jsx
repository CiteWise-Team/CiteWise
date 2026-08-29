import { useFeedbackModal } from "../hooks/useFeedbackModel";
import FeedbackModal from "../components/modals/FeedbackModal";

import PublicLayout from "../layouts/PublicLayout";
import { useState } from "react";
import { register as registerAPI } from "../api/auth.api";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

import { FaCheckCircle, FaEye, FaEyeSlash, FaLightbulb } from "react-icons/fa";
import { GrSecure } from "react-icons/gr";

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
      // Registration doesn't return a session — redirect to login
      showFeedback({
        type: "success",
        title: "Account Created",
        message: "Your account has been created. Please sign in.",
      });
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      showFeedback({
        type: "error",
        title: "Registration Failed",
        message: err.message || "Something went wrong",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <PublicLayout>
      <div className="container-fluid min-vh-100 p-0">
        <div className="row flex-grow-1 g-0" style={{ minHeight: "100vh" }}>

          {/* LEFT SIDE - GLASS EFFECT WITH GLOW */}
          <div className="col-lg-6 d-none d-lg-flex align-items-center justify-content-center" style={{ 
            backgroundColor: "#0a0a14",
            padding: "2.5rem",
            position: "relative",
            overflow: "hidden"
          }}>
            {/* Enhanced glowing orbs */}
            <div style={{
              position: "absolute",
              top: "-30%",
              left: "-20%",
              width: "700px",
              height: "700px",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(91,91,214,0.25) 0%, rgba(91,91,214,0.05) 40%, transparent 70%)",
              pointerEvents: "none",
              animation: "pulseGlow 8s ease-in-out infinite alternate",
              filter: "blur(50px)"
            }} />
            <div style={{
              position: "absolute",
              bottom: "-30%",
              right: "-20%",
              width: "600px",
              height: "600px",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(139,133,240,0.2) 0%, rgba(139,133,240,0.05) 40%, transparent 70%)",
              pointerEvents: "none",
              animation: "pulseGlow 8s ease-in-out infinite alternate-reverse",
              filter: "blur(50px)"
            }} />
            <div style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "400px",
              height: "400px",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(91,91,214,0.1) 0%, transparent 70%)",
              pointerEvents: "none",
              filter: "blur(40px)"
            }} />

            {/* Glass Card with glow border */}
            <div className="w-100" style={{ 
              position: "relative", 
              zIndex: 1,
              background: "rgba(30,30,47,0.35)",
              backdropFilter: "blur(30px)",
              WebkitBackdropFilter: "blur(30px)",
              border: "1px solid rgba(139,133,240,0.15)",
              borderRadius: "28px",
              padding: "4rem 3.5rem",
              boxShadow: "0 25px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05), 0 0 100px -30px rgba(91,91,214,0.25)",
              maxWidth: "580px",
              margin: "0 auto"
            }}>
              
              {/* Glowing border effect */}
              <div style={{
                position: "absolute",
                inset: "-2px",
                borderRadius: "28px",
                background: "linear-gradient(135deg, rgba(139,133,240,0.25), rgba(91,91,214,0.15), rgba(139,133,240,0.25))",
                zIndex: -1,
                filter: "blur(10px)"
              }} />

              {/* Logo with glow */}
              <div className="mb-4 d-flex align-items-center justify-content-center gap-3">
                <div 
                  style={{
                    width: "60px",
                    height: "60px",
                    borderRadius: "16px",
                    background: "linear-gradient(135deg, #8b85f0, #5b5bd6)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 0 60px -12px rgba(91,91,214,0.6), 0 0 100px -30px rgba(91,91,214,0.3)"
                  }}
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M2 17L12 22L22 17" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M2 12L12 17L22 12" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
                  </svg>
                </div>
                <div>
                  <div style={{ 
                    fontFamily: "'Sora', sans-serif", 
                    fontWeight: 700, 
                    fontSize: "1.8rem", 
                    color: "#ffffff",
                    letterSpacing: "-0.02em",
                    textShadow: "0 0 50px rgba(91,91,214,0.3)"
                  }}>
                    CATalyst
                  </div>
                  <div style={{ 
                    color: "rgba(161,161,181,0.5)", 
                    fontSize: "0.7rem", 
                    letterSpacing: "0.15em", 
                    textTransform: "uppercase",
                    textAlign: "center"
                  }}>
                  </div>
                </div>
              </div>

              {/* Main Heading with glow */}
              <h1 className="fw-bold mb-3 text-center" style={{ 
                fontFamily: "'Sora', sans-serif", 
                fontSize: "clamp(2rem, 3vw, 2.8rem)", 
                color: "#ffffff",
                lineHeight: "1.2",
                letterSpacing: "-0.02em",
                textShadow: "0 0 50px rgba(91,91,214,0.15)"
              }}>
                Start Your <span style={{ 
                background: "linear-gradient(135deg, #8b85f0, #5b5bd6)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
                textShadow: "none"
              }}>
                Research Journey
              </span>
            </h1>
              {/* Description */}
              <p className="mb-4 text-center" style={{ 
                color: "rgba(161,161,181,0.8)", 
                fontSize: "1rem", 
                lineHeight: "1.8",
                maxWidth: "440px",
                margin: "0 auto 1.5rem auto"
              }}>
                Join researchers already discovering better research directions
                with AI-powered gap detection and thesis support.
              </p>

              {/* Feature Tags */}
              <div className="d-flex flex-wrap justify-content-center gap-2">
                <div className="d-flex align-items-center gap-2" style={{
                  background: "rgba(91,91,214,0.12)",
                  border: "1px solid rgba(91,91,214,0.15)",
                  borderRadius: "999px",
                  padding: "0.5rem 1.4rem",
                  backdropFilter: "blur(10px)",
                  boxShadow: "0 0 25px -10px rgba(91,91,214,0.1)"
                }}>
                  <span style={{ color: "#8b85f0" }}>
                    <FaCheckCircle size={16} />
                  </span>
                  <span style={{ color: "rgba(228,228,240,0.9)", fontSize: "0.9rem", fontWeight: 500 }}>AI Gap Detection</span>
                </div>
                <div className="d-flex align-items-center gap-2" style={{
                  background: "rgba(91,91,214,0.12)",
                  border: "1px solid rgba(91,91,214,0.15)",
                  borderRadius: "999px",
                  padding: "0.5rem 1.4rem",
                  backdropFilter: "blur(10px)",
                  boxShadow: "0 0 25px -10px rgba(91,91,214,0.1)"
                }}>
                  <span style={{ color: "#8b85f0" }}>
                    <GrSecure size={16} />
                  </span>
                  <span style={{ color: "rgba(228,228,240,0.9)", fontSize: "0.9rem", fontWeight: 500 }}>Secure Workspace</span>
                </div>
                <div className="d-flex align-items-center gap-2" style={{
                  background: "rgba(91,91,214,0.12)",
                  border: "1px solid rgba(91,91,214,0.15)",
                  borderRadius: "999px",
                  padding: "0.5rem 1.4rem",
                  backdropFilter: "blur(10px)",
                  boxShadow: "0 0 25px -10px rgba(91,91,214,0.1)"
                }}>
                  <span style={{ color: "#8b85f0" }}>
                    <FaLightbulb size={16} />
                  </span>
                  <span style={{ color: "rgba(228,228,240,0.9)", fontSize: "0.9rem", fontWeight: 500 }}>Thesis Support</span>
                </div>
              </div>

            </div>
          </div>

          {/* RIGHT SIDE (REGISTER FORM) */}
          <div className="col-lg-6 d-flex align-items-center justify-content-center" style={{ 
            backgroundColor: "#0a0a14",
            padding: "2.5rem"
          }}>
            <div className="p-5 rounded-4" style={{ 
              maxWidth: "460px", 
              width: "100%", 
              background: "rgba(30,30,47,0.5)",
              border: "1px solid rgba(139,133,240,0.1)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              boxShadow: "0 25px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.03), 0 0 70px -25px rgba(91,91,214,0.1)"
            }}>
              {/* Form Header */}
              <div className="text-center mb-4">
                <div style={{ 
                  display: "inline-block",
                  background: "rgba(91,91,214,0.15)",
                  padding: "0.3rem 1.2rem",
                  borderRadius: "999px",
                  fontSize: "0.7rem",
                  color: "#8b85f0",
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  boxShadow: "0 0 25px -10px rgba(91,91,214,0.2)"
                }}>
                  Get Started
                </div>
                <h3 className="fw-bold mt-3" style={{ 
                  fontFamily: "'Sora', sans-serif", 
                  color: "#ffffff",
                  fontSize: "1.7rem",
                  letterSpacing: "-0.01em"
                }}>
                  Create Account
                </h3>
                <p style={{ color: "rgba(161,161,181,0.7)", fontSize: "0.9rem", marginTop: "0.1rem" }}>
                  Join CATalyst and start your research journey
                </p>
              </div>

              <form onSubmit={handleSubmit}>

                <div className="mb-3">
                  <label className="form-label" style={{ color: "rgba(228,228,240,0.8)", fontSize: "0.85rem", fontWeight: 600 }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="john@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    style={{
                      backgroundColor: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(58,58,85,0.4)",
                      color: "#e4e4f0",
                      borderRadius: "12px",
                      padding: "0.8rem 1rem",
                      fontSize: "1rem",
                      transition: "border-color 0.3s ease, box-shadow 0.3s ease, background 0.3s ease"
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#8b85f0";
                      e.target.style.boxShadow = "0 0 30px -12px rgba(91,91,214,0.4), 0 0 70px -25px rgba(91,91,214,0.1)";
                      e.target.style.background = "rgba(255,255,255,0.07)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "rgba(58,58,85,0.4)";
                      e.target.style.boxShadow = "none";
                      e.target.style.background = "rgba(255,255,255,0.04)";
                    }}
                  />
                </div>

                <div className="mb-4">
                  <div className="d-flex justify-content-between align-items-center">
                    <label className="form-label" style={{ color: "rgba(228,228,240,0.8)", fontSize: "0.85rem", fontWeight: 600 }}>
                      Password
                    </label>
                    <span style={{ 
                      color: "rgba(161,161,181,0.4)", 
                      fontSize: "0.7rem"
                    }}>
                      Min 8 characters
                    </span>
                  </div>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showPassword ? "text" : "password"}
                      className="form-control"
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      style={{
                        backgroundColor: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(58,58,85,0.4)",
                        color: "#e4e4f0",
                        borderRadius: "12px",
                        padding: "0.8rem 3.2rem 0.8rem 1rem",
                        fontSize: "1rem",
                        transition: "border-color 0.3s ease, box-shadow 0.3s ease, background 0.3s ease"
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = "#8b85f0";
                        e.target.style.boxShadow = "0 0 30px -12px rgba(91,91,214,0.4), 0 0 70px -25px rgba(91,91,214,0.1)";
                        e.target.style.background = "rgba(255,255,255,0.07)";
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = "rgba(58,58,85,0.4)";
                        e.target.style.boxShadow = "none";
                        e.target.style.background = "rgba(255,255,255,0.04)";
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: "absolute",
                        right: "12px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        color: "rgba(161,161,181,0.5)",
                        cursor: "pointer",
                        padding: "4px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "color 0.2s ease"
                      }}
                      onMouseEnter={(e) => e.target.style.color = "#8b85f0"}
                      onMouseLeave={(e) => e.target.style.color = "rgba(161,161,181,0.5)"}
                    >
                      {showPassword ? <FaEyeSlash size={20} /> : <FaEye size={20} />}
                    </button>
                  </div>
                </div>

                <button 
                  type="submit"
                  className="btn w-100 fw-bold" 
                  disabled={isLoading}
                  style={{ 
                    background: "linear-gradient(135deg, #8b85f0, #5b5bd6)",
                    color: "#fff", 
                    border: "none",
                    borderRadius: "12px",
                    padding: "0.9rem",
                    fontSize: "1rem",
                    transition: "transform 0.25s ease, box-shadow 0.35s ease, background 0.3s ease",
                    boxShadow: "0 0 35px -12px rgba(91,91,214,0.5), 0 0 70px -25px rgba(91,91,214,0.2)",
                    opacity: isLoading ? 0.7 : 1,
                    cursor: isLoading ? "not-allowed" : "pointer",
                    position: "relative",
                    overflow: "hidden"
                  }}
                  onMouseEnter={(e) => {
                    if (!isLoading) {
                      e.target.style.transform = "translateY(-2px)";
                      e.target.style.boxShadow = "0 15px 45px -12px rgba(91,91,214,0.6), 0 0 90px -25px rgba(91,91,214,0.2)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = "translateY(0)";
                    e.target.style.boxShadow = "0 0 35px -12px rgba(91,91,214,0.5), 0 0 70px -25px rgba(91,91,214,0.2)";
                  }}
                >
                  {/* Button shine effect */}
                  <div style={{
                    position: "absolute",
                    top: "-50%",
                    left: "-50%",
                    width: "200%",
                    height: "200%",
                    background: "radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 60%)",
                    animation: "btnShine 4s ease-in-out infinite",
                    pointerEvents: "none"
                  }} />
                  {isLoading ? (
                    <span>Creating account...</span>
                  ) : (
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                      Create Account
                      <span className="material-symbols-outlined" style={{ fontSize: "1.3rem" }}>
                        arrow_forward
                      </span>
                    </span>
                  )}
                </button>

                <p className="text-center mt-4" style={{ color: "rgba(161,161,181,0.6)", fontSize: "0.85rem" }}>
                  Already have an account?{" "}
                  <a href="/login" style={{ 
                    color: "#8b85f0", 
                    textDecoration: "none",
                    fontWeight: 600,
                    transition: "color 0.2s ease",
                    textShadow: "0 0 25px rgba(91,91,214,0.2)"
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.color = "#a5b4fc";
                    e.target.style.textShadow = "0 0 35px rgba(91,91,214,0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.color = "#8b85f0";
                    e.target.style.textShadow = "0 0 25px rgba(91,91,214,0.2)";
                  }}
                  >
                    Sign In
                  </a>
                </p>

              </form>

            </div>
          </div>

        </div>
      </div>

      {/* Add keyframes for animations */}
      <style>{`
        @keyframes pulseGlow {
          0% { opacity: 0.5; transform: scale(1); }
          100% { opacity: 1; transform: scale(1.08); }
        }
        
        @keyframes btnShine {
          0% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
          100% { transform: translateX(100%) translateY(100%) rotate(45deg); }
        }
      `}</style>

      <FeedbackModal isOpen={config.isOpen} type={config.type} title={config.title} message={config.message} onClose={hideFeedback} />
    </PublicLayout>
  );
}