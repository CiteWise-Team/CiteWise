package com.citewise.backend.module3.service;

import com.citewise.backend.entity.SemanticBaseline;
import com.citewise.backend.entity.UploadedDocument;
import com.citewise.backend.module3.dto.SynthesisResponseDto;
import com.citewise.backend.module3.entity.GeneratedDraft;
import com.citewise.backend.module3.repository.GeneratedDraftRepository;
import com.citewise.backend.repository.DocumentInsightRepository;
import com.citewise.backend.repository.SemanticBaselineRepository;
import com.citewise.backend.repository.UploadedDocumentRepository;
import com.citewise.backend.entity.DocumentInsight;
import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class RAGSynthesisService {

    private static final Logger log = LoggerFactory.getLogger(RAGSynthesisService.class);

    private final GeneratedDraftRepository draftRepository;
    private final UploadedDocumentRepository documentRepository;
    private final DocumentInsightRepository documentInsightRepository;
    private final SemanticBaselineRepository baselineRepository;
    private final SynthesisN8nClient synthesisN8nClient;

    public RAGSynthesisService(
        GeneratedDraftRepository draftRepository,
        UploadedDocumentRepository documentRepository,
        DocumentInsightRepository documentInsightRepository,
        SemanticBaselineRepository baselineRepository,
        SynthesisN8nClient synthesisN8nClient
    ) {
        this.draftRepository = draftRepository;
        this.documentRepository = documentRepository;
        this.documentInsightRepository = documentInsightRepository;
        this.baselineRepository = baselineRepository;
        this.synthesisN8nClient = synthesisN8nClient;
    }

    @Transactional
    public SynthesisResponseDto orchestrateDrafting(UUID sessionId) {
        return orchestrateDrafting(sessionId, null);
    }

    @Transactional
    public SynthesisResponseDto orchestrateDrafting(UUID sessionId, String chosenGap) {
        log.info("RAGSynthesisService orchestrating drafting for session: {}", sessionId);

        SemanticBaseline baseline = baselineRepository
            .findFirstBySessionIdOrderByCreatedAtDesc(sessionId)
            .orElse(null);

        if (baseline == null) {
            log.warn("No semantic baseline found for session {}", sessionId);
        }

        // Only include user-approved documents
        List<UploadedDocument> approvedDocs = documentRepository.findBySessionIdAndApprovedTrue(sessionId.toString());
        List<UploadedDocument> docsWithText = approvedDocs.stream()
            .filter(d -> d.getParsedText() != null && !d.getParsedText().isBlank())
            .toList();

        if (docsWithText.isEmpty()) {
            return SynthesisResponseDto.builder()
                .sessionId(sessionId)
                .success(false)
                .message("Approve at least one document before generating an introduction.")
                .build();
        }

        List<SynthesisN8nClient.TieredSynthesisDocument> tieredDocs = docsWithText.stream()
            .map(this::toTieredDocument)
            .toList();
        List<SynthesisN8nClient.TieredSynthesisDocument> usableDocs = tieredDocs.stream()
            .filter(doc -> doc.tier() != SynthesisN8nClient.SourceTier.EXCLUDED)
            .toList();

        if (usableDocs.isEmpty()) {
            long excludedCount = tieredDocs.stream()
                .filter(doc -> doc.tier() == SynthesisN8nClient.SourceTier.EXCLUDED)
                .count();
            return SynthesisResponseDto.builder()
                .sessionId(sessionId)
                .success(false)
                .status("NO_RELEVANT_SOURCES")
                .message("No sufficiently relevant approved sources are available for synthesis. Review the approved documents in Module 2 and approve at least one source with fair, good, or excellent relevance to the CATalyst baseline.")
                .meta(Map.of(
                    "approvedDocumentCount", docsWithText.size(),
                    "excludedSourceCount", excludedCount
                ))
                .build();
        }

        JsonNode n8nResponse = synthesisN8nClient.callSynthesisWebhook(sessionId, baseline, usableDocs, chosenGap);

        String contentText = n8nResponse.path("contentText").asText("");
        String referencesText = n8nResponse.path("referencesText").asText("");
        boolean success = n8nResponse.path("success").asBoolean(false);
        String message = n8nResponse.path("message").asText("");

        String validationStatus = n8nResponse.path("validationStatus").asText("");
        List<String> validationFlags = new ArrayList<>();
        if (n8nResponse.has("validationFlags") && n8nResponse.get("validationFlags").isArray()) {
            n8nResponse.get("validationFlags").forEach(n -> validationFlags.add(n.asText()));
        }

        // On validation failure, do not save as completed draft
        if (!success || (validationStatus != null && !validationStatus.isBlank() && !"PASSED".equalsIgnoreCase(validationStatus))) {
            log.info("Synthesis failed or validation failed: success={}, validationStatus={}", success, validationStatus);
            SynthesisResponseDto resp = SynthesisResponseDto.builder()
                .sessionId(sessionId)
                .success(false)
                .status(validationStatus == null || validationStatus.isBlank() ? "VALIDATION_FAILED" : validationStatus)
                .message(message == null || message.isBlank() ? "Synthesis failed or validation failed" : message)
                .validationFlags(validationFlags)
                .sectionsPreview(null)
                .metrics(null)
                .retryRecommended(n8nResponse.path("retryRecommended").asBoolean(false))
                .errorMessage(n8nResponse.path("errorMessage").asText(null))
                .build();
            return resp;
        }

        // Replace any existing draft for this session
        draftRepository.deleteBySessionId(sessionId);

        GeneratedDraft draft = GeneratedDraft.builder()
            .sessionId(sessionId)
            .contentText(contentText)
            .referencesText(referencesText)
            .backgroundText(n8nResponse.path("sections").path("background").asText(null))
            .rationaleText(n8nResponse.path("sections").path("rationale").asText(null))
            .gapText(n8nResponse.path("sections").path("gap").asText(null))
            .validationStatus(n8nResponse.path("validationStatus").asText(null))
            .validationFlagsJson(n8nResponse.has("validationFlags") ? n8nResponse.path("validationFlags").toString() : "[]")
            .unsupportedClaimFlagsJson(n8nResponse.has("unsupportedClaimFlags") ? n8nResponse.path("unsupportedClaimFlags").toString() : "[]")
            .metricsJson(n8nResponse.has("metrics") ? n8nResponse.path("metrics").toString() : "{}")
            .citationsUsedJson(n8nResponse.has("citationsUsed") ? n8nResponse.path("citationsUsed").toString() : "[]")
            .build();

        draft = draftRepository.save(draft);

        // Build response
        SynthesisResponseDto resp = SynthesisResponseDto.builder()
            .draftId(draft.getId())
            .sessionId(sessionId)
            .contentText(contentText)
            .referencesText(referencesText)
            .sections(n8nResponse.has("sections") ? n8nResponse.path("sections") : null)
            .citationsUsed(n8nResponse.has("citationsUsed") ? objectNodeToList(n8nResponse.path("citationsUsed")) : List.of())
            .validationStatus(draft.getValidationStatus())
            .validationFlags(validationFlags)
            .metrics(n8nResponse.has("metrics") ? n8nResponse.path("metrics") : null)
            .createdAt(draft.getCreatedAt())
            .success(true)
            .message(message)
            .build();

        log.info("Saved synthesized draft {} for session {} (approvedDocs={}, usableDocs={})", draft.getId(), sessionId, docsWithText.size(), usableDocs.size());
        return resp;
    }

    private SynthesisN8nClient.TieredSynthesisDocument toTieredDocument(UploadedDocument document) {
        DocumentInsight insight = documentInsightRepository.findByDocumentIdWithExcerpts(document.getId()).orElse(null);
        SynthesisN8nClient.SourceTier tier = determineSourceTier(insight);
        return new SynthesisN8nClient.TieredSynthesisDocument(document, insight, tier);
    }

    private SynthesisN8nClient.SourceTier determineSourceTier(DocumentInsight insight) {
        Double overallScore = insight != null ? insight.getOverallScore() : null;
        String recommendationStatus = insight != null ? insight.getRecommendationStatus() : null;
        String relevanceLevel = insight != null ? insight.getRelevanceLevel() : null;
        String mismatchFlagsJson = insight != null ? insight.getMismatchFlagsJson() : null;

        if (scoreBelow(overallScore, 40)
            || equalsIgnoreCase(recommendationStatus, "Low Relevance")
            || equalsIgnoreCase(relevanceLevel, "Low")
            || containsFlag(mismatchFlagsJson, "TOPIC_MISMATCH")) {
            return SynthesisN8nClient.SourceTier.EXCLUDED;
        }

        if (scoreAtLeast(overallScore, 75)
            || equalsIgnoreCase(recommendationStatus, "Recommended")
            || equalsIgnoreCase(relevanceLevel, "High")) {
            return SynthesisN8nClient.SourceTier.CORE;
        }

        if (scoreInRange(overallScore, 60, 75)
            || equalsIgnoreCase(recommendationStatus, "Needs Review")
            || equalsIgnoreCase(relevanceLevel, "Medium")) {
            return SynthesisN8nClient.SourceTier.SUPPORTING;
        }

        if (scoreInRange(overallScore, 40, 60)) {
            return SynthesisN8nClient.SourceTier.TANGENTIAL;
        }

        return SynthesisN8nClient.SourceTier.SUPPORTING;
    }

    private boolean scoreBelow(Double score, double threshold) {
        return score != null && score < threshold;
    }

    private boolean scoreAtLeast(Double score, double threshold) {
        return score != null && score >= threshold;
    }

    private boolean scoreInRange(Double score, double minInclusive, double maxExclusive) {
        return score != null && score >= minInclusive && score < maxExclusive;
    }

    private boolean equalsIgnoreCase(String value, String expected) {
        return value != null && expected.equalsIgnoreCase(value.trim());
    }

    private boolean containsFlag(String flagsJson, String flag) {
        return flagsJson != null && flagsJson.toUpperCase(Locale.ROOT).contains(flag);
    }

    public ResponseEntity<byte[]> exportDraft(UUID draftId, String format) {
        Optional<GeneratedDraft> draftOpt = draftRepository.findById(draftId);
        if (draftOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        GeneratedDraft draft = draftOpt.get();
        String fullContent = draft.getContentText() != null ? draft.getContentText() : "";
        if (draft.getReferencesText() != null && !draft.getReferencesText().isBlank()) {
            fullContent += "\n\nReferences\n" + draft.getReferencesText();
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
        headers.setContentDispositionFormData("attachment", "draft_" + draftId + "." + format.toLowerCase());

        return ResponseEntity.ok().headers(headers).body(fullContent.getBytes());
    }

    private List<String> objectNodeToList(JsonNode node) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return List.of();
        }
        List<String> out = new ArrayList<>();
        if (node.isArray()) {
            node.forEach(n -> out.add(n.isTextual() ? n.asText() : n.toString()));
            return out;
        }
        // single object or value
        out.add(node.isTextual() ? node.asText() : node.toString());
        return out;
    }
}
