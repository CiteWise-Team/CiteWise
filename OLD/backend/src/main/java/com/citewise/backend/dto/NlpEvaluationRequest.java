package com.citewise.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class NlpEvaluationRequest {
    @JsonProperty("extracted_text")
    private String extractedText;

    private Baseline baseline;

    public NlpEvaluationRequest() {}

    public NlpEvaluationRequest(String extractedText, String title, String rationale, String gaps) {
        this.extractedText = extractedText;
        this.baseline = new Baseline(title, rationale, gaps);
    }

    public String getExtractedText() { return extractedText; }
    public void setExtractedText(String extractedText) { this.extractedText = extractedText; }

    public Baseline getBaseline() { return baseline; }
    public void setBaseline(Baseline baseline) { this.baseline = baseline; }

    public static class Baseline {
        private String title;
        private String rationale;
        private String gaps;

        public Baseline() {}

        public Baseline(String title, String rationale, String gaps) {
            this.title = title;
            this.rationale = rationale;
            this.gaps = gaps;
        }

        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }

        public String getRationale() { return rationale; }
        public void setRationale(String rationale) { this.rationale = rationale; }

        public String getGaps() { return gaps; }
        public void setGaps(String gaps) { this.gaps = gaps; }
    }
}
