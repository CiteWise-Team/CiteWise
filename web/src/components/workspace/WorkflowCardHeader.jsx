import React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export default function WorkflowCardHeader({
  title,
  subtitle,
  rightContent,
  isCollapsed = false,
  onToggleCollapse,
}) {
  return (
    <div
      className={`workflow-card-header ${onToggleCollapse ? "is-collapsible" : ""}`}
      onClick={onToggleCollapse ? () => onToggleCollapse() : undefined}
      style={{
        cursor: onToggleCollapse ? "pointer" : "default",
        userSelect: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
      }}
    >
      <div className="workflow-card-header-left" style={{ minWidth: 0, flex: 1 }}>
        <h3 className="workflow-card-header-title">{title}</h3>
        {subtitle && (
          <p className="workflow-card-header-subtitle">
            {subtitle}
          </p>
        )}
      </div>
      <div
        className="workflow-card-header-right"
        style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}
      >
        {rightContent && (
          <div
            className="workflow-card-header-actions"
            onClick={(e) => e.stopPropagation()}
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            {rightContent}
          </div>
        )}
        {onToggleCollapse && (
          <span
            className="workflow-card-collapse-icon cw-collapse-chevron"
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapse();
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--cw-text-muted, #6b7280)",
              cursor: "pointer",
              background: "transparent",
              border: "none",
              boxShadow: "none",
              padding: 0,
              margin: 0,
              flexShrink: 0,
            }}
            title={isCollapsed ? "Expand panel" : "Minimize panel"}
          >
            {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </span>
        )}
      </div>
    </div>
  );
}
