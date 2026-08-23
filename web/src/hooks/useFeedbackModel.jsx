import { useState } from "react";

export function useFeedbackModal() {
  const [config, setConfig] = useState({
    isOpen: false,
    type: "success",
    title: "",
    message: "",
  });

  function showFeedback({ type, title, message }) {
    setConfig({ isOpen: true, type, title, message });
  }

  function hideFeedback() {
    setConfig((prev) => ({ ...prev, isOpen: false }));
  }

  return { config, showFeedback, hideFeedback };
}
