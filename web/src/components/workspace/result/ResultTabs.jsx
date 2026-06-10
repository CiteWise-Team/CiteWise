// export default function ResultTabs({ activeTab, onTabChange }) {
//   return (
//     <>
//       <div className="d-flex justify-content-between mb-3">
//         <div className="d-flex gap-3">
//           <button
//             className={`btn btn-link ${
//               activeTab === "result"
//                 ? "fw-bold text-primary"
//                 : "text-muted"
//             }`}
//             onClick={() => onTabChange("result")}
//           >
//             Result
//           </button>

//           <button
//             className={`btn btn-link ${
//               activeTab === "papers"
//                 ? "fw-bold text-primary"
//                 : "text-muted"
//             }`}
//             onClick={() => onTabChange("papers")}
//           >
//             Papers
//           </button>
//         </div>

//         <div className="d-flex gap-2">
//           <button className="btn btn-light">Copy</button>
//           <button className="btn btn-light">Download</button>
//           <button className="btn btn-light">Share</button>
//         </div>
//       </div>

//       {activeTab === "papers" && (
//         <input
//           className="form-control mb-3"
//           placeholder="Search previous papers..."
//         />
//       )}
//     </>
//   );
// }
