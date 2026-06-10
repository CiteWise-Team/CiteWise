    package com.citewise.backend.repository;

    import com.citewise.backend.entity.UploadedDocument;
    import org.springframework.data.jpa.repository.JpaRepository;
    import org.springframework.stereotype.Repository;

    import java.util.List;

    @Repository
    public interface UploadedDocumentRepository extends JpaRepository<UploadedDocument, Long> {
        List<UploadedDocument> findBySessionId(String sessionId);
        List<UploadedDocument> findBySessionIdAndApprovedTrue(String sessionId);
        boolean existsBySessionIdAndFileHash(String sessionId, String fileHash);
        boolean existsBySessionIdAndFileName(String sessionId, String fileName);
    }
