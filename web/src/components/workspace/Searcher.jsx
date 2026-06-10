export default function Searcher() {
  
  const [keywords, setKeywords] = useState([
    "Infrastructure Resilience",
    "API Latency Solutions",
    "WebSocket Scalability",
  ]);
  const [instructions, setInstructions] = useState("");
  const [results, setResults] = useState([]);

  const runSearch = () => {
    // ✅ Temporary mock results
    setResults([
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
    ]);
  };

  console.log("SearcherInput props:", { keywords, instructions });
  console.log("SearcherOutput props:", { results });
  return (
    <div className="row g-4 h-100">
      <div className="col-lg-4">
        <SearcherInput
          keywords={keywords}
          setKeywords={setKeywords}
          instructions={instructions}
          setInstructions={setInstructions}
          onRun={runSearch}
        />
      </div>

      <div className="col-lg-8">
        <SearcherOutput results={results} />
      </div>
    </div>
  );
}