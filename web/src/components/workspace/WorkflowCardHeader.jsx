import React from "react";

export default function WorkflowCardHeader({ title, subtitle, rightContent }) {
  return (
    <div className="workflow-card-header">
      <div className="workflow-card-header-left">
        <h3 className="workflow-card-header-title">{title}</h3>
        {subtitle && (
          <p className="workflow-card-header-subtitle">
            {subtitle}
          </p>
        )}
      </div>
      {rightContent && (
        <div className="workflow-card-header-actions">
          {rightContent}
        </div>
      )}
    </div>
  );
}
