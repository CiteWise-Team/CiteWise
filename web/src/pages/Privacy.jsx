import { Link } from "react-router-dom";
import PublicLayout from "../layouts/PublicLayout";
import { ArrowLeft, ShieldCheck, FileText, Lock, Eye, Database } from "lucide-react";
import "../styles/LegalPages.css";

export default function Privacy() {
  return (
    <PublicLayout>
      <div className="legal-page-shell">
        <div className="legal-page-container">
          
          {/* Tab Switcher */}
          <div className="legal-tab-switcher">
            <Link to="/terms" className="legal-tab-btn">
              <FileText size={16} />
              <span>Terms of Service</span>
            </Link>
            <Link to="/privacy" className="legal-tab-btn active">
              <ShieldCheck size={16} />
              <span>Privacy Policy</span>
            </Link>
          </div>

          <div className="legal-card">
            <div className="legal-header">
              <p className="legal-eyebrow">CATalyst Data Protection</p>
              <h1 className="legal-title">Privacy Policy</h1>
              <p className="legal-date">Last Updated: September 23, 2026 • Version 2.0</p>
            </div>

            <div className="legal-callout-box">
              <strong>Your Research is Private:</strong> CATalyst treats your scientific manuscripts, uploaded literature datasets, and research gap notes with strict institutional-grade confidentiality. We do not sell your personal data or use your private workspace files to train commercial public models.
            </div>

            <section className="legal-section">
              <h3 className="legal-section-title">
                <span className="legal-section-number">1.</span> Information We Collect
              </h3>
              <p>
                When you use CATalyst, we collect the minimum necessary data to provide our research extraction and gap discovery services:
              </p>
              <ul>
                <li>
                  <strong>Account Data:</strong> Your email address, encrypted password hash, and optional display username provided upon registration.
                </li>
                <li>
                  <strong>Workspace Research Data:</strong> Research paper titles, document metadata, uploaded PDF files, extracted text segments, and user-generated topic annotations.
                </li>
                <li>
                  <strong>Operational Logs:</strong> Technical session tokens, HTTP request logs, and error diagnostic metrics used solely to ensure system reliability and account protection.
                </li>
              </ul>
            </section>

            <section className="legal-section">
              <h3 className="legal-section-title">
                <span className="legal-section-number">2.</span> How We Process Research Documents
              </h3>
              <p>
                Your uploaded research files are processed through our isolated extraction pipeline:
              </p>
              <ul>
                <li>
                  <strong>Secure Parsing:</strong> Uploaded documents are parsed locally within secure server environments to extract abstracts, methodologies, findings, and citation lists.
                </li>
                <li>
                  <strong>Isolated AI Inference:</strong> Text excerpts sent to AI models for gap synthesis are handled via dedicated private API endpoints subject to strict non-retention agreements.
                </li>
                <li>
                  <strong>No Public Leakage:</strong> Your workspace items and extraction results are private to your authenticated account and are never exposed to other platform users.
                </li>
              </ul>
            </section>

            <section className="legal-section">
              <h3 className="legal-section-title">
                <span className="legal-section-number">3.</span> Data Security & Storage
              </h3>
              <p>
                We implement modern security standards to safeguard your academic work:
              </p>
              <ul>
                <li>All data transmitted between your browser and CATalyst is encrypted using TLS 1.3.</li>
                <li>Passwords are hashed using industry-standard cryptographic algorithms with unique salt factors.</li>
                <li>Authentication relies on short-lived JWT access tokens and secure refresh token exchange mechanisms.</li>
              </ul>
            </section>

            <section className="legal-section">
              <h3 className="legal-section-title">
                <span className="legal-section-number">4.</span> Cookies and Local Storage
              </h3>
              <p>
                CATalyst uses browser storage strictly for essential platform operation:
              </p>
              <ul>
                <li>
                  <strong>Authentication State:</strong> Storing JWT tokens to keep you logged in to your active research session.
                </li>
                <li>
                  <strong>Onboarding & Guide Preferences:</strong> Storing guide status flags so you are not repeatedly prompted with first-time onboarding tutorials.
                </li>
              </ul>
              <p>We do not use third-party advertising cookies or cross-site tracking trackers.</p>
            </section>

            <section className="legal-section">
              <h3 className="legal-section-title">
                <span className="legal-section-number">5.</span> User Rights & Data Deletion
              </h3>
              <p>
                You retain complete autonomy over your academic research data:
              </p>
              <ul>
                <li>
                  <strong>Workspace Deletion:</strong> Deleting a workspace immediately removes all associated paper extractions, generated summaries, and gap matrices.
                </li>
                <li>
                  <strong>Account Deletion:</strong> You may request complete erasure of your account and all associated data by contacting our support team.
                </li>
              </ul>
            </section>

            <section className="legal-section">
              <h3 className="legal-section-title">
                <span className="legal-section-number">6.</span> Updates to This Policy
              </h3>
              <p>
                We may periodically update this Privacy Policy to reflect enhancements in our security practices or regulatory requirements. We will notify active users of material revisions through in-app alerts or email notifications.
              </p>
            </section>

            <section className="legal-section">
              <h3 className="legal-section-title">
                <span className="legal-section-number">7.</span> Privacy Contact
              </h3>
              <p>
                If you have questions, data access requests, or privacy concerns, please contact our Data Protection Officer at:
              </p>
              <p style={{ fontWeight: 600, color: "#ea580c" }}>
                privacy@catalyst-research.org
              </p>
            </section>

            {/* Footer Navigation */}
            <div className="legal-card-footer">
              <Link to="/" className="legal-footer-link">
                <ArrowLeft size={16} />
                <span>Return to Home</span>
              </Link>
              <div className="legal-actions">
                <Link to="/terms" className="btn btn-ghost" style={{ padding: "0.55rem 1.25rem", fontSize: "0.85rem" }}>
                  View Terms of Service
                </Link>
                <Link to="/login" className="btn btn-glow" style={{ padding: "0.55rem 1.25rem", fontSize: "0.85rem" }}>
                  Sign In to Workspace
                </Link>
              </div>
            </div>

          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
