
// import { useState, useEffect } from "react";

// export default function SearcherOutput({ results = [] }) {
//   const [activeId, setActiveId] = useState(null);

//   useEffect(() => {
//     if (results.length > 0) setActiveId(results[0].id);
//   }, [results]);

//   const active = results.find((r) => r.id === activeId);

//   return (
//     <div className="card h-100 shadow-sm">
//       {/* Header */}
//       <div className="card-header d-flex justify-content-between align-items-center">
//         <h5 className="mb-0">Search Results</h5>
//         <span className="material-symbols-outlined">public</span>
//       </div>

//       <div className="card-body p-0 d-flex overflow-hidden">
//         {/* LEFT: results list */}
//         <div
//           className="border-end overflow-auto"
//           style={{ width: "320px" }}
//         >
//           <div className="p-3 border-bottom text-muted small fw-bold">
//             Results Found ({results.length})
//           </div>

//           {results.map((r) => (
//             <div
//               key={r.id}
//               onClick={() => setActiveId(r.id)}
//               className={`p-3 border-bottom cursor-pointer ${
//                 activeId === r.id ? "bg-light" : ""
//               }`}
//               style={{ cursor: "pointer" }}
//             >
//               <div className="fw-bold small">{r.title}</div>
//               <div className="text-muted small">{r.source}</div>
//             </div>
//           ))}
//         </div>

//         {/* RIGHT: detail view */}
//         <div className="flex-grow-1 overflow-auto p-4">
//           {active ? (
//             <>
//               <h4 className="fw-bold">{active.title}</h4>
//               <p className="text-muted small mb-3">{active.source}</p>

//               <h6 className="fw-bold">Abstract</h6>
//               <p className="text-muted">{active.abstract}</p>

//               <h6 className="fw-bold mt-4">Key Takeaways</h6>
//               <ul>
//                 {active.takeaways.map((t, i) => (
//                   <li key={i}>{t}</li>
//                 ))}
//               </ul>
//             </>
//           ) : (
//             <div className="text-muted">
//               Run the workflow to see search results.
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }


import { useState, useEffect } from "react";

export default function SearcherOutput({ results: propResults }) {
  // ✅ TEMP MOCK RESULTS
  const mockResults = [
    {
      id: 1,
      title: "Scaling WebSocket Connections in Real-time Applications",
      source: "medium.com/tech-insights",
      abstract:
        "Advanced architectural patterns for handling thousands of concurrent persistent connections...",
      takeaways: [
        "Redis-backed pub/sub",
        "Connection pooling techniques",
        "Back-pressure mechanisms",
      ],
    },
    {
      id: 2,
      title: "Modern Caching Strategies for High Traffic",
      source: "stack-overflow.com/articles",
      abstract: "Guide on distributed caching for large-scale systems...",
      takeaways: ["Layered caching", "TTL tuning", "Cache invalidation"],
    },
  ];

  // ✅ use props if available, else mock
  const results = propResults ?? mockResults;

  const [activeId, setActiveId] = useState(null);

  useEffect(() => {
    if (results.length > 0) setActiveId(results[0].id);
  }, [results]);

  const active = results.find((r) => r.id === activeId);

  return (
    <div className="card h-100 shadow-sm">
      <div className="card-header">
        <h5 className="mb-0">Search Results</h5>
      </div>

      <div className="card-body p-0 d-flex overflow-hidden">
        {/* Left list */}
        <div style={{ width: "320px" }} className="border-end overflow-auto">
          {results.map((r) => (
            <div
              key={r.id}
              onClick={() => setActiveId(r.id)}
              className={`p-3 border-bottom ${
                activeId === r.id ? "bg-light" : ""
              }`}
              style={{ cursor: "pointer" }}
            >
              <div className="fw-bold small">{r.title}</div>
              <div className="text-muted small">{r.source}</div>
            </div>
          ))}
        </div>

        {/* Right detail */}
        <div className="flex-grow-1 p-4 overflow-auto">
          {active && (
            <>
              <h4>{active.title}</h4>
              <p className="text-muted">{active.abstract}</p>
              <ul>
                {active.takeaways.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
