package com.citewise.backend.entity;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;

@Entity
@Table(name = "document_insights")
public class DocumentInsight {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long documentId;

    private Double gapAlignmentScore;
    private Double methodologyScore;
    private Double theoreticalScore;
    private Double citationScore;
    private Double averageOverallScore;
    private Double overallScore;

    private String recommendationStatus;
    private String confidenceLevel;
    private String relevanceLevel;

    @Column(columnDefinition = "TEXT")
    private String mismatchFlagsJson;

    @Column(columnDefinition = "TEXT")
    private String weaknessFlagsJson;

    @Column(columnDefinition = "TEXT")
    private String validationFlagsJson;

    @Column(columnDefinition = "TEXT")
    private String rawAiResponseJson;

    private LocalDateTime generatedAt;

    @OneToMany(mappedBy = "documentInsight", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<EvidenceExcerpt> evidenceExcerpts = new ArrayList<>();

    public DocumentInsight() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getDocumentId() { return documentId; }
    public void setDocumentId(Long documentId) { this.documentId = documentId; }

    public Double getGapAlignmentScore() { return gapAlignmentScore; }
    public void setGapAlignmentScore(Double gapAlignmentScore) { this.gapAlignmentScore = gapAlignmentScore; }

    public Double getMethodologyScore() { return methodologyScore; }
    public void setMethodologyScore(Double methodologyScore) { this.methodologyScore = methodologyScore; }

    public Double getTheoreticalScore() { return theoreticalScore; }
    public void setTheoreticalScore(Double theoreticalScore) { this.theoreticalScore = theoreticalScore; }

    public Double getCitationScore() { return citationScore; }
    public void setCitationScore(Double citationScore) { this.citationScore = citationScore; }

    public Double getAverageOverallScore() { return averageOverallScore; }
    public void setAverageOverallScore(Double averageOverallScore) { this.averageOverallScore = averageOverallScore; }

    public Double getOverallScore() { return overallScore; }
    public void setOverallScore(Double overallScore) { this.overallScore = overallScore; }

    public String getRecommendationStatus() { return recommendationStatus; }
    public void setRecommendationStatus(String recommendationStatus) { this.recommendationStatus = recommendationStatus; }

    public String getConfidenceLevel() { return confidenceLevel; }
    public void setConfidenceLevel(String confidenceLevel) { this.confidenceLevel = confidenceLevel; }

    public String getRelevanceLevel() { return relevanceLevel; }
    public void setRelevanceLevel(String relevanceLevel) { this.relevanceLevel = relevanceLevel; }

    public String getMismatchFlagsJson() { return mismatchFlagsJson; }
    public void setMismatchFlagsJson(String mismatchFlagsJson) { this.mismatchFlagsJson = mismatchFlagsJson; }

    public String getWeaknessFlagsJson() { return weaknessFlagsJson; }
    public void setWeaknessFlagsJson(String weaknessFlagsJson) { this.weaknessFlagsJson = weaknessFlagsJson; }

    public String getValidationFlagsJson() { return validationFlagsJson; }
    public void setValidationFlagsJson(String validationFlagsJson) { this.validationFlagsJson = validationFlagsJson; }

    public String getRawAiResponseJson() { return rawAiResponseJson; }
    public void setRawAiResponseJson(String rawAiResponseJson) { this.rawAiResponseJson = rawAiResponseJson; }

    public LocalDateTime getGeneratedAt() { return generatedAt; }
    public void setGeneratedAt(LocalDateTime generatedAt) { this.generatedAt = generatedAt; }

    public List<EvidenceExcerpt> getEvidenceExcerpts() { return evidenceExcerpts; }
    public void setEvidenceExcerpts(List<EvidenceExcerpt> evidenceExcerpts) { this.evidenceExcerpts = evidenceExcerpts; }
}
