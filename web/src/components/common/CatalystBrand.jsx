import React from "react";

export default function CatalystBrand({ className = "", catColor = "#ea580c", restColor = "inherit", style = {} }) {
  return (
    <span className={`catalyst-brand ${className}`} style={{ fontWeight: "inherit", ...style }}>
      <span style={{ color: catColor }}>CAT</span>
      <span style={{ color: restColor }}>alyst</span>
    </span>
  );
}
