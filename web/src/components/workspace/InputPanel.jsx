import ExtractorInput from "./input/ExtractorInput.jsx";
import SummarizerInput from "./input/SummarizerInput.jsx";
import GapInput from "./input/GapInput.jsx";
import TopicSuggesterInput from "./input/TopicSuggesterInput.jsx";
import SearcherInput from "./input/SearcherInput.jsx";
const STEP_INPUT_COMPONENTS = {
  extractor: ExtractorInput,
  summarizer: SummarizerInput,
  gap: GapInput,
  topic: TopicSuggesterInput,
  search : SearcherInput
};

export default function InputPanel({ step, setResult }) {
  const Component = STEP_INPUT_COMPONENTS[step];
  return <Component setResult = {setResult} />;
}

