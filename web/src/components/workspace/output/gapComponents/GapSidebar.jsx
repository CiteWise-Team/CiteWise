// import GapCard from "./GapCard";

// export default function GapSidebar({ gaps }) {
//   return (
//     <div className="flex-1 overflow-y-auto border-end border-light p-3">
//       <h5 className="mb-3">Extracted Gaps ({gaps.length})</h5>
//       <div className="d-flex flex-column gap-2">
//         {gaps.map((gap) => (
//           <GapCard key={gap.id} gap={gap} />
//         ))}
//       </div>
//     </div>
//   );
// }
import GapCard from "./GapCard";

export default function GapSidebar({ gaps }) {
    console.log("Gaps in GapSidebar:", gaps);
  return (
    <div className="flex-1 overflow-y-auto border-end border-light p-3 min-w-[250px]">
      <h5 className="mb-3">Extracted Gaps ({gaps.length})</h5>

      {gaps.length === 0 ? (
        <p className="text-muted small text-center mt-4">
          No extracted gaps yet. Run the workflow or upload documents to see them here.
        </p>
      ) : (
        <div className="d-flex flex-column gap-2">
          {gaps.map((gap) => (
            <GapCard key={gap.id} gap={gap} />
          ))}
        </div>
      )}
    </div>
  );
}
