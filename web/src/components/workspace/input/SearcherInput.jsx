



// import { useState } from "react";

// export default function SearcherInput({
//   keywords,
//   setKeywords,
//   instructions,
//   setInstructions,
//   onRun,
// }) {
//   const [input, setInput] = useState("");

//   const addKeyword = () => {
//     if (!input.trim()) return;
//     setKeywords([...keywords, input.trim()]);
//     setInput("");
//   };

//   const removeKeyword = (kw) => {
//     setKeywords(keywords.filter((k) => k !== kw));
//   };

//   return (
//     <div className="card h-100 shadow-sm">
//       {/* Header */}
//       <div className="card-header d-flex justify-content-between align-items-center">
//         <div>
//           <h5 className="mb-0">Input</h5>
//           <small className="text-muted">Define keywords for web search</small>
//         </div>
//         <span className="material-symbols-outlined">search</span>
//       </div>

//       <div className="card-body d-flex flex-column gap-3 overflow-hidden">
//         {/* Keyword input */}
//         <div className="input-group">
//           <input
//             type="text"
//             className="form-control"
//             placeholder="Enter keyword and press Add..."
//             value={input}
//             onChange={(e) => setInput(e.target.value)}
//           />
//           <button className="btn btn-primary" onClick={addKeyword}>
//             Add
//           </button>
//         </div>

//         {/* Keyword list */}
//         <div className="flex-grow-1 overflow-auto border rounded p-2">
//           {keywords.map((kw, idx) => (
//             <div
//               key={idx}
//               className="d-flex justify-content-between align-items-center border rounded p-2 mb-2"
//             >
//               <span className="fw-medium">{kw}</span>
//               <button
//                 className="btn btn-sm btn-outline-danger"
//                 onClick={() => removeKeyword(kw)}
//               >
//                 ✕
//               </button>
//             </div>
//           ))}
//         </div>

//         {/* Instructions */}
//         <div>
//           <label className="form-label fw-bold">Additional Instructions</label>
//           <textarea
//             className="form-control"
//             rows="3"
//             placeholder="Filter results for whitepapers and technical blogs..."
//             value={instructions}
//             onChange={(e) => setInstructions(e.target.value)}
//           />
//         </div>

//         <button className="btn btn-primary w-100 mt-auto" onClick={onRun}>
//           Run Workflow
//         </button>
//       </div>
//     </div>
//   );
// }

import { useState } from "react";

export default function SearcherInput({
  // ❗ TEMP: make props optional
  keywords: propKeywords,
  setKeywords: propSetKeywords,
  instructions: propInstructions,
  setInstructions: propSetInstructions,
  onRun,
}) {
  // ✅ TEMP MOCK STATE (only used if props are not passed)
  const [localKeywords, setLocalKeywords] = useState([
    "Infrastructure Resilience",
    "API Latency Solutions",
    "WebSocket Scalability",
  ]);

  const [localInstructions, setLocalInstructions] = useState(
    "Filter results for whitepapers and technical blogs..."
  );

  // ✅ Decide whether to use props or local
  const keywords = propKeywords ?? localKeywords;
  const setKeywords = propSetKeywords ?? setLocalKeywords;
  const instructions = propInstructions ?? localInstructions;
  const setInstructions = propSetInstructions ?? setLocalInstructions;

  const [input, setInput] = useState("");

  const addKeyword = () => {
    if (!input.trim()) return;
    setKeywords([...keywords, input.trim()]);
    setInput("");
  };

  const removeKeyword = (kw) => {
    setKeywords(keywords.filter((k) => k !== kw));
  };

  return (
    <div className="card h-100 shadow-sm">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Input</h5>
        <span className="material-symbols-outlined">search</span>
      </div>

      <div className="card-body d-flex flex-column gap-3 overflow-hidden">
        <div className="input-group">
          <input
            type="text"
            className="form-control"
            placeholder="Enter keyword..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button className="btn btn-primary" onClick={addKeyword}>
            Add
          </button>
        </div>

        <div className="flex-grow-1 overflow-auto border rounded p-2">
          {keywords.map((kw, idx) => (
            <div
              key={idx}
              className="d-flex justify-content-between align-items-center border rounded p-2 mb-2"
            >
              <span>{kw}</span>
              <button
                className="btn btn-sm btn-outline-danger"
                onClick={() => removeKeyword(kw)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <textarea
          className="form-control"
          rows="3"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
        />

        <button className="btn btn-primary w-100" onClick={onRun}>
          Run Workflow
        </button>
      </div>
    </div>
  );
}
