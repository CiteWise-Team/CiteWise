package com.citewise.backend.dto;

import java.util.ArrayList;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonAlias;

public class DocumentInsightDto {
    private Long documentId;
    private String filename;

    public static class Scores {
        @JsonProperty("gapAlignment")
        public Double gapAlignment;

        @JsonProperty("methodology")
        public Double methodology;

        // Serialize as `theoretical` for frontend, accept aliases for backward compatibility
        @JsonProperty("theoretical")
        @JsonAlias({"theory","theoreticalScore","theoryScore"})
        public Double theory;

        // Serialize as `citation` for frontend, accept legacy names
        @JsonProperty("citation")
        @JsonAlias({"citationQuality","citationScore"})
        public Double citationQuality;

        @JsonProperty("overall")
        public Double overall;
    }

    private Scores scores = new Scores();

    private Double gapAlignmentScore;
    private Double methodologyScore;
    private Double theoreticalScore;
    private Double citationScore;
    private Double overallScore;

    private String recommendationStatus;
    private String confidenceLevel;
    private String relevanceLevel;

    private List<String> mismatchFlags = new ArrayList<>();
    private List<String> weaknessFlags = new ArrayList<>();
    private List<String> validationFlags = new ArrayList<>();

    private List<EvidenceExcerptDto> evidenceExcerpts = new ArrayList<>();

    public static class EvidenceExcerptDto {
        public String criterion;
        public String quoteText;
        public Integer pageNumber;
        public String relevanceLevel;
        public String evidenceType;
        public Integer displayOrder;
    }

    public DocumentInsightDto() {}

    // getters and setters
    public Long getDocumentId() { return documentId; }
    public void setDocumentId(Long documentId) { this.documentId = documentId; }

    public String getFilename() { return filename; }
    public void setFilename(String filename) { this.filename = filename; }

    public Scores getScores() { return scores; }
    public void setScores(Scores scores) { this.scores = scores; }

    public Double getGapAlignmentScore() { return gapAlignmentScore; }
    public void setGapAlignmentScore(Double gapAlignmentScore) { this.gapAlignmentScore = gapAlignmentScore; }

    public Double getMethodologyScore() { return methodologyScore; }
    public void setMethodologyScore(Double methodologyScore) { this.methodologyScore = methodologyScore; }

    public Double getTheoreticalScore() { return theoreticalScore; }
    public void setTheoreticalScore(Double theoreticalScore) { this.theoreticalScore = theoreticalScore; }

    public Double getCitationScore() { return citationScore; }
    public void setCitationScore(Double citationScore) { this.citationScore = citationScore; }

    @JsonProperty("overallScore")
    public Double getOverallScore() { return overallScore; }
    public void setOverallScore(Double overallScore) { this.overallScore = overallScore; }

    @JsonProperty("recommendationStatus")
    public String getRecommendationStatus() { return recommendationStatus; }
    public void setRecommendationStatus(String recommendationStatus) { this.recommendationStatus = recommendationStatus; }

    @JsonProperty("confidenceLevel")
    public String getConfidenceLevel() { return confidenceLevel; }
    public void setConfidenceLevel(String confidenceLevel) { this.confidenceLevel = confidenceLevel; }

    @JsonProperty("relevanceLevel")
    public String getRelevanceLevel() { return relevanceLevel; }
    public void setRelevanceLevel(String relevanceLevel) { this.relevanceLevel = relevanceLevel; }

    @JsonProperty("mismatchFlags")
    public List<String> getMismatchFlags() { return mismatchFlags; }
    public void setMismatchFlags(List<String> mismatchFlags) { this.mismatchFlags = mismatchFlags == null ? new ArrayList<>() : mismatchFlags; }

    @JsonProperty("weaknessFlags")
    public List<String> getWeaknessFlags() { return weaknessFlags; }
    public void setWeaknessFlags(List<String> weaknessFlags) { this.weaknessFlags = weaknessFlags == null ? new ArrayList<>() : weaknessFlags; }

    @JsonProperty("validationFlags")
    public List<String> getValidationFlags() { return validationFlags; }
    public void setValidationFlags(List<String> validationFlags) { this.validationFlags = validationFlags == null ? new ArrayList<>() : validationFlags; }

    @JsonProperty("evidenceExcerpts")
    public List<EvidenceExcerptDto> getEvidenceExcerpts() { return evidenceExcerpts; }
    public void setEvidenceExcerpts(List<EvidenceExcerptDto> evidenceExcerpts) { this.evidenceExcerpts = evidenceExcerpts == null ? new ArrayList<>() : evidenceExcerpts; }
}
