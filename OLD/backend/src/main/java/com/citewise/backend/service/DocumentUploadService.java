package com.citewise.backend.service;

import java.io.IOException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
import java.util.concurrent.TimeUnit;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.encryption.InvalidPasswordException;
import org.apache.pdfbox.text.PDFTextStripper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.citewise.backend.dto.DocumentUploadResponse;
import com.citewise.backend.dto.DocumentUploadResult;
import com.citewise.backend.dto.NlpEvaluationRequest;
import com.citewise.backend.entity.DocumentInsight;
import com.citewise.backend.entity.SemanticBaseline;
import com.citewise.backend.entity.ScoringStatus;
import com.citewise.backend.entity.UploadedDocument;
import com.citewise.backend.repository.DocumentInsightRepository;
import com.citewise.backend.repository.SemanticBaselineRepository;
import com.citewise.backend.repository.UploadedDocumentRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.web.client.ResourceAccessException;

@Service
public class DocumentUploadService {
    private static final Logger logger = LoggerFactory.getLogger(DocumentUploadService.class);
    
    private final long maxFileSizeBytes;
    private final UploadedDocumentRepository uploadedDocumentRepository;
    private final DocumentInsightRepository documentInsightRepository;
    private final SemanticBaselineRepository semanticBaselineRepository;
    private final NLPMicroserviceClient nlpMicroserviceClient;
    private final RubricScoringEngine rubricScoringEngine;
    private final SemanticChunkingService semanticChunkingService;
    private final Executor aiScoringExecutor;
    private final Executor pdfParsingExecutor;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public DocumentUploadService(
            @Value("${rrl.max-file-size-mb:20}") int maxFileSizeMb,
            UploadedDocumentRepository uploadedDocumentRepository,
            DocumentInsightRepository documentInsightRepository,
            SemanticBaselineRepository semanticBaselineRepository,
            NLPMicroserviceClient nlpMicroserviceClient,
            RubricScoringEngine rubricScoringEngine,
            SemanticChunkingService semanticChunkingService,
            @Qualifier("aiScoringExecutor") Executor aiScoringExecutor,
            @Qualifier("pdfParsingExecutor") Executor pdfParsingExecutor) {
        this.maxFileSizeBytes = maxFileSizeMb * 1024L * 1024L;
        this.uploadedDocumentRepository = uploadedDocumentRepository;
        this.documentInsightRepository = documentInsightRepository;
        this.semanticBaselineRepository = semanticBaselineRepository;
        this.nlpMicroserviceClient = nlpMicroserviceClient;
        this.rubricScoringEngine = rubricScoringEngine;
        this.semanticChunkingService = semanticChunkingService;
        this.aiScoringExecutor = aiScoringExecutor;
        this.pdfParsingExecutor = pdfParsingExecutor;
    }

    public DocumentUploadResponse processUploads(String sessionId, List<MultipartFile> files) {
        long requestStartNs = System.nanoTime();
        logger.info("PERF documentId={} file={} stage={} elapsedMs={}", "n/a", "n/a", "upload_start", 0);
        if (files == null || files.isEmpty()) {
            return new DocumentUploadResponse(0, 0, 0, List.of());
        }

        List<DocumentUploadResult> results = new ArrayList<>(Collections.nCopies(files.size(), null));
        Set<String> seenHashes = new HashSet<>();
        int accepted = 0;
        List<CompletableFuture<IndexedResult>> parsingTasks = new ArrayList<>();

        for (int i = 0; i < files.size(); i++) {
            final int index = i;
            MultipartFile file = files.get(i);
            String fileName = safeFileName(file);
            long sizeBytes = file.getSize();

            if (file.isEmpty()) {
                results.set(index, new DocumentUploadResult(null, fileName, sizeBytes, false, "File is empty", 0));
                continue;
            }

            if (!isPdf(file, fileName)) {
                results.set(index, new DocumentUploadResult(null, fileName, sizeBytes, false, "Unsupported file type", 0));
                continue;
            }

            if (sizeBytes > maxFileSizeBytes) {
                results.set(index, new DocumentUploadResult(null, fileName, sizeBytes, false, "File exceeds size limit", 0));
                continue;
            }

            // Check if a file with the same name was already uploaded in this session
            if (uploadedDocumentRepository.existsBySessionIdAndFileName(sessionId, fileName)) {
                results.set(index, new DocumentUploadResult(null, fileName, sizeBytes, false, "File already uploaded previously", 0));
                continue;
            }

            byte[] data;
            try {
                long bytesStartNs = System.nanoTime();
                data = file.getBytes();
                logPerf(null, fileName, "file_bytes_read", bytesStartNs);
            } catch (IOException ex) {
                results.set(index, new DocumentUploadResult(null, fileName, sizeBytes, false, "Failed to read file", 0));
                continue;
            }

            String hash = hashFile(data);
            if (!seenHashes.add(hash)) {
                results.set(index, new DocumentUploadResult(null, fileName, sizeBytes, false, "Duplicate file in batch", 0));
                continue;
            }

            // Check against previously uploaded documents in the database
            if (uploadedDocumentRepository.existsBySessionIdAndFileHash(sessionId, hash)) {
                results.set(index, new DocumentUploadResult(null, fileName, sizeBytes, false, "File already uploaded previously", 0));
                continue;
            }
            parsingTasks.add(CompletableFuture.supplyAsync(
                () -> parseAndStoreDocument(sessionId, fileName, sizeBytes, hash, data, index),
                pdfParsingExecutor
            ));
        }

        for (CompletableFuture<IndexedResult> task : parsingTasks) {
            IndexedResult result = task.join();
            results.set(result.index, result.result);
            if (result.result != null && result.result.success()) {
                accepted += 1;
            }
        }

        logPerf(null, "n/a", "upload_complete", requestStartNs);
        return new DocumentUploadResponse(results.size(), accepted, results.size() - accepted, results);
    }

    public void analyzeDocumentAsync(UploadedDocument document) {
        analyzeDocumentAsync(document, false);
    }

    public void analyzeDocumentAsync(UploadedDocument document, boolean forceReassessment) {
        CompletableFuture.runAsync(() -> {
            UploadedDocument workingDocument = null;
            try {
                logger.info("Starting AI scoring pipeline for document ID: {}", document.getId());
                logPerf(document.getId(), document.getFileName(), "ai_pipeline_start", System.nanoTime());

                workingDocument = uploadedDocumentRepository.findById(document.getId())
                    .orElse(document);

                if (workingDocument.getScoringStatus() == ScoringStatus.PROCESSING) {
                    logger.info("AI scoring already processing for document {} — skipping duplicate request", document.getId());
                    return;
                }

                if (!forceReassessment) {
                    boolean hasInsight = documentInsightRepository.findByDocumentId(document.getId()).isPresent();
                    if (hasInsight) {
                        logger.info("AI scoring already completed for document {} — skipping duplicate request", document.getId());
                        return;
                    }
                } else {
                    documentInsightRepository.findByDocumentId(document.getId())
                        .ifPresent(documentInsightRepository::delete);
                }

                updateScoringStatus(workingDocument, ScoringStatus.PROCESSING, null, LocalDateTime.now(), null);

                SemanticBaseline baseline = loadBaseline(document.getSessionId());
                if (baseline == null) {
                    logger.warn(
                        "No research baseline found for session {} — skipping AI scoring for document {}. "
                        + "Import a CATalyst workspace for this session first.",
                        document.getSessionId(), document.getId());
                    updateScoringStatus(workingDocument, ScoringStatus.FAILED, "Missing semantic baseline", null, LocalDateTime.now());
                    return;
                }

                String fullText = workingDocument.getParsedText();
                long chunkingStartNs = System.nanoTime();
                String selectedText = semanticChunkingService.selectRelevantChunks(fullText, baseline);
                logPerf(workingDocument.getId(), workingDocument.getFileName(), "chunking", chunkingStartNs);
                int fullLength = fullText != null ? fullText.length() : 0;
                int selectedLength = selectedText != null ? selectedText.length() : 0;
                logger.info(
                    "Semantic scoring payload reduced for document {} from {} chars to {} chars",
                    document.getId(), fullLength, selectedLength
                );

                NlpEvaluationRequest request = new NlpEvaluationRequest(
                    selectedText,
                    baseline.getProjectTitle() != null ? baseline.getProjectTitle() : "",
                    baseline.getRationale() != null ? baseline.getRationale() : "",
                    parseGapsToString(baseline.getResearchGaps())
                );

                logger.info("Calling n8n for document ID: {}", document.getId());
                String rawResponse = nlpMicroserviceClient.evaluateDocumentRaw(request, document.getId());

                if (rawResponse != null) {
                    long parseStartNs = System.nanoTime();
                    DocumentInsight insight = rubricScoringEngine.parseAIResponse(rawResponse, document.getId());
                    logPerf(workingDocument.getId(), workingDocument.getFileName(), "rubric_parse", parseStartNs);
                    if (insight != null) {
                        // If n8n provided an explicit overall score, keep it ahead of any backend fallback.
                        try {
                            JsonNode rootNode = objectMapper.readTree(rawResponse);
                            // look for overall in common names and nested containers
                            Double providedOverall = null;
                            for (String name : new String[]{"overall", "overallScore", "overall_score"}) {
                                JsonNode n = rootNode.path(name);
                                if (!n.isMissingNode() && !n.isNull() && (n.isNumber() || n.isTextual())) {
                                    try {
                                        double v = n.isNumber() ? n.asDouble() : Double.parseDouble(n.asText());
                                        providedOverall = v;
                                        break;
                                    } catch (NumberFormatException ex) {
                                        // ignore and continue
                                    }
                                }
                            }
                            if (providedOverall == null) {
                                for (String container : new String[]{"scores", "meta", "analysis", "result", "data"}) {
                                    JsonNode containerNode = rootNode.path(container);
                                    if (containerNode != null && containerNode.isObject()) {
                                        for (String name : new String[]{"overall", "overallScore", "overall_score"}) {
                                            JsonNode n = containerNode.path(name);
                                            if (!n.isMissingNode() && !n.isNull() && (n.isNumber() || n.isTextual())) {
                                                try {
                                                    double v = n.isNumber() ? n.asDouble() : Double.parseDouble(n.asText());
                                                    providedOverall = v;
                                                    break;
                                                } catch (NumberFormatException ex) {
                                                    // ignore
                                                }
                                            }
                                        }
                                    }
                                    if (providedOverall != null) break;
                                }
                            }

                            if (providedOverall != null) {
                                // normalize 0-1 to 0-100
                                double normalized = providedOverall;
                                if (normalized > 0 && normalized <= 1.0) normalized = normalized * 100.0;
                                if (Double.isNaN(normalized) || normalized < 0) normalized = 0.0;
                                if (normalized > 100) normalized = 100.0;
                                insight.setOverallScore(normalized);
                                // avoid exposing legacy averageOverallScore beside the n8n score
                                insight.setAverageOverallScore(null);
                            }
                        } catch (Exception ex) {
                            logger.debug("Could not extract provided overall score from n8n response", ex);
                        }
                        long saveStartNs = System.nanoTime();
                        documentInsightRepository.findByDocumentId(document.getId())
                            .ifPresent(documentInsightRepository::delete);
                        documentInsightRepository.save(insight);
                        logPerf(workingDocument.getId(), workingDocument.getFileName(), "insight_save", saveStartNs);
                        updateScoringStatus(workingDocument, ScoringStatus.COMPLETE, null, null, LocalDateTime.now());
                        int excerptCount = insight.getEvidenceExcerpts() != null
                            ? insight.getEvidenceExcerpts().size() : 0;
                        logger.info(
                            "Saved n8n insights for document {} — gap={}, methodology={}, theoretical={}, citation={}, overall={}, recommendation={}, confidence={}, relevance={}, excerpts={}",
                            document.getId(),
                            insight.getGapAlignmentScore(),
                            insight.getMethodologyScore(),
                            insight.getTheoreticalScore(),
                            insight.getCitationScore(),
                            insight.getOverallScore(),
                            insight.getRecommendationStatus(),
                            insight.getConfidenceLevel(),
                            insight.getRelevanceLevel(),
                            excerptCount
                        );
                    } else {
                        updateScoringStatus(workingDocument, ScoringStatus.FAILED, "Empty insight response", null, LocalDateTime.now());
                    }
                } else {
                    logger.warn(
                        "No insights saved for document {} — n8n response was empty, placeholder, or Code node returned {{}}. "
                        + "In Code node use: const raw = item.output ?? item.text; and Respond: ={{ JSON.stringify($json) }}",
                        document.getId()
                    );
                    updateScoringStatus(workingDocument, ScoringStatus.FAILED, "Empty n8n response", null, LocalDateTime.now());
                }
            } catch (ResourceAccessException ex) {
                ScoringStatus status = isTimeoutException(ex) ? ScoringStatus.TIMEOUT : ScoringStatus.FAILED;
                updateScoringStatus(workingDocument != null ? workingDocument : document,
                    status, abbreviateError(ex.getMessage()), null, LocalDateTime.now());
                logger.error("AI scoring pipeline failed for document {}: {}", document.getId(), ex.getMessage(), ex);
            } catch (Exception e) {
                updateScoringStatus(workingDocument != null ? workingDocument : document,
                    ScoringStatus.FAILED, abbreviateError(e.getMessage()), null, LocalDateTime.now());
                logger.error("AI scoring pipeline failed for document {}: {}", document.getId(), e.getMessage(), e);
            }
        }, aiScoringExecutor);
    }

    private IndexedResult parseAndStoreDocument(String sessionId,
                                                String fileName,
                                                long sizeBytes,
                                                String hash,
                                                byte[] data,
                                                int index) {
        long extractStartNs = System.nanoTime();
        try (PDDocument document = Loader.loadPDF(data)) {
            PDFTextStripper stripper = new PDFTextStripper();
            String rawText = stripper.getText(document);
            logPerf(null, fileName, "pdf_extract", extractStartNs);
            String text = sanitizeExtractedText(rawText);
            int rawLength = rawText == null ? 0 : rawText.length();
            int sanitizedLength = text.length();
            if (rawLength != sanitizedLength) {
                logger.info("Sanitized extracted text for file {} from {} chars to {} chars", fileName, rawLength, sanitizedLength);
            }
            int charCount = text == null ? 0 : text.trim().length();

            if (charCount == 0) {
                return new IndexedResult(index, new DocumentUploadResult(null, fileName, sizeBytes, false, "No extractable text", 0));
            }

            UploadedDocument entity = new UploadedDocument();
            entity.setSessionId(sessionId);
            entity.setFileName(fileName);
            entity.setFileHash(hash);
            entity.setSizeBytes(sizeBytes);
            entity.setCharacterCount(charCount);
            entity.setUploadedAt(LocalDateTime.now());
            entity.setParsedText(text);
            entity.setScoringStatus(ScoringStatus.PENDING);
            entity.setScoringErrorMessage(null);
            entity.setScoringStartedAt(null);
            entity.setScoringCompletedAt(null);

            long saveStartNs = System.nanoTime();
            entity = uploadedDocumentRepository.save(entity);
            logPerf(entity.getId(), fileName, "document_save", saveStartNs);

            long enqueueStartNs = System.nanoTime();
            analyzeDocumentAsync(entity);
            logPerf(entity.getId(), fileName, "ai_enqueue", enqueueStartNs);

            return new IndexedResult(index, new DocumentUploadResult(entity.getId(), fileName, sizeBytes, true, "Parsed successfully; AI scoring queued", charCount));
        } catch (InvalidPasswordException ex) {
            logPerf(null, fileName, "pdf_extract_failed", extractStartNs);
            return new IndexedResult(index, new DocumentUploadResult(null, fileName, sizeBytes, false, "Encrypted PDF", 0));
        } catch (IOException ex) {
            logPerf(null, fileName, "pdf_extract_failed", extractStartNs);
            return new IndexedResult(index, new DocumentUploadResult(null, fileName, sizeBytes, false, "Unable to extract text", 0));
        } catch (Exception ex) {
            logPerf(null, fileName, "pdf_upload_failed", extractStartNs);
            logger.error("Failed to parse or save uploaded PDF {}: {}", fileName, ex.getMessage(), ex);
            return new IndexedResult(index, new DocumentUploadResult(null, fileName, sizeBytes, false, "Upload failed: " + abbreviateError(ex.getMessage()), 0));
        }
    }

    private String sanitizeExtractedText(String text) {
        if (text == null) {
            return "";
        }
        return text
            .replace("\u0000", "")
            .replaceAll("[\\p{Cntrl}&&[^\r\n\t]]", " ")
            .replaceAll("[\\uFFFE\\uFFFF]", "")
            .replaceAll("[ \\t\\x0B\\f]+", " ")
            .replaceAll("\\r\\n?", "\n")
            .replaceAll("\\n{3,}", "\n\n")
            .trim();
    }

    private void logPerf(Long documentId, String fileName, String stage, long startNs) {
        long elapsedMs = startNs <= 0 ? 0 : TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startNs);
        logger.info("PERF documentId={} file={} stage={} elapsedMs={}", documentId, fileName, stage, elapsedMs);
    }

    private static class IndexedResult {
        private final int index;
        private final DocumentUploadResult result;

        private IndexedResult(int index, DocumentUploadResult result) {
            this.index = index;
            this.result = result;
        }
    }

    private void updateScoringStatus(UploadedDocument document,
                                     ScoringStatus status,
                                     String errorMessage,
                                     LocalDateTime startedAt,
                                     LocalDateTime completedAt) {
        if (document == null) {
            return;
        }
        document.setScoringStatus(status);
        if (startedAt != null) {
            document.setScoringStartedAt(startedAt);
        }
        if (completedAt != null) {
            document.setScoringCompletedAt(completedAt);
        }
        if (errorMessage != null) {
            document.setScoringErrorMessage(errorMessage);
        } else if (status == ScoringStatus.PROCESSING || status == ScoringStatus.COMPLETE) {
            document.setScoringErrorMessage(null);
        }
        uploadedDocumentRepository.save(document);
    }

    private boolean isTimeoutException(Throwable throwable) {
        if (throwable == null) {
            return false;
        }
        String message = throwable.getMessage();
        if (message != null && message.toLowerCase(Locale.ROOT).contains("timed out")) {
            return true;
        }
        Throwable cause = throwable.getCause();
        return cause != null && isTimeoutException(cause);
    }

    private String abbreviateError(String message) {
        if (message == null || message.isBlank()) {
            return "Unexpected error";
        }
        String cleaned = message.replaceAll("\\s+", " ").trim();
        if (cleaned.length() <= 280) {
            return cleaned;
        }
        return cleaned.substring(0, 277) + "...";
    }

    private SemanticBaseline loadBaseline(String sessionId) {
        if (sessionId == null || sessionId.isBlank()) {
            return null;
        }
        try {
            return semanticBaselineRepository
                .findFirstBySessionIdOrderByCreatedAtDesc(UUID.fromString(sessionId))
                .orElse(null);
        } catch (IllegalArgumentException ex) {
            logger.warn("Session ID '{}' is not a valid UUID", sessionId);
            return null;
        }
    }

    private String parseGapsToString(String researchGapsJson) {
        if (researchGapsJson == null || researchGapsJson.isBlank()) {
            return "";
        }
        try {
            JsonNode node = objectMapper.readTree(researchGapsJson);
            if (node.isArray()) {
                List<String> gaps = new ArrayList<>();
                for (JsonNode gap : node) {
                    if (gap.isTextual()) {
                        gaps.add(gap.asText());
                    } else if (gap.isObject()) {
                        String text = gap.path("gap").asText(
                            gap.path("description").asText(gap.path("text").asText("")));
                        if (!text.isBlank()) {
                            gaps.add(text);
                        }
                    }
                }
                return String.join("; ", gaps);
            }
            return researchGapsJson;
        } catch (Exception ex) {
            return researchGapsJson;
        }
    }

    private boolean isPdf(MultipartFile file, String fileName) {
        String contentType = file.getContentType();
        return (contentType != null && contentType.equalsIgnoreCase("application/pdf")) || 
               fileName.toLowerCase(Locale.ROOT).endsWith(".pdf");
    }

    private String safeFileName(MultipartFile file) {
        String fileName = file.getOriginalFilename();
        return fileName == null || fileName.isBlank() ? "unnamed.pdf" : fileName;
    }

    private String hashFile(byte[] data) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(data);
            StringBuilder builder = new StringBuilder(hash.length * 2);
            for (byte b : hash) builder.append(String.format(Locale.ROOT, "%02x", b));
            return builder.toString();
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("Hashing failed", ex);
        }
    }
}
