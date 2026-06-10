package com.citewise.backend.controller;

import com.citewise.backend.dto.DocumentSummaryDto;
import com.citewise.backend.dto.ApiResponse;
import com.citewise.backend.entity.DocumentInsight;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import com.citewise.backend.dto.DocumentInsightDto;
import com.citewise.backend.dto.DocumentInsightDto.EvidenceExcerptDto;
import com.citewise.backend.entity.UploadedDocument;
import java.util.Locale;
import com.citewise.backend.repository.DocumentInsightRepository;
import com.citewise.backend.repository.UploadedDocumentRepository;
import com.citewise.backend.service.DocumentUploadService;
import com.citewise.backend.service.N8nResponseValidator;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/documents")
@CrossOrigin(origins = "*")
public class DocumentAnalysisController {

    private static final Logger logger = LoggerFactory.getLogger(DocumentAnalysisController.class);

    private final DocumentInsightRepository documentInsightRepository;
    private final UploadedDocumentRepository uploadedDocumentRepository;
    private final DocumentUploadService documentUploadService;
    private static final double WEIGHT_GAP = 0.35;
    private static final double WEIGHT_METHOD = 0.30;
    private static final double WEIGHT_THEORY = 0.20;
    private static final double WEIGHT_CITATION = 0.15;

    public DocumentAnalysisController(
        DocumentInsightRepository documentInsightRepository,
        UploadedDocumentRepository uploadedDocumentRepository,
        DocumentUploadService documentUploadService
    ) {
        this.documentInsightRepository = documentInsightRepository;
        this.uploadedDocumentRepository = uploadedDocumentRepository;
        this.documentUploadService = documentUploadService;
    }

    @GetMapping("/{id}/insights")
    @Transactional
    public ResponseEntity<DocumentInsightDto> getDocumentInsights(
        @PathVariable("id") Long id,
        @RequestHeader(value = "X-Session-Id", required = false) String sessionId
    ) {
        if (!documentBelongsToSession(id, sessionId)) {
            return ResponseEntity.notFound().build();
        }
        return documentInsightRepository.findByDocumentIdWithExcerpts(id)
                .map(insight -> {
                    if (N8nResponseValidator.isPlaceholderInsight(insight)) {
                        documentInsightRepository.delete(insight);
                        return ResponseEntity.notFound().<DocumentInsightDto>build();
                    }

                    DocumentInsightDto dto = new DocumentInsightDto();
                    dto.setDocumentId(insight.getDocumentId());
                    dto.setGapAlignmentScore(insight.getGapAlignmentScore());
                    dto.setMethodologyScore(insight.getMethodologyScore());
                    dto.setTheoreticalScore(insight.getTheoreticalScore());
                    dto.setCitationScore(insight.getCitationScore());
                    dto.setOverallScore(insight.getOverallScore() != null ? insight.getOverallScore() : insight.getAverageOverallScore());
                    DocumentInsightDto.Scores s = new DocumentInsightDto.Scores();
                    s.gapAlignment = dto.getGapAlignmentScore();
                    s.methodology = dto.getMethodologyScore();
                    s.theory = dto.getTheoreticalScore();
                    s.citationQuality = dto.getCitationScore();
                    s.overall = dto.getOverallScore();
                    dto.setScores(s);

                    dto.setRecommendationStatus(insight.getRecommendationStatus());
                    dto.setConfidenceLevel(insight.getConfidenceLevel());
                    dto.setRelevanceLevel(insight.getRelevanceLevel());

                    // set filename if available
                    uploadedDocumentRepository.findById(insight.getDocumentId()).ifPresent(u -> dto.setFilename(u.getFileName()));

                    // flags JSON -> arrays
                    try {
                        ObjectMapper mapper = new ObjectMapper();
                        List<String> mismatch = mapper.readValue(insight.getMismatchFlagsJson() == null ? "[]" : insight.getMismatchFlagsJson(), mapper.getTypeFactory().constructCollectionType(List.class, String.class));
                        List<String> weakness = mapper.readValue(insight.getWeaknessFlagsJson() == null ? "[]" : insight.getWeaknessFlagsJson(), mapper.getTypeFactory().constructCollectionType(List.class, String.class));
                        List<String> validation = mapper.readValue(insight.getValidationFlagsJson() == null ? "[]" : insight.getValidationFlagsJson(), mapper.getTypeFactory().constructCollectionType(List.class, String.class));
                        dto.setMismatchFlags(mismatch);
                        dto.setWeaknessFlags(weakness);
                        dto.setValidationFlags(validation);
                    } catch (Exception e) {
                        dto.setMismatchFlags(List.of());
                        dto.setWeaknessFlags(List.of());
                        dto.setValidationFlags(List.of());
                    }

                    if (insight.getEvidenceExcerpts() != null) {
                        List<EvidenceExcerptDto> exDtos = new java.util.ArrayList<>();
                        for (var ex : insight.getEvidenceExcerpts()) {
                            EvidenceExcerptDto ed = new EvidenceExcerptDto();
                            ed.criterion = ex.getCriterion();
                            ed.quoteText = ex.getQuoteText();
                            ed.pageNumber = ex.getPageNumber();
                            ed.relevanceLevel = ex.getRelevanceLevel();
                            ed.evidenceType = ex.getEvidenceType();
                            ed.displayOrder = ex.getDisplayOrder();
                            exDtos.add(ed);
                        }
                        dto.setEvidenceExcerpts(exDtos);
                    }

                    logger.debug(
                        "Returning insight docId={} recommendation={} confidence={} relevance={} overall={} flags(mismatch/weakness/validation)={}/{}/{} excerpts={}",
                        insight.getDocumentId(),
                        insight.getRecommendationStatus(),
                        insight.getConfidenceLevel(),
                        insight.getRelevanceLevel(),
                        insight.getOverallScore(),
                        dto.getMismatchFlags() != null ? dto.getMismatchFlags().size() : 0,
                        dto.getWeaknessFlags() != null ? dto.getWeaknessFlags().size() : 0,
                        dto.getValidationFlags() != null ? dto.getValidationFlags().size() : 0,
                        dto.getEvidenceExcerpts() != null ? dto.getEvidenceExcerpts().size() : 0
                    );

                    return ResponseEntity.ok(dto);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Returns all documents for a session with their insight scores.
     * Used by the frontend sidebar to display uploaded RRLs with relevancy scores.
     */
    @GetMapping("/session/{sessionId}")
    public ResponseEntity<List<DocumentSummaryDto>> getSessionDocuments(
        @PathVariable("sessionId") String sessionId,
        @RequestHeader(value = "X-Session-Id", required = false) String headerSessionId
    ) {
        if (headerSessionId != null && !headerSessionId.isBlank() && !headerSessionId.equals(sessionId)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        logger.debug("Session documents request sessionId={}", sessionId);
        
        List<UploadedDocument> documents = uploadedDocumentRepository.findBySessionId(sessionId);
        
        logger.debug("Found {} documents for session", documents.size());
        
        List<DocumentSummaryDto> summaries = new ArrayList<>();

        for (UploadedDocument doc : documents) {
            // FIXED: Changed from findByDocumentId to findByDocumentIdWithExcerpts
            Optional<DocumentInsight> insightOpt = documentInsightRepository.findByDocumentIdWithExcerpts(doc.getId());

            if (insightOpt.isPresent()) {
                DocumentInsight insight = insightOpt.get();
                double gap = insight.getGapAlignmentScore() != null ? insight.getGapAlignmentScore() : 0;
                double method = insight.getMethodologyScore() != null ? insight.getMethodologyScore() : 0;
                double theory = insight.getTheoreticalScore() != null ? insight.getTheoreticalScore() : 0;
                double citation = insight.getCitationScore() != null ? insight.getCitationScore() : 0;
                double relevancy = insight.getOverallScore() != null
                    ? insight.getOverallScore()
                    : calculateOverallScore(gap, method, theory, citation);

                DocumentSummaryDto summary = new DocumentSummaryDto(
                        doc.getId(), doc.getFileName(), doc.getSizeBytes(),
                    "complete", relevancy, gap, method, theory, citation, doc.isApproved()
                );
                summary.setRecommendationStatus(insight.getRecommendationStatus());
                summary.setRelevanceLevel(insight.getRelevanceLevel());
                summaries.add(summary);
            } else {
                String status = "processing";
                if (doc.getScoringStatus() != null) {
                    status = doc.getScoringStatus().name().toLowerCase(Locale.ROOT);
                }
                summaries.add(new DocumentSummaryDto(
                        doc.getId(), doc.getFileName(), doc.getSizeBytes(),
                    status, null, null, null, null, null, doc.isApproved()
                ));
            }
        }

        return ResponseEntity.ok(summaries);
    }

    private double calculateOverallScore(double gap, double method, double theory, double citation) {
        return (gap * WEIGHT_GAP) + (method * WEIGHT_METHOD) + (theory * WEIGHT_THEORY) + (citation * WEIGHT_CITATION);
    }

    @PostMapping("/{id}/assess")
    public ResponseEntity<ApiResponse<String>> assessDocument(
        @PathVariable("id") Long id,
        @RequestHeader(value = "X-Session-Id", required = false) String sessionId
    ) {
        UploadedDocument document = uploadedDocumentRepository.findById(id).orElse(null);
        if (document == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ApiResponse<>(false, "Document not found", null));
        }
        if (!matchesSession(document, sessionId)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ApiResponse<>(false, "Document not found", null));
        }

        String parsedText = document.getParsedText();
        if (parsedText == null || parsedText.isBlank()) {
            return ResponseEntity.badRequest()
                .body(new ApiResponse<>(false, "Document text is empty", null));
        }

        documentUploadService.analyzeDocumentAsync(document, true);
        return ResponseEntity.ok(new ApiResponse<>(true, "Assessment queued", "queued"));
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Void> deleteDocument(
        @PathVariable("id") Long id,
        @RequestHeader(value = "X-Session-Id", required = false) String sessionId
    ) {
        UploadedDocument document = uploadedDocumentRepository.findById(id).orElse(null);
        if (document == null || !matchesSession(document, sessionId)) {
            return ResponseEntity.notFound().build();
        }
        
        // FIXED: Changed from findByDocumentId to findByDocumentIdWithExcerpts
        documentInsightRepository.findByDocumentIdWithExcerpts(id).ifPresent(documentInsightRepository::delete);
        
        uploadedDocumentRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    private boolean documentBelongsToSession(Long documentId, String sessionId) {
        if (sessionId == null || sessionId.isBlank()) {
            return true;
        }
        return uploadedDocumentRepository.findById(documentId)
            .map(document -> matchesSession(document, sessionId))
            .orElse(false);
    }

    private boolean matchesSession(UploadedDocument document, String sessionId) {
        return sessionId == null || sessionId.isBlank() || sessionId.equals(document.getSessionId());
    }
}
