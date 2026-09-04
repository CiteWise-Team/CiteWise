import { useCallback, useState } from "react";

export function useFeedbackModal() {
  const [config, setConfig] = useState({
    isOpen: false,
    type: "success",
    title: "",
    message: "",
  });

  const showFeedback = useCallback(({ type, title, message }) => {
    setConfig({ isOpen: true, type, title, message });
  }, []);

  const hideFeedback = useCallback(() => {
    setConfig((prev) => ({ ...prev, isOpen: false }));
  }, []);

  return { config, showFeedback, hideFeedback };
}
