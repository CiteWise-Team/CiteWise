package com.citewise.backend.repository;

import com.citewise.backend.entity.SemanticBaseline;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface SemanticBaselineRepository extends JpaRepository<SemanticBaseline, UUID> {
    Optional<SemanticBaseline> findFirstBySessionIdOrderByCreatedAtDesc(UUID sessionId);
}
