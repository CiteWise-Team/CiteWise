// import { useState } from "react";
// import TopicSuggesterInput from "../workspace/input/TopicSuggesterInput.jsx";
// import TopicSuggesterOutput from "../workspace/output/TopicSuggesterOutput.jsx";

// export default function TopicSuggester() {
//   // Sample gaps
//   const [gaps] = useState([
//     { id: 1, title: "Data Integrity Concern", description: "Legacy module validation issues" },
//     { id: 2, title: "API Latency Peaks", description: "Observed during peak Q2 traffic" },
//     { id: 3, title: "Documentation Gap", description: "Missing CLI onboarding path" },
//   ]);

//   const [selectedGaps, setSelectedGaps] = useState([1, 2]);
//   const [extraInput, setExtraInput] = useState("");
//   const [topics, setTopics] = useState([]);

//   const runWorkflow = () => {
//     // For demo: generate topics from selectedGaps + extraInput
//     const newTopics = selectedGaps.map(id => ({
//       id,
//       title: gaps.find(g => g.id === id)?.title || `Extra Gap ${id}`,
//       brief: gaps.find(g => g.id === id)?.description || "Custom input",
//       summary: "This topic was generated based on selected gaps and additional input.",
//       points: ["Point A", "Point B", "Point C"]
//     }));

//     if (extraInput.trim()) {
//       newTopics.push({
//         id: new Date().getTime(),
//         title: extraInput,
//         brief: "User provided extra gap",
//         summary: "Custom user input topic",
//         points: ["User point 1", "User point 2"]
//       });
//     }

//     setTopics(newTopics);
//   };

//   return (
//     <div className="flex flex-col lg:flex-row gap-6 h-full">
//       <div className="lg:w-[380px]">
//         <TopicSuggesterInput
//           gaps={gaps}
//           selectedGaps={selectedGaps}
//           setSelectedGaps={setSelectedGaps}
//           extraInput={extraInput}
//           setExtraInput={setExtraInput}
//           onRun={runWorkflow}
//         />
//       </div>
//       <div className="flex-1">
//         {topics.length > 0 ? (
//           <TopicSuggesterOutput topics={topics} />
//         ) : (
//           <div className="flex items-center justify-center h-full text-[#617589] dark:text-[#94a3b8]">
//             No topics generated yet.
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }
