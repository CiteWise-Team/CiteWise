package com.citewise.backend.controller;

import com.citewise.backend.dto.ApiResponse;
import com.citewise.backend.repository.UploadedDocumentRepository;
import com.citewise.backend.entity.UploadedDocument;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/documents")
public class DocumentApprovalController {

    private final UploadedDocumentRepository uploadedDocumentRepository;

    public DocumentApprovalController(UploadedDocumentRepository uploadedDocumentRepository) {
        this.uploadedDocumentRepository = uploadedDocumentRepository;
    }

    @PatchMapping("/{id}/approval")
    public ResponseEntity<ApiResponse<Map<String, Object>>> setApproval(
            @PathVariable Long id,
            @RequestHeader(value = "X-Session-Id", required = false) String sessionId,
            @RequestBody Map<String, String> body
    ) {
        UploadedDocument doc = uploadedDocumentRepository.findById(id).orElse(null);
        if (doc == null) {
            return ResponseEntity.notFound().build();
        }
        if (sessionId != null && !sessionId.isBlank() && !sessionId.equals(doc.getSessionId())) {
            return ResponseEntity.notFound().build();
        }
        String status = body.getOrDefault("status", "READY");
        boolean approved = "APPROVED".equalsIgnoreCase(status);
        doc.setApproved(approved);
        uploadedDocumentRepository.save(doc);

        // Return simple batchStats-like object to keep frontend happy
        Map<String, Object> batchStats = Map.of(
                "approvedCount", uploadedDocumentRepository.findBySessionIdAndApprovedTrue(doc.getSessionId()).size(),
                "averageScore", 0
        );

        return ResponseEntity.ok(new ApiResponse<>(true, "Approval updated", batchStats));
    }
}
