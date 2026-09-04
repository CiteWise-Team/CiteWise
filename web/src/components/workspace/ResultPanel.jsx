import SummarizerResult from "./output/SummarizerResult";
import ExtractorOutput from "./output/ExtractorOutput";
import GapExtractorOutput from "./output/GapOutput";
import TopicSuggesterOutput from "../workspace/output/TopicSuggesterOutput.jsx";
import SearcherOutput from "../workspace/output/SearcherOutput.jsx";
import IntegrationOutput from "./output/IntegrationOutput.jsx";
import SmartGoalsOutput from "./output/SmartGoalsOutput.jsx";

const STEP_INPUT_COMPONENTS = {
  extractor: ExtractorOutput,
  summarizer: SummarizerResult,
  gap: GapExtractorOutput,
  topic: TopicSuggesterOutput,
  "smart-goals": SmartGoalsOutput,
  search: SearcherOutput,
  integration: IntegrationOutput
};

export default function ResultPanel({ step, result }) {
  const Component = STEP_INPUT_COMPONENTS[step] || IntegrationOutput;
  return <Component result={result} />;
}