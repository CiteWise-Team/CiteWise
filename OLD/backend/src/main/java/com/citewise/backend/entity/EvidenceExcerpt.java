package com.citewise.backend.entity;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Table(name = "evidence_excerpts")
public class EvidenceExcerpt {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_insight_id")
    @JsonIgnore
    private DocumentInsight documentInsight;

    @Column(columnDefinition = "TEXT")
    private String quoteText;
    private Integer pageNumber;
    private String relevanceLevel;

    private String criterion;
    private String evidenceType;
    private Integer displayOrder;

    public EvidenceExcerpt() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public DocumentInsight getDocumentInsight() { return documentInsight; }
    public void setDocumentInsight(DocumentInsight documentInsight) { this.documentInsight = documentInsight; }

    public String getQuoteText() { return quoteText; }
    public void setQuoteText(String quoteText) { this.quoteText = quoteText; }

    public Integer getPageNumber() { return pageNumber; }
    public void setPageNumber(Integer pageNumber) { this.pageNumber = pageNumber; }

    public String getRelevanceLevel() { return relevanceLevel; }
    public void setRelevanceLevel(String relevanceLevel) { this.relevanceLevel = relevanceLevel; }

    public String getCriterion() { return criterion; }
    public void setCriterion(String criterion) { this.criterion = criterion; }

    public String getEvidenceType() { return evidenceType; }
    public void setEvidenceType(String evidenceType) { this.evidenceType = evidenceType; }

    public Integer getDisplayOrder() { return displayOrder; }
    public void setDisplayOrder(Integer displayOrder) { this.displayOrder = displayOrder; }
}
