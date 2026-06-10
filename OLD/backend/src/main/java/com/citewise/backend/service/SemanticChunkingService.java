package com.citewise.backend.service;

import com.citewise.backend.entity.SemanticBaseline;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class SemanticChunkingService {
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private static final Pattern PARAGRAPH_SPLIT = Pattern.compile("\\r?\\n\\s*\\r?\\n+");
    private static final Pattern TOKEN_SPLIT = Pattern.compile("[^a-zA-Z0-9%]+");
    private static final Set<String> STOPWORDS = Set.of(
        "a", "an", "and", "are", "as", "at", "be", "but", "by", "for", "from",
        "has", "have", "he", "her", "his", "if", "in", "into", "is", "it", "its",
        "of", "on", "or", "our", "she", "such", "that", "the", "their", "them",
        "there", "these", "they", "this", "to", "was", "were", "with", "we", "you",
        "your", "not", "no", "yes", "can", "could", "should", "would", "may", "might",
        "will", "shall", "than", "then", "also", "more", "most", "some", "any", "all"
    );

    private static final List<String> GAP_TERMS = List.of(
        "gap", "gaps", "limitation", "limitations", "future work", "future-work", "open problem",
        "challenge", "underexplored", "lack", "scarce", "unknown"
    );
    private static final List<String> METHOD_TERMS = List.of(
        "method", "methods", "methodology", "evaluation", "metric", "metrics", "framework",
        "benchmark", "dataset", "experiment", "experimental", "analysis"
    );
    private static final List<String> THEORY_TERMS = List.of(
        "theory", "framework", "governance", "ethics", "bias", "integrity", "fairness",
        "accountability"
    );
    private static final List<String> CITATION_TERMS = List.of(
        "citation", "citations", "reference", "references", "doi", "journal", "conference",
        "proceedings", "bibliography", "et al"
    );
    private static final List<String> SECTION_TERMS = List.of(
        "abstract", "introduction", "background", "method", "methods", "methodology",
        "results", "discussion", "conclusion", "limitations", "future work"
    );

    private final int maxCharsToN8n;
    private final int maxChunks;
    private final int chunkSize;
    private final int chunkOverlap;

    @Autowired
    public SemanticChunkingService(
        @Value("${citewise.scoring.max-chars-to-n8n:9000}") int maxCharsToN8n,
        @Value("${citewise.scoring.max-chunks:6}") int maxChunks,
        @Value("${citewise.scoring.chunk-size:1000}") int chunkSize,
        @Value("${citewise.scoring.chunk-overlap:100}") int chunkOverlap
    ) {
        this.maxCharsToN8n = Math.max(1000, maxCharsToN8n);
        this.maxChunks = Math.max(1, maxChunks);
        this.chunkSize = Math.max(300, chunkSize);
        this.chunkOverlap = Math.max(0, Math.min(this.chunkSize - 50, chunkOverlap));
    }

    public String selectRelevantChunks(String fullText, SemanticBaseline baseline) {
        if (fullText == null) {
            return "";
        }

        String trimmed = fullText.trim();
        if (trimmed.isEmpty()) {
            return "";
        }

        BaselineSignals signals = buildBaselineSignals(baseline);
        List<Chunk> chunks = splitIntoParagraphs(trimmed);

        if (isWeakParagraphSplit(chunks)) {
            chunks = splitIntoSlidingChunks(trimmed, chunkSize, chunkOverlap);
        }

        if (chunks.isEmpty()) {
            return fallbackText(trimmed);
        }

        for (Chunk chunk : chunks) {
            chunk.score = scoreChunk(chunk.text, signals);
        }

        List<Chunk> selected = selectTopChunks(chunks, maxChunks);
        String output = renderChunks(selected, maxCharsToN8n);

        if (output.isBlank()) {
            return fallbackText(trimmed);
        }

        return output;
    }

    private BaselineSignals buildBaselineSignals(SemanticBaseline baseline) {
        String title = baseline != null ? safeText(baseline.getProjectTitle()) : "";
        String rationale = baseline != null ? safeText(baseline.getRationale()) : "";
        String gaps = baseline != null ? safeText(extractGapText(baseline.getResearchGaps())) : "";

        String combined = String.join(" ", title, rationale, gaps).trim();
        Set<String> keywords = tokenizeKeywords(combined);
        List<String> phrases = buildPhrases(title, gaps);

        return new BaselineSignals(keywords, phrases);
    }

    private String extractGapText(String gapsJson) {
        if (gapsJson == null || gapsJson.isBlank()) {
            return "";
        }
        try {
            JsonNode node = OBJECT_MAPPER.readTree(gapsJson);
            if (node.isArray()) {
                List<String> parts = new ArrayList<>();
                for (JsonNode gap : node) {
                    if (gap.isTextual()) {
                        parts.add(gap.asText());
                    } else if (gap.isObject()) {
                        String text = gap.path("gap").asText(
                            gap.path("description").asText(gap.path("text").asText("")));
                        if (!text.isBlank()) {
                            parts.add(text);
                        }
                    }
                }
                return String.join("; ", parts);
            }
        } catch (Exception ex) {
            // fall through to raw string
        }
        return gapsJson;
    }

    private Set<String> tokenizeKeywords(String text) {
        if (text == null || text.isBlank()) {
            return Collections.emptySet();
        }
        Set<String> tokens = new HashSet<>();
        for (String token : TOKEN_SPLIT.split(text.toLowerCase(Locale.ROOT))) {
            if (token.length() < 3) {
                continue;
            }
            if (STOPWORDS.contains(token)) {
                continue;
            }
            tokens.add(token);
        }
        return tokens;
    }

    private List<String> buildPhrases(String title, String gaps) {
        List<String> phrases = new ArrayList<>();
        addPhraseCandidates(phrases, title);
        addPhraseCandidates(phrases, gaps);
        return phrases;
    }

    private void addPhraseCandidates(List<String> phrases, String text) {
        if (text == null || text.isBlank()) {
            return;
        }
        String cleaned = text.toLowerCase(Locale.ROOT);
        for (String segment : cleaned.split("[\\.;:\\n]+")) {
            String trimmed = segment.trim();
            if (trimmed.isEmpty()) {
                continue;
            }
            String[] words = TOKEN_SPLIT.split(trimmed);
            List<String> filtered = new ArrayList<>();
            for (String word : words) {
                if (word.length() < 3 || STOPWORDS.contains(word)) {
                    continue;
                }
                filtered.add(word);
            }
            if (filtered.size() < 2) {
                continue;
            }
            int maxLen = Math.min(filtered.size(), 5);
            String phrase = String.join(" ", filtered.subList(0, maxLen));
            phrases.add(phrase);
        }
    }

    private List<Chunk> splitIntoParagraphs(String text) {
        String[] parts = PARAGRAPH_SPLIT.split(text);
        List<Chunk> chunks = new ArrayList<>();
        int order = 0;
        for (String part : parts) {
            String cleaned = normalizeWhitespace(part);
            if (cleaned.length() < 120) {
                continue;
            }
            chunks.add(new Chunk(order++, cleaned));
        }
        return chunks;
    }

    private boolean isWeakParagraphSplit(List<Chunk> chunks) {
        if (chunks.size() < 3) {
            return true;
        }
        int maxLength = 0;
        int totalLength = 0;
        for (Chunk chunk : chunks) {
            int len = chunk.text.length();
            totalLength += len;
            maxLength = Math.max(maxLength, len);
        }
        int avg = totalLength / Math.max(1, chunks.size());
        return maxLength > 4000 || avg > 2500;
    }

    private List<Chunk> splitIntoSlidingChunks(String text, int chunkSize, int overlap) {
        List<Chunk> chunks = new ArrayList<>();
        int order = 0;
        int start = 0;
        while (start < text.length()) {
            int end = Math.min(text.length(), start + chunkSize);
            String slice = normalizeWhitespace(text.substring(start, end));
            if (slice.length() > 80) {
                chunks.add(new Chunk(order++, slice));
            }
            if (end == text.length()) {
                break;
            }
            start = Math.max(0, end - overlap);
        }
        return chunks;
    }

    private int scoreChunk(String text, BaselineSignals signals) {
        String lower = text.toLowerCase(Locale.ROOT);
        int score = 0;

        int keywordMatches = 0;
        for (String keyword : signals.keywords) {
            if (lower.contains(keyword)) {
                keywordMatches += 1;
            }
        }
        score += keywordMatches * 2;

        int phraseMatches = 0;
        for (String phrase : signals.phrases) {
            if (phrase.length() > 6 && lower.contains(phrase)) {
                phraseMatches += 1;
            }
        }
        score += phraseMatches * 6;

        score += termMatches(lower, GAP_TERMS) * 2;
        score += termMatches(lower, METHOD_TERMS) * 2;
        score += termMatches(lower, THEORY_TERMS) * 2;
        score += termMatches(lower, CITATION_TERMS);
        score += termMatches(lower, SECTION_TERMS);

        return score;
    }

    private int termMatches(String text, List<String> terms) {
        int count = 0;
        for (String term : terms) {
            if (text.contains(term)) {
                count += 1;
            }
        }
        return count;
    }

    private List<Chunk> selectTopChunks(List<Chunk> chunks, int limit) {
        List<Chunk> sorted = new ArrayList<>(chunks);
        sorted.sort(Comparator
            .comparingInt((Chunk c) -> c.score)
            .reversed()
            .thenComparingInt(c -> c.order));

        List<Chunk> selected = new ArrayList<>();
        for (Chunk chunk : sorted) {
            selected.add(chunk);
            if (selected.size() >= limit) {
                break;
            }
        }

        selected.sort(Comparator.comparingInt(c -> c.order));
        return selected;
    }

    private String renderChunks(List<Chunk> chunks, int maxChars) {
        StringBuilder builder = new StringBuilder();
        int chunkIndex = 1;

        for (Chunk chunk : chunks) {
            String header = String.format(
                Locale.ROOT,
                "[CHUNK %d | original_order=%d | relevance_hint=%d]",
                chunkIndex,
                chunk.order,
                chunk.score
            );
            String payload = header + "\n" + chunk.text + "\n\n";

            if (builder.length() + payload.length() > maxChars) {
                if (builder.length() == 0) {
                    int remaining = Math.max(0, maxChars - header.length() - 1);
                    String clipped = chunk.text.length() > remaining
                        ? chunk.text.substring(0, remaining)
                        : chunk.text;
                    builder.append(header).append("\n").append(clipped);
                }
                break;
            }

            builder.append(payload);
            chunkIndex += 1;
        }

        return builder.toString().trim();
    }

    private String fallbackText(String text) {
        int limit = Math.min(text.length(), maxCharsToN8n);
        return text.substring(0, limit).trim();
    }

    private String normalizeWhitespace(String text) {
        return text == null ? "" : text.replaceAll("\\s+", " ").trim();
    }

    private String safeText(String value) {
        return value == null ? "" : value.trim();
    }

    private static class BaselineSignals {
        private final Set<String> keywords;
        private final List<String> phrases;

        private BaselineSignals(Set<String> keywords, List<String> phrases) {
            this.keywords = keywords;
            this.phrases = phrases;
        }
    }

    private static class Chunk {
        private final int order;
        private final String text;
        private int score;

        private Chunk(int order, String text) {
            this.order = order;
            this.text = text;
            this.score = 0;
        }
    }
}
