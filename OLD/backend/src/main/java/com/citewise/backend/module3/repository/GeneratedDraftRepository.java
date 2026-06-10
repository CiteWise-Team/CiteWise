package com.citewise.backend.module3.repository;

import com.citewise.backend.module3.entity.GeneratedDraft;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface GeneratedDraftRepository extends JpaRepository<GeneratedDraft, UUID> {
    Optional<GeneratedDraft> findBySessionId(UUID sessionId);
    void deleteBySessionId(UUID sessionId);
}