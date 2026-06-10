import PublicLayout from "../layouts/PublicLayout";
import "../styles/landing.css";

export default function Home() {
  return (
    <PublicLayout>

      {/* HERO */}
      <section
        className="hero-section d-flex align-items-center"
        style={{ backgroundColor: "#transparent", minHeight: "100vh"  }}
      >
        <div className="container h-100 d-flex align-items-center">
          <div className="row align-items-center w-100">

            <div className="col-lg-6 mb-5">
              <div
                className="p-5 rounded-4"
                style={{ backgroundColor: "#1e1e2f", border: "1px solid #3a3a55" }}
              >
                <h1 className="hero-title" style={{ color: "#e4e4f0" }}>
                  Discover research gaps <span className="hero-highlight" style={{ color: "#5b5bd6" }}>effortlessly.</span>
                </h1>

                <p className="lead mt-3" style={{ color: "#a1a1b5" }}>
                  CATalyst helps researchers analyze research papers, identify gaps,
                  and guide in topic formulation using AI-driven workflows.
                </p>

                <div className="mt-4 d-flex gap-3 flex-wrap">
                  <a
                    href="/login"
                    className="btn btn-lg fw-bold"
                    style={{ backgroundColor: "#5b5bd6", color: "#fff", border: "none" }}
                  >
                    Get Started
                  </a>

                  <button
                    className="btn btn-lg"
                    style={{ border: "1px solid #3a3a55", color: "#e4e4f0", backgroundColor: "transparent" }}
                  >
                    Watch Demo
                  </button>
                </div>

                <p className="mt-4" style={{ color: "#a1a1b5" }}>
                  Join researchers already discovering better research directions.
                </p>
              </div>
            </div>

            {/* Carousel */}
            <div className="col-lg-6">
              <div
                className="p-3 rounded-4 shadow-sm"
                style={{ backgroundColor: "#1e1e2f", border: "1px solid #3a3a55" }}
              >
                <div
                  id="uiCarousel"
                  className="carousel slide rounded"
                  data-bs-ride="carousel"
                >

                  <div className="carousel-indicators">
                    <button type="button" data-bs-target="#uiCarousel" data-bs-slide-to="0" className="active"></button>
                    <button type="button" data-bs-target="#uiCarousel" data-bs-slide-to="1"></button>
                    <button type="button" data-bs-target="#uiCarousel" data-bs-slide-to="2"></button>
                    <button type="button" data-bs-target="#uiCarousel" data-bs-slide-to="3"></button>
                  </div>

                  <div className="carousel-inner rounded">

                    <div className="carousel-item active">
                      <img
                        src="https://images.unsplash.com/photo-1551288049-bebda4e38f71"
                        className="d-block w-100 rounded"
                        alt="Dashboard UI"
                      />
                    </div>

                    <div className="carousel-item">
                      <img
                        src="https://images.unsplash.com/photo-1557804506-669a67965ba0"
                        className="d-block w-100 rounded"
                        alt="Analytics UI"
                      />
                    </div>

                    <div className="carousel-item">
                      <img
                        src="https://images.unsplash.com/photo-1559028012-481c04fa702d"
                        className="d-block w-100 rounded"
                        alt="Research UI"
                      />
                    </div>

                    <div className="carousel-item">
                      <img
                        src="https://images.unsplash.com/photo-1558655146-d09347e92766"
                        className="d-block w-100 rounded"
                        alt="Workflow UI"
                      />
                    </div>

                  </div>

                  <button className="carousel-control-prev" type="button" data-bs-target="#uiCarousel" data-bs-slide="prev">
                    <span className="carousel-control-prev-icon"></span>
                  </button>

                  <button className="carousel-control-next" type="button" data-bs-target="#uiCarousel" data-bs-slide="next">
                    <span className="carousel-control-next-icon"></span>
                  </button>

                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-5" style={{ backgroundColor: "#25253a" }}>
        <div className="container">

          <div className="text-center mb-5">
            <h2 className="fw-bold" style={{ color: "#e4e4f0" }}>Designed for modern research workflows</h2>
            <p style={{ color: "#a1a1b5" }}>Core features that help students move from literature review to thesis topic faster.</p>
          </div>

          <div className="row g-4">
            {[
              { icon: "search", title: "Summarize Papers", text: "Lessen cognitive load by summarizing key sections of research papers for quick understanding and efficiency" },
              { icon: "insights", title: "Problem Discovery", text: "Analyze research papers to visualize underexplored opportunities to guide you for potential thesis development." },
              { icon: "lightbulb", title: "Thesis Support", text: "Refine research topics and problem statements using AI-guided suggestions from literature evidence." }
            ].map((f, i) => (
              <div className="col-md-4" key={i}>
                <div className="p-4 rounded-4" style={{ backgroundColor: "#1e1e2f", border: "1px solid #3a3a55" }}>
                  <div className="mb-3" style={{ color: "#a5b4fc" }}>
                    <span className="material-symbols-outlined">{f.icon}</span>
                  </div>
                  <h5 className="fw-bold" style={{ color: "#e4e4f0" }}>{f.title}</h5>
                  <p style={{ color: "#a1a1b5" }}>{f.text}</p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* CTA */}
      <section className="container my-5">
        <div className="text-center p-5 rounded-4" style={{ backgroundColor: "#1e1e2f", border: "1px solid #3a3a55" }}>
          <h2 className="fw-bold mb-3" style={{ color: "#e4e4f0" }}>Ready to find your thesis topic?</h2>
          <p className="mb-4" style={{ color: "#a1a1b5" }}>Use CATalyst to analyze literature and discover research gaps faster.</p>
          <a href="/login" className="btn btn-lg fw-bold" style={{ backgroundColor: "#5b5bd6", color: "#fff", border: "none" }}>Start Exploring</a>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ backgroundColor: "#1e1e2f", borderTop: "1px solid #3a3a55" }} className="mt-5 py-5">
        <div className="container">
          <div className="row g-4">
            <div className="col-md-3">
              <div className="d-flex align-items-center mb-2" style={{ color: "#e4e4f0" }}>
                <span className="material-symbols-outlined me-2">hub</span>
                <strong>CATalyst</strong>
              </div>
              <p style={{ color: "#a1a1b5" }} className="small">AI-powered research gap discovery for thesis and research writing.</p>
            </div>
            <div className="col-md-3">
              <h6 className="fw-bold" style={{ color: "#e4e4f0" }}>Product</h6>
              <a href="#" className="d-block small mb-1" style={{ color: "#a1a1b5" }}>Overview</a>
              <a href="#" className="d-block small mb-1" style={{ color: "#a1a1b5" }}>Features</a>
              <a href="#" className="d-block small" style={{ color: "#a1a1b5" }}>Security</a>
            </div>
            <div className="col-md-3">
              <h6 className="fw-bold" style={{ color: "#e4e4f0" }}>Company</h6>
              <a href="#" className="d-block small mb-1" style={{ color: "#a1a1b5" }}>About</a>
              <a href="#" className="d-block small mb-1" style={{ color: "#a1a1b5" }}>Privacy</a>
              <a href="#" className="d-block small" style={{ color: "#a1a1b5" }}>Terms</a>
            </div>
            <div className="col-md-3">
              <h6 className="fw-bold" style={{ color: "#e4e4f0" }}>Connect</h6>
              <div className="d-flex gap-3 mt-2" style={{ color: "#a1a1b5" }}>
                <span className="material-symbols-outlined">alternate_email</span>
                <span className="material-symbols-outlined">hub</span>
                <span className="material-symbols-outlined">code</span>
              </div>
            </div>
          </div>

          <hr className="my-4" style={{ borderColor: "#3a3a55" }} />

          <div className="text-center small" style={{ color: "#a1a1b5" }}>
            © 2026 CATalyst. All rights reserved.
          </div>
        </div>
      </footer>

    </PublicLayout>
  );
}