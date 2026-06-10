package com.citewise.backend.dto;

public record DocumentUploadResult(
    Long documentId,
    String fileName,
    long sizeBytes,
    boolean success,
    String message,
    int extractedCharacters
) {}
