export default function StepTabs({ current, onChange }) {
  const steps = [
    { key: "extractor", label: "Extractor" },
    { key: "summarizer", label: "Summarizer" },
    { key: "gap", label: "Gap Extractor" },
    { key: "topic", label: "Topic Suggester" },
    // { key: "search", label: "Searcher" },
  ];

  return (
    <div className="card mb-4">
      <div className="card-body d-flex justify-content-between">
        {steps.map((step) => (
          <button
            key={step.key}
            className={`btn ${
              current === step.key ? "btn-primary" : "btn-outline-primary"
            }`}
            onClick={() => onChange(step.key)}
          >
            {step.label}
          </button>
        ))}
      </div>
    </div>
  );
}
