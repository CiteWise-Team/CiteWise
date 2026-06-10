package com.citewise.backend.dto;

import java.util.List;

public record DocumentUploadResponse(
    int totalFiles,
    int acceptedFiles,
    int failedFiles,
    List<DocumentUploadResult> results
) {}
