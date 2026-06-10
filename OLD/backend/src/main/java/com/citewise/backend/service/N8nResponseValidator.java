package com.citewise.backend.service;

import com.citewise.backend.entity.DocumentInsight;
import com.citewise.backend.entity.EvidenceExcerpt;

/**
 * Detects hardcoded test payloads returned by n8n instead of live AI output.
 */
public final class N8nResponseValidator {

    private static final String PLACEHOLDER_QUOTE = "Sample evidence from test";

    private N8nResponseValidator() {}

    public static boolean isPlaceholderRawJson(String rawJson) {
        return rawJson != null && rawJson.contains(PLACEHOLDER_QUOTE);
    }

    public static boolean isPlaceholderInsight(DocumentInsight insight) {
        if (insight == null || insight.getEvidenceExcerpts() == null) {
            return false;
        }
        for (EvidenceExcerpt excerpt : insight.getEvidenceExcerpts()) {
            String quote = excerpt.getQuoteText();
            if (quote != null && quote.contains(PLACEHOLDER_QUOTE)) {
                return true;
            }
        }
        return false;
    }
}
