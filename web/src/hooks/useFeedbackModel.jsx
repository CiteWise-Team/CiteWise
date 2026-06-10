import { Modal } from "bootstrap";
import { useState } from "react";

export function useFeedbackModal() {
  const [config, setConfig] = useState({
    type: "success",
    title: "",
    message: "",
  });

  function showFeedback({ type, title, message }) {
    setConfig({ type, title, message });

    const modalEl = document.getElementById("feedbackModal");
    const modal =
      Modal.getInstance(modalEl) || new Modal(modalEl);

    modal.show();
  }

  return { config, showFeedback };
}
