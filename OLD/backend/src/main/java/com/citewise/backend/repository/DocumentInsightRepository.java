package com.citewise.backend.repository;

import com.citewise.backend.entity.DocumentInsight;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DocumentInsightRepository extends JpaRepository<DocumentInsight, Long> {
    Optional<DocumentInsight> findByDocumentId(Long documentId);

    @Query("SELECT di FROM DocumentInsight di LEFT JOIN FETCH di.evidenceExcerpts WHERE di.documentId = :documentId")
    Optional<DocumentInsight> findByDocumentIdWithExcerpts(@Param("documentId") Long documentId);
}
