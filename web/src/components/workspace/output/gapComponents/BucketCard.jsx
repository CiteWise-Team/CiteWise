import GapCard from "./GapCard";

export default function BucketCard({ bucket, gaps }) {
  return (
    <div className="min-w-[250px] bg-light border rounded-lg flex flex-col p-3 gap-2 shadow-sm">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h6 className="fw-bold">{bucket.name}</h6>
        <span className="badge bg-secondary">{gaps.length} GAPS</span>
      </div>
      <div className="d-flex flex-column gap-2">
        {gaps.length > 0 ? (
          gaps.map((gap) => <GapCard key={gap.id} gap={gap} />)
        ) : (
          <p className="text-muted small text-center">Drag gaps here</p>
        )}
      </div>
    </div>
  );
}
