import { useRef, useState } from "react";
import { FaCloudUploadAlt } from "react-icons/fa";

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
      className="workflow-upload-dropzone citewise-upload-dropzone rounded-4 text-center p-3"
      style={{
        border: "2px dashed #ea580c",
        borderRadius: "16px",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.25rem",
        padding: "1.75rem 1rem",
        transition: "all 0.2s ease",
        height: "100%",
        minHeight: "190px",
        boxSizing: "border-box",
        textAlign: "center",
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleBrowse}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        multiple
        onChange={handleFileSelect}
        style={{ display: "none" }}
        onClick={(e) => e.stopPropagation()}
      />
      <FaCloudUploadAlt size={34} color="#ea580c" />

      <h6
        className="fw-bold mt-2 mb-1"
        style={{
          color: "var(--cw-text-primary, #0f0e17)",
          fontSize: "0.95rem",
          fontFamily: "'Poppins', sans-serif",
          margin: "8px 0 2px",
        }}
      >
        Ready to upload?
      </h6>

      <p
        style={{
          color: "var(--cw-text-muted, #4b5563)",
          fontSize: "0.8rem",
          marginBottom: "10px",
          fontFamily: "'Poppins', sans-serif",
        }}
      >
        Drop PDF files or click to browse
      </p>

      <button
        type="button"
        className="workflow-action-button"
        style={{ marginTop: "4px" }}
        onClick={(e) => {
          e.stopPropagation();
          handleBrowse();
        }}
      >
        Upload File
      </button>
    </div>
  );
}