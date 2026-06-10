package com.citewise.backend.module3.service;

import com.citewise.backend.entity.DocumentInsight;
import com.citewise.backend.entity.SemanticBaseline;
import com.citewise.backend.entity.UploadedDocument;
import com.citewise.backend.entity.EvidenceExcerpt;
import com.citewise.backend.module3.dto.CitationMetadata;
import com.citewise.backend.repository.DocumentInsightRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.UUID;

@Service
public class SynthesisN8nClient {

    private static final Logger log = LoggerFactory.getLogger(SynthesisN8nClient.class);

    private final RestTemplate restTemplate;
    private final CitationMetadataExtractor citationMetadataExtractor;
    private final DocumentInsightRepository documentInsightRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${n8n.synthesis.webhook.url:http://localhost:5678/webhook/citewise-synthesizer-v2}")
    private String synthesisWebhookUrl;

    public SynthesisN8nClient(
            RestTemplate restTemplate,
            CitationMetadataExtractor citationMetadataExtractor,
            DocumentInsightRepository documentInsightRepository) {
        this.restTemplate = restTemplate;
        this.citationMetadataExtractor = citationMetadataExtractor;
        this.documentInsightRepository = documentInsightRepository;
    }

    public JsonNode callSynthesisWebhook(UUID sessionId, SemanticBaseline baseline, List<TieredSynthesisDocument> documents) {
        return callSynthesisWebhook(sessionId, baseline, documents, null);
    }

    public JsonNode callSynthesisWebhook(UUID sessionId, SemanticBaseline baseline, List<TieredSynthesisDocument> documents, String chosenGap) {
        try {
            ObjectNode payload = objectMapper.createObjectNode();
            payload.put("sessionId", sessionId.toString());
            payload.put("synthesisInstructions",
                "The CATalyst Title, Rationale, and Research Gap are the primary source of truth. "
                + "Approved documents are supplementary. Use Core Sources as the main evidence, "
                + "Supporting Sources cautiously, Tangential Sources only for brief background, "
                + "and Excluded Sources not at all. Do not let a low-relevance approved document redirect the topic. "
                + "The primaryFocusGap is the user's selected gap and should be treated as the main structural narrative pivot. "
                + "The remaining gaps provide supporting context.");

            // Build baseline node
            ObjectNode baselineNode = objectMapper.createObjectNode();
            String normalizedChosenGap = normalizeChosenGap(chosenGap);
            if (baseline != null) {
                baselineNode.put("title", baseline.getProjectTitle() != null ? baseline.getProjectTitle() : "");
                baselineNode.put("rationale", baseline.getRationale() != null ? baseline.getRationale() : "");
                ArrayNode gapsArray = baselineNode.putArray("gaps");
                if (baseline.getResearchGaps() != null && !baseline.getResearchGaps().isBlank()) {
                    try {
                        JsonNode gapsNode = objectMapper.readTree(baseline.getResearchGaps());
                        if (gapsNode.isArray()) {
                            for (JsonNode gap : gapsNode) {
                                if (gap.isTextual()) {
                                    gapsArray.add(gap.asText());
                                } else if (gap.isObject()) {
                                    String text = gap.path("description").asText(
                                        gap.path("gap").asText(gap.path("text").asText(gap.toString()))
                                    );
                                    gapsArray.add(text);
                                }
                            }
                        } else {
                            gapsArray.add(baseline.getResearchGaps());
                        }
                    } catch (Exception e) {
                        log.warn("Could not parse researchGaps JSON, using raw string: {}", e.getMessage());
                        gapsArray.add(baseline.getResearchGaps());
                    }
                }
            }
            if (normalizedChosenGap != null) {
                baselineNode.put("primaryFocusGap", normalizedChosenGap);
                baselineNode.put("chosenGap", normalizedChosenGap);
            }
            payload.set("baseline", baselineNode);

            // Build approvedDocuments array - prefer canonical fields required by the v2 workflow
            ArrayNode docsArray = objectMapper.createArrayNode();
            ObjectNode tierSummary = objectMapper.createObjectNode();
            tierSummary.put("core", documents.stream().filter(d -> d.tier() == SourceTier.CORE).count());
            tierSummary.put("supporting", documents.stream().filter(d -> d.tier() == SourceTier.SUPPORTING).count());
            tierSummary.put("tangential", documents.stream().filter(d -> d.tier() == SourceTier.TANGENTIAL).count());
            payload.set("sourceTierSummary", tierSummary);

            for (TieredSynthesisDocument tieredDocument : documents) {
                UploadedDocument doc = tieredDocument.document();
                if (doc == null || doc.getParsedText() == null || doc.getParsedText().isBlank()) continue;
                ObjectNode docNode = objectMapper.createObjectNode();
                // documentId as string
                if (doc.getId() != null) docNode.put("documentId", String.valueOf(doc.getId()));
                docNode.put("filename", doc.getFileName() != null ? doc.getFileName() : "");
                docNode.put("extracted_text", doc.getParsedText());
                docNode.put("sourceTier", tieredDocument.tier().payloadValue());
                docNode.put("sourceUseGuidance", tieredDocument.tier().guidance());
                DocumentInsight insight = fetchInsightWithExcerpts(doc, tieredDocument.insight());
                addInsightFields(docNode, insight);

                CitationMetadata citation = citationMetadataExtractor.extract(doc.getFileName(), doc.getParsedText());
                log.info(
                    "Citation metadata extracted for documentId={} filename={} arxivId={} doi={} authorDisplay={} authors={} year={} title={} source={} reliable={} warnings={}",
                    doc.getId(),
                    doc.getFileName(),
                    citation.getArxivId(),
                    citation.getDoi(),
                    citation.getAuthorDisplay(),
                    citation.getAuthors(),
                    citation.getYear(),
                    citation.getTitle(),
                    citation.getJournal(),
                    citation.isMetadataReliable(),
                    citation.getWarnings()
                );

                ObjectNode meta = objectMapper.createObjectNode();
                if (citation.getAuthorDisplay() != null && !citation.getAuthorDisplay().isBlank()) {
                    meta.put("author", citation.getAuthorDisplay());
                    meta.put("authorDisplay", citation.getAuthorDisplay());
                } else {
                    meta.putNull("author");
                    meta.putNull("authorDisplay");
                }
                meta.set("authors", objectMapper.valueToTree(citation.getAuthors() != null ? citation.getAuthors() : List.of()));
                if (citation.getYear() != null) {
                    meta.put("year", citation.getYear());
                } else {
                    meta.putNull("year");
                }
                if (citation.getTitle() != null && !citation.getTitle().isBlank()) {
                    meta.put("title", citation.getTitle());
                } else {
                    meta.putNull("title");
                }
                meta.put("journal", citation.getJournal() != null ? citation.getJournal() : "");
                meta.put("volume", citation.getVolume() != null ? citation.getVolume() : "");
                meta.put("issue", citation.getIssue() != null ? citation.getIssue() : "");
                meta.put("pages", citation.getPages() != null ? citation.getPages() : "");
                meta.put("doi", citation.getDoi() != null ? citation.getDoi() : "");
                meta.put("url", citation.getUrl() != null ? citation.getUrl() : "");
                meta.put("arxivId", citation.getArxivId() != null ? citation.getArxivId() : "");
                meta.put("publisher", citation.getPublisher() != null ? citation.getPublisher() : "");
                meta.put("sourceType", citation.getSourceType() != null ? citation.getSourceType() : "");
                meta.put("metadataReliable", citation.isMetadataReliable());
                meta.set("warnings", objectMapper.valueToTree(citation.getWarnings() != null ? citation.getWarnings() : List.of()));

                docNode.set("metadata", meta);
                docsArray.add(docNode);
            }
            payload.set("approvedDocuments", docsArray);

            String jsonPayload = objectMapper.writeValueAsString(payload);
            log.info("Calling synthesis webhook: {} (sessionId={}, docs={})", synthesisWebhookUrl, sessionId, docsArray.size());

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setConnection("close");
            HttpEntity<String> entity = new HttpEntity<>(jsonPayload, headers);

            String jsonResponse = restTemplate.postForObject(synthesisWebhookUrl, entity, String.class);
            if (jsonResponse == null || jsonResponse.isBlank()) {
                throw new RuntimeException("Synthesis webhook returned empty response");
            }

            log.info("Synthesis webhook response received ({} chars)", jsonResponse.length());
            JsonNode root = objectMapper.readTree(jsonResponse);
            if (root.isArray() && !root.isEmpty()) {
                root = root.get(0);
            }
            for (String field : new String[]{"output", "body", "data", "json", "result"}) {
                JsonNode nested = root.path(field);
                if (nested.isObject()) {
                    root = nested;
                    break;
                }
                if (nested.isTextual()) {
                    root = objectMapper.readTree(nested.asText());
                    break;
                }
            }
            return root;
        } catch (Exception e) {
            log.error("Synthesis webhook call failed: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to call synthesis webhook: " + e.getMessage(), e);
        }
    }

    private String normalizeChosenGap(String chosenGap) {
        if (chosenGap == null || chosenGap.isBlank()) {
            return null;
        }
        return chosenGap.trim();
    }

    private DocumentInsight fetchInsightWithExcerpts(UploadedDocument doc, DocumentInsight fallback) {
        if (doc == null || doc.getId() == null) {
            return fallback;
        }
        return documentInsightRepository.findByDocumentIdWithExcerpts(doc.getId()).orElse(fallback);
    }

    private void addInsightFields(ObjectNode docNode, DocumentInsight insight) {
        if (insight == null) {
            return;
        }
        if (insight.getOverallScore() != null) {
            docNode.put("overallScore", insight.getOverallScore());
        }
        if (insight.getRecommendationStatus() != null) {
            docNode.put("recommendationStatus", insight.getRecommendationStatus());
        }
        if (insight.getConfidenceLevel() != null) {
            docNode.put("confidenceLevel", insight.getConfidenceLevel());
        }
        if (insight.getRelevanceLevel() != null) {
            docNode.put("relevanceLevel", insight.getRelevanceLevel());
        }
        if (insight.getMismatchFlagsJson() != null) {
            docNode.put("mismatchFlagsJson", insight.getMismatchFlagsJson());
        }
        if (insight.getWeaknessFlagsJson() != null) {
            docNode.put("weaknessFlagsJson", insight.getWeaknessFlagsJson());
        }
        docNode.set("mismatchFlags", parseJsonArray(insight.getMismatchFlagsJson()));
        docNode.set("weaknessFlags", parseJsonArray(insight.getWeaknessFlagsJson()));

        ObjectNode scores = objectMapper.createObjectNode();
        putScore(scores, "gapAlignment", insight.getGapAlignmentScore());
        putScore(scores, "methodology", insight.getMethodologyScore());
        putScore(scores, "theory", insight.getTheoreticalScore());
        putScore(scores, "citationQuality", insight.getCitationScore());
        putScore(scores, "overall", insight.getOverallScore());
        docNode.set("scores", scores);

        ArrayNode evidenceArray = docNode.putArray("evidenceExcerpts");
        if (insight.getEvidenceExcerpts() == null) {
            return;
        }
        for (EvidenceExcerpt excerpt : insight.getEvidenceExcerpts()) {
            ObjectNode excerptNode = objectMapper.createObjectNode();
            excerptNode.put("quoteText", excerpt.getQuoteText() != null ? excerpt.getQuoteText() : "");
            if (excerpt.getPageNumber() != null) {
                excerptNode.put("pageNumber", excerpt.getPageNumber());
            }
            excerptNode.put("relevanceLevel", excerpt.getRelevanceLevel() != null ? excerpt.getRelevanceLevel() : "");
            excerptNode.put("criterion", excerpt.getCriterion() != null ? excerpt.getCriterion() : "");
            excerptNode.put("evidenceType", excerpt.getEvidenceType() != null ? excerpt.getEvidenceType() : "");
            if (excerpt.getDisplayOrder() != null) {
                excerptNode.put("displayOrder", excerpt.getDisplayOrder());
            }
            evidenceArray.add(excerptNode);
        }
    }

    private void putScore(ObjectNode node, String field, Double score) {
        if (score != null) {
            node.put(field, score);
        }
    }

    private ArrayNode parseJsonArray(String json) {
        ArrayNode array = objectMapper.createArrayNode();
        if (json == null || json.isBlank()) {
            return array;
        }
        try {
            JsonNode parsed = objectMapper.readTree(json);
            if (parsed.isArray()) {
                for (JsonNode item : parsed) {
                    array.add(item.isTextual() ? item.asText() : item.toString());
                }
            }
        } catch (Exception e) {
            for (String flag : json.split("\\s*,\\s*|\\s*;\\s*")) {
                if (!flag.isBlank()) {
                    array.add(flag.trim());
                }
            }
        }
        return array;
    }

    public enum SourceTier {
        CORE("Core Source", "Use as main synthesis evidence."),
        SUPPORTING("Supporting Source", "Use cautiously as supporting evidence."),
        TANGENTIAL("Tangential Source", "Do not center the generated introduction on this source; use only for broad background if needed."),
        EXCLUDED("Excluded Source", "Do not include this document text as synthesis evidence.");

        private final String payloadValue;
        private final String guidance;

        SourceTier(String payloadValue, String guidance) {
            this.payloadValue = payloadValue;
            this.guidance = guidance;
        }

        public String payloadValue() {
            return payloadValue;
        }

        public String guidance() {
            return guidance;
        }
    }

    public record TieredSynthesisDocument(UploadedDocument document, DocumentInsight insight, SourceTier tier) {
    }
}
