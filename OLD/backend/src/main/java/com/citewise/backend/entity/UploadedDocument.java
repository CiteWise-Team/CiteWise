package com.citewise.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "uploaded_documents")
public class UploadedDocument {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String sessionId;
    private String fileName;
    private String fileHash;
    private Long sizeBytes;
    private Integer characterCount;
    private LocalDateTime uploadedAt;

    @Column(columnDefinition = "TEXT")
    private String parsedText;

    @Column(name = "approved", nullable = false, columnDefinition = "boolean default false")
    private boolean approved = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "scoring_status")
    private ScoringStatus scoringStatus = ScoringStatus.PENDING;

    private LocalDateTime scoringStartedAt;
    private LocalDateTime scoringCompletedAt;

    @Column(columnDefinition = "TEXT")
    private String scoringErrorMessage;

    public UploadedDocument() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getSessionId() { return sessionId; }
    public void setSessionId(String sessionId) { this.sessionId = sessionId; }

    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }

    public String getFileHash() { return fileHash; }
    public void setFileHash(String fileHash) { this.fileHash = fileHash; }

    public Long getSizeBytes() { return sizeBytes; }
    public void setSizeBytes(Long sizeBytes) { this.sizeBytes = sizeBytes; }

    public Integer getCharacterCount() { return characterCount; }
    public void setCharacterCount(Integer characterCount) { this.characterCount = characterCount; }

    public LocalDateTime getUploadedAt() { return uploadedAt; }
    public void setUploadedAt(LocalDateTime uploadedAt) { this.uploadedAt = uploadedAt; }

    public String getParsedText() { return parsedText; }
    public void setParsedText(String parsedText) { this.parsedText = parsedText; }

    public boolean isApproved() { return approved; }
    public void setApproved(boolean approved) { this.approved = approved; }

    public ScoringStatus getScoringStatus() { return scoringStatus; }
    public void setScoringStatus(ScoringStatus scoringStatus) { this.scoringStatus = scoringStatus; }

    public LocalDateTime getScoringStartedAt() { return scoringStartedAt; }
    public void setScoringStartedAt(LocalDateTime scoringStartedAt) { this.scoringStartedAt = scoringStartedAt; }

    public LocalDateTime getScoringCompletedAt() { return scoringCompletedAt; }
    public void setScoringCompletedAt(LocalDateTime scoringCompletedAt) { this.scoringCompletedAt = scoringCompletedAt; }

    public String getScoringErrorMessage() { return scoringErrorMessage; }
    public void setScoringErrorMessage(String scoringErrorMessage) { this.scoringErrorMessage = scoringErrorMessage; }
}
