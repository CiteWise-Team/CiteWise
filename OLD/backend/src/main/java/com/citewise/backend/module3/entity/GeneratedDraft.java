package com.citewise.backend.module3.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "generated_draft")
public class GeneratedDraft {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "session_id", nullable = false)
    private UUID sessionId;

    @Lob
    @Column(name = "content_text", columnDefinition = "text")
    private String contentText;

    @Column(name = "references_text", columnDefinition = "TEXT")
    private String referencesText;

    @Lob
    @Column(name = "background_text", columnDefinition = "text")
    private String backgroundText;

    @Lob
    @Column(name = "rationale_text", columnDefinition = "text")
    private String rationaleText;

    @Lob
    @Column(name = "gap_text", columnDefinition = "text")
    private String gapText;

    @Column(name = "citations_used_json", columnDefinition = "TEXT")
    private String citationsUsedJson;

    @Column(name = "validation_status")
    private String validationStatus;

    @Column(name = "validation_flags_json", columnDefinition = "TEXT")
    private String validationFlagsJson;

    @Column(name = "unsupported_claim_flags_json", columnDefinition = "TEXT")
    private String unsupportedClaimFlagsJson;

    @Column(name = "metrics_json", columnDefinition = "TEXT")
    private String metricsJson;

    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    public GeneratedDraft() {
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private final GeneratedDraft draft = new GeneratedDraft();

        public Builder id(UUID id) { draft.id = id; return this; }
        public Builder sessionId(UUID sessionId) { draft.sessionId = sessionId; return this; }
        public Builder contentText(String contentText) { draft.contentText = contentText; return this; }
        public Builder referencesText(String referencesText) { draft.referencesText = referencesText; return this; }
        public Builder backgroundText(String backgroundText) { draft.backgroundText = backgroundText; return this; }
        public Builder rationaleText(String rationaleText) { draft.rationaleText = rationaleText; return this; }
        public Builder gapText(String gapText) { draft.gapText = gapText; return this; }
        public Builder citationsUsedJson(String citationsUsedJson) { draft.citationsUsedJson = citationsUsedJson; return this; }
        public Builder validationStatus(String validationStatus) { draft.validationStatus = validationStatus; return this; }
        public Builder validationFlagsJson(String validationFlagsJson) { draft.validationFlagsJson = validationFlagsJson; return this; }
        public Builder unsupportedClaimFlagsJson(String unsupportedClaimFlagsJson) { draft.unsupportedClaimFlagsJson = unsupportedClaimFlagsJson; return this; }
        public Builder metricsJson(String metricsJson) { draft.metricsJson = metricsJson; return this; }
        public Builder createdAt(LocalDateTime createdAt) { draft.createdAt = createdAt; return this; }
        public GeneratedDraft build() { return draft; }
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getSessionId() { return sessionId; }
    public void setSessionId(UUID sessionId) { this.sessionId = sessionId; }
    public String getContentText() { return contentText; }
    public void setContentText(String contentText) { this.contentText = contentText; }
    public String getReferencesText() { return referencesText; }
    public void setReferencesText(String referencesText) { this.referencesText = referencesText; }
    public String getBackgroundText() { return backgroundText; }
    public void setBackgroundText(String backgroundText) { this.backgroundText = backgroundText; }
    public String getRationaleText() { return rationaleText; }
    public void setRationaleText(String rationaleText) { this.rationaleText = rationaleText; }
    public String getGapText() { return gapText; }
    public void setGapText(String gapText) { this.gapText = gapText; }
    public String getCitationsUsedJson() { return citationsUsedJson; }
    public void setCitationsUsedJson(String citationsUsedJson) { this.citationsUsedJson = citationsUsedJson; }
    public String getValidationStatus() { return validationStatus; }
    public void setValidationStatus(String validationStatus) { this.validationStatus = validationStatus; }
    public String getValidationFlagsJson() { return validationFlagsJson; }
    public void setValidationFlagsJson(String validationFlagsJson) { this.validationFlagsJson = validationFlagsJson; }
    public String getUnsupportedClaimFlagsJson() { return unsupportedClaimFlagsJson; }
    public void setUnsupportedClaimFlagsJson(String unsupportedClaimFlagsJson) { this.unsupportedClaimFlagsJson = unsupportedClaimFlagsJson; }
    public String getMetricsJson() { return metricsJson; }
    public void setMetricsJson(String metricsJson) { this.metricsJson = metricsJson; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
