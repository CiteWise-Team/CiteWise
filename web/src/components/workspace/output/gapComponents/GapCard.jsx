export default function GapCard({ gap }) {
  return (
    <div className="border rounded p-2 bg-white shadow-sm hover:border-primary transition cursor-grab">
      <div className="d-flex justify-content-between align-items-start mb-1">
        <p className="fw-semibold small mb-0">{gap.title}</p>
        <button className="btn btn-sm btn-light p-0">×</button>
      </div>
      <p className="text-muted text-xs">{gap.description}</p>
    </div>
  );
}
