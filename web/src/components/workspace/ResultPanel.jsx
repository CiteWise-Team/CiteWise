
import SummarizerResult from "./output/SummarizerResult";
import ExtractorOutput from "./output/ExtractorOutput";
import GapExtractorOutput from "./output/GapOutput";
import TopicSuggesterOutput from "../workspace/output/TopicSuggesterOutput.jsx";
import SearcherOutput from "../workspace/output/SearcherOutput.jsx";
const STEP_INPUT_COMPONENTS = {
  extractor: ExtractorOutput,
  summarizer: SummarizerResult,
  gap: GapExtractorOutput,
  topic: TopicSuggesterOutput,
  search: SearcherOutput
};

export default function ResultPanel({
  step,
  result,
  onComplete,
  isCollapsed,
  onToggleCollapse,
  isProcessing,
  processingStatus,
}) {
  const Component = STEP_INPUT_COMPONENTS[step];
  if (!Component) return null;
  return (
    <Component
      result={result}
      onComplete={onComplete}
      isCollapsed={isCollapsed}
      onToggleCollapse={onToggleCollapse}
      isProcessing={isProcessing}
      processingStatus={processingStatus}
    />
  );
}