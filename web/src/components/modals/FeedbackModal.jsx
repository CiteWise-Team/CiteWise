import React from "react";
import ModernToast from "../ui/ModernToast";

/**
 * FeedbackModal
 * Redesigned to render CiteWise/CATalyst's unified modern floating toast system
 * instead of the old-style blocking Bootstrap modal.
 */
export default function FeedbackModal({ isOpen, type = "success", title, message, onClose }) {
  return (
    <ModernToast
      show={Boolean(isOpen)}
      type={type}
      title={title}
      message={message}
      onClose={onClose}
      duration={type === "error" || type === "failed" ? 4800 : 3800}
    />
  );
}
