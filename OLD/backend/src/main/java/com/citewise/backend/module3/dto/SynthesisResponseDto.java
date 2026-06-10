package com.citewise.backend.module3.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.JsonNode;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@JsonIgnoreProperties(ignoreUnknown = true)
public class SynthesisResponseDto {
    private UUID draftId;
    private UUID sessionId;
    private String contentText;
    private String referencesText;
    private JsonNode sections;
    private List<String> references;
    private List<String> citationsUsed;
    private String validationStatus;
    private List<String> validationFlags;
    private JsonNode unsupportedClaimFlags;
    private JsonNode metrics;
    private LocalDateTime createdAt;
    private Boolean success;
    private String message;
    private String status;
    private Boolean retryRecommended;
    private String errorMessage;
    private Map<String, Object> meta;
    private Map<String, Object> placeholders;
    private JsonNode sectionsPreview;

    public SynthesisResponseDto() {
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private final SynthesisResponseDto dto = new SynthesisResponseDto();

        public Builder draftId(UUID draftId) { dto.draftId = draftId; return this; }
        public Builder sessionId(UUID sessionId) { dto.sessionId = sessionId; return this; }
        public Builder contentText(String contentText) { dto.contentText = contentText; return this; }
        public Builder referencesText(String referencesText) { dto.referencesText = referencesText; return this; }
        public Builder sections(JsonNode sections) { dto.sections = sections; return this; }
        public Builder references(List<String> references) { dto.references = references; return this; }
        public Builder citationsUsed(List<String> citationsUsed) { dto.citationsUsed = citationsUsed; return this; }
        public Builder validationStatus(String validationStatus) { dto.validationStatus = validationStatus; return this; }
        public Builder validationFlags(List<String> validationFlags) { dto.validationFlags = validationFlags; return this; }
        public Builder unsupportedClaimFlags(JsonNode unsupportedClaimFlags) { dto.unsupportedClaimFlags = unsupportedClaimFlags; return this; }
        public Builder metrics(JsonNode metrics) { dto.metrics = metrics; return this; }
        public Builder createdAt(LocalDateTime createdAt) { dto.createdAt = createdAt; return this; }
        public Builder success(Boolean success) { dto.success = success; return this; }
        public Builder message(String message) { dto.message = message; return this; }
        public Builder status(String status) { dto.status = status; return this; }
        public Builder retryRecommended(Boolean retryRecommended) { dto.retryRecommended = retryRecommended; return this; }
        public Builder errorMessage(String errorMessage) { dto.errorMessage = errorMessage; return this; }
        public Builder meta(Map<String, Object> meta) { dto.meta = meta; return this; }
        public Builder placeholders(Map<String, Object> placeholders) { dto.placeholders = placeholders; return this; }
        public Builder sectionsPreview(JsonNode sectionsPreview) { dto.sectionsPreview = sectionsPreview; return this; }
        public SynthesisResponseDto build() { return dto; }
    }

    public UUID getDraftId() { return draftId; }
    public void setDraftId(UUID draftId) { this.draftId = draftId; }
    public UUID getSessionId() { return sessionId; }
    public void setSessionId(UUID sessionId) { this.sessionId = sessionId; }
    public String getContentText() { return contentText; }
    public void setContentText(String contentText) { this.contentText = contentText; }
    public String getReferencesText() { return referencesText; }
    public void setReferencesText(String referencesText) { this.referencesText = referencesText; }
    public JsonNode getSections() { return sections; }
    public void setSections(JsonNode sections) { this.sections = sections; }
    public List<String> getReferences() { return references; }
    public void setReferences(List<String> references) { this.references = references; }
    public List<String> getCitationsUsed() { return citationsUsed; }
    public void setCitationsUsed(List<String> citationsUsed) { this.citationsUsed = citationsUsed; }
    public String getValidationStatus() { return validationStatus; }
    public void setValidationStatus(String validationStatus) { this.validationStatus = validationStatus; }
    public List<String> getValidationFlags() { return validationFlags; }
    public void setValidationFlags(List<String> validationFlags) { this.validationFlags = validationFlags; }
    public JsonNode getUnsupportedClaimFlags() { return unsupportedClaimFlags; }
    public void setUnsupportedClaimFlags(JsonNode unsupportedClaimFlags) { this.unsupportedClaimFlags = unsupportedClaimFlags; }
    public JsonNode getMetrics() { return metrics; }
    public void setMetrics(JsonNode metrics) { this.metrics = metrics; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public Boolean getSuccess() { return success; }
    public void setSuccess(Boolean success) { this.success = success; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Boolean getRetryRecommended() { return retryRecommended; }
    public void setRetryRecommended(Boolean retryRecommended) { this.retryRecommended = retryRecommended; }
    public String getErrorMessage() { return errorMessage; }
    public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }
    public Map<String, Object> getMeta() { return meta; }
    public void setMeta(Map<String, Object> meta) { this.meta = meta; }
    public Map<String, Object> getPlaceholders() { return placeholders; }
    public void setPlaceholders(Map<String, Object> placeholders) { this.placeholders = placeholders; }
    public JsonNode getSectionsPreview() { return sectionsPreview; }
    public void setSectionsPreview(JsonNode sectionsPreview) { this.sectionsPreview = sectionsPreview; }
}
