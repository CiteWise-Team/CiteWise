import { useRef, useState } from "react";

function CloudUploadIcon() {
  return (
    <svg
      width="56"
      height="40"
      viewBox="0 0 56 40"
      fill="none"
      style={{ marginBottom: "0.75rem", transition: "transform 0.3s ease" }}
      className="cloud-icon"
    >
      {/* Cloud body */}
      <path
        d="M40 12.5C40 5.6 34.4 0 27.5 0C22.1 0 17.5 3.4 15.7 8.3C6.9 9.3 0 16.8 0 25.8C0 33.6 6.4 40 14.2 40H38.7C48.3 40 56 32.3 56 22.7C56 14.1 48.9 12.7 40 12.5Z"
        fill="#8a8278"
      />
      {/* Upward pointing arrow inside the cloud */}
      <path
        d="M28 13L19 22H24V32H32V22H37L28 13Z"
        fill="#f0ece6"
      />
    </svg>
  );
}

export default function DragDropZone({ onFilesAdded }) {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    onFilesAdded(e.dataTransfer.files);
  };
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);
  const handleBrowse = () => fileInputRef.current?.click();
  const handleFileSelect = (e) => onFilesAdded(e.target.files);

  return (
    <div
      style={{
        border: `1.5px dashed ${isDragging ? "#D85A30" : "#3A3630"}`,
        borderRadius: "12px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.4rem",
        padding: "2rem 1rem",
        cursor: "pointer",
        transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        minHeight: "200px",
        textAlign: "center",
        background: isDragging ? "rgba(216, 90, 48, 0.05)" : "rgba(0, 0, 0, 0.15)",
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleBrowse}
      onMouseEnter={(e) => {
        if (!isDragging) {
          e.currentTarget.style.borderColor = "#D85A30";
          const icon = e.currentTarget.querySelector(".cloud-icon");
          if (icon) icon.style.transform = "translateY(-3px)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isDragging) {
          e.currentTarget.style.borderColor = "#3A3630";
          const icon = e.currentTarget.querySelector(".cloud-icon");
          if (icon) icon.style.transform = "translateY(0)";
        }
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        multiple
        onChange={handleFileSelect}
        style={{ display: "none" }}
      />
      <CloudUploadIcon />
      <p
        style={{
          fontSize: "0.95rem",
          fontWeight: 600,
          color: "#f0ece6",
          margin: 0,
          fontFamily: "'Poppins', sans-serif",
        }}
      >
        Drop PDF files here or click to browse
      </p>
      <small
        style={{
          fontSize: "0.75rem",
          color: "rgba(240, 236, 230, 0.4)",
          margin: 0,
          fontFamily: "'Poppins', sans-serif",
        }}
      >
        Multiple files supported
      </small>
    </div>
  );
}