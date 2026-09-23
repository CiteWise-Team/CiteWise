import { Link } from "react-router-dom";
import PublicLayout from "../layouts/PublicLayout";
import { ArrowLeft, ArrowRight, ShieldCheck, FileText, CheckCircle2 } from "lucide-react";
import "../styles/LegalPages.css";

export default function Terms() {
  return (
    <PublicLayout>
      <div className="legal-page-shell">
        <div className="legal-page-container">
          
          {/* Tab Switcher */}
          <div className="legal-tab-switcher">
            <Link to="/terms" className="legal-tab-btn active">
              <FileText size={16} />
              <span>Terms of Service</span>
            </Link>
            <Link to="/privacy" className="legal-tab-btn">
              <ShieldCheck size={16} />
              <span>Privacy Policy</span>
            </Link>
          </div>

          <div className="legal-card">
            <div className="legal-header">
              <p className="legal-eyebrow">CATalyst Legal & Governance</p>
              <h1 className="legal-title">Terms of Service</h1>
              <p className="legal-date">Last Updated: September 23, 2026 • Version 2.0</p>
            </div>

            <div className="legal-callout-box">
              <strong>Academic Integrity Notice:</strong> CATalyst is designed as an intelligent research assistant to facilitate literature review, gap extraction, and thesis topic formulation. Users remain solely responsible for the scholarly originality, citation accuracy, and ethical compliance of their written work.
            </div>

            <section className="legal-section">
              <h3 className="legal-section-title">
                <span className="legal-section-number">1.</span> Acceptance of Terms
              </h3>
              <p>
                By accessing, browsing, registering for, or using the CATalyst platform, web applications, and related APIs (collectively, the "Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to all terms and conditions herein, you must immediately discontinue use of the Service.
              </p>
            </section>

            <section className="legal-section">
              <h3 className="legal-section-title">
                <span className="legal-section-number">2.</span> Account Registration and Security
              </h3>
              <p>
                To access workspace creation, paper uploading, and research gap synthesis features, you must register for an account. When registering:
              </p>
              <ul>
                <li>You agree to provide true, accurate, and current information.</li>
                <li>You are solely responsible for maintaining the confidentiality of your account credentials.</li>
                <li>You must promptly notify the CATalyst team of any unauthorized access or security breach regarding your account.</li>
              </ul>
            </section>

            <section className="legal-section">
              <h3 className="legal-section-title">
                <span className="legal-section-number">3.</span> Uploaded Content & Fair Use Rights
              </h3>
              <p>
                When you upload research papers, PDF documents, or literature excerpts to CATalyst workspaces:
              </p>
              <ul>
                <li>
                  <strong>Ownership:</strong> You retain all intellectual property rights in your original research manuscripts, drafts, and notes.
                </li>
                <li>
                  <strong>Fair Use & Research Exemption:</strong> You affirm that you hold legitimate educational or academic fair-use rights to upload third-party scientific papers for text extraction, analysis, and personal synthesis.
                </li>
                <li>
                  <strong>No Model Retraining on User Data:</strong> CATalyst does not use your uploaded manuscripts or confidential thesis drafts to retrain general public generative AI models without explicit written permission.
                </li>
              </ul>
            </section>

            <section className="legal-section">
              <h3 className="legal-section-title">
                <span className="legal-section-number">4.</span> AI Synthesis & Citation Provenance
              </h3>
              <p>
                CATalyst uses advanced natural language extraction algorithms to identify research gaps, generate section summaries, and suggest thesis topic directions.
              </p>
              <ul>
                <li>
                  <strong>Verification Requirement:</strong> AI-generated suggestions, gap scores, and bibliographic summaries must be verified against original sources prior to publication or academic submission.
                </li>
                <li>
                  <strong>No Guarantee of Thesis Acceptance:</strong> CATalyst makes no guarantee that topic proposals or gap statements synthesized through the tool will receive academic committee or peer-review approval.
                </li>
              </ul>
            </section>

            <section className="legal-section">
              <h3 className="legal-section-title">
                <span className="legal-section-number">5.</span> Prohibited Uses
              </h3>
              <p>You agree not to use CATalyst to:</p>
              <ul>
                <li>Engage in intentional academic dishonesty, contract cheating, or automated bulk plagiarism.</li>
                <li>Upload malicious files, viruses, or corrupt data intended to disrupt system infrastructure.</li>
                <li>Attempt to reverse engineer, decompile, or bypass workspace security barriers.</li>
                <li>Use automated scrapers or bots to disrupt system performance or extract unauthorized user workspaces.</li>
              </ul>
            </section>

            <section className="legal-section">
              <h3 className="legal-section-title">
                <span className="legal-section-number">6.</span> Service Availability & Modifications
              </h3>
              <p>
                We strive for high reliability and continuous availability of the CATalyst platform. However, the Service is provided on an "AS IS" and "AS AVAILABLE" basis. We reserve the right to modify, update, or temporarily suspend features for maintenance, security patches, or architectural upgrades.
              </p>
            </section>

            <section className="legal-section">
              <h3 className="legal-section-title">
                <span className="legal-section-number">7.</span> Limitation of Liability
              </h3>
              <p>
                To the fullest extent permitted by applicable law, CATalyst and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of, or inability to use, the platform or any AI-synthesized suggestions.
              </p>
            </section>

            <section className="legal-section">
              <h3 className="legal-section-title">
                <span className="legal-section-number">8.</span> Contact & Inquiries
              </h3>
              <p>
                For questions regarding these Terms of Service or academic licensing, please contact the CATalyst Governance Team at:
              </p>
              <p style={{ fontWeight: 600, color: "#ea580c" }}>
                support@catalyst-research.org
              </p>
            </section>

            {/* Footer Navigation */}
            <div className="legal-card-footer">
              <Link to="/" className="legal-footer-link">
                <ArrowLeft size={16} />
                <span>Return to Home</span>
              </Link>
              <div className="legal-actions">
                <Link to="/privacy" className="btn btn-ghost" style={{ padding: "0.55rem 1.25rem", fontSize: "0.85rem" }}>
                  View Privacy Policy
                </Link>
                <Link to="/register" className="btn btn-glow" style={{ padding: "0.55rem 1.25rem", fontSize: "0.85rem" }}>
                  Create Free Account
                </Link>
              </div>
            </div>

          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
