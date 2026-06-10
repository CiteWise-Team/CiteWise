package com.citewise.backend.controller;

import com.citewise.backend.dto.ApiResponse;
import com.citewise.backend.dto.DocumentUploadResponse;
import com.citewise.backend.service.DocumentUploadService;
import java.util.List;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/rrl")
public class DocumentUploadController {
    private final DocumentUploadService documentUploadService;

    public DocumentUploadController(DocumentUploadService documentUploadService) {
        this.documentUploadService = documentUploadService;
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<DocumentUploadResponse>> uploadDocuments(
        @RequestHeader(value = "X-Session-Id", required = false) String sessionId,
        @RequestParam("files") List<MultipartFile> files
    ) {
        if (sessionId == null || sessionId.isBlank()) {
            return ResponseEntity.badRequest()
                .body(new ApiResponse<>(false, "Session ID is required", null));
        }

        if (files == null || files.isEmpty()) {
            return ResponseEntity.badRequest()
                .body(new ApiResponse<>(false, "At least one PDF is required", null));
        }

        DocumentUploadResponse response = documentUploadService.processUploads(sessionId, files);
        boolean anySuccess = response.acceptedFiles() > 0;
        String message = anySuccess
            ? (response.failedFiles() > 0 ? "Upload completed with issues" : "Upload completed")
            : "No valid files were uploaded";

        return ResponseEntity.ok(new ApiResponse<>(anySuccess, message, response));
    }
}
