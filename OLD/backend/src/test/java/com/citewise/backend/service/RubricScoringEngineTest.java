package com.citewise.backend.service;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class RubricScoringEngineTest {
    private final RubricScoringEngine engine = new RubricScoringEngine();

    @Test
    public void testCalculateOverallScore() {
        double overall = engine.calculateOverallScore(80, 70, 60, 90);
        // expected = 80*0.35 + 70*0.30 + 60*0.20 + 90*0.15 = 74.5
        assertEquals(74.5, overall, 0.0001);
    }

    @Test
    public void testProvidedOverallScoreIsPreserved() {
        String json = """
            {
              "scores": {
                "gapAlignment": 80,
                "methodology": 70,
                "theory": 60,
                "citationQuality": 90,
                "overall_score": 88
              }
            }
            """;

        assertEquals(88.0, engine.parseAIResponse(json, 1L).getOverallScore(), 0.0001);
    }

    @Test
    public void testRecommendedClassification() {
        String rec = engine.computeRecommendation(85, 80, "Medium", java.util.List.of());
        assertEquals("Recommended", rec);
    }

    @Test
    public void testNeedsReviewClassification() {
        String rec = engine.computeRecommendation(75, 70, "Medium", java.util.List.of());
        assertEquals("Needs Review", rec);
    }

    @Test
    public void testLowRelevanceByOverall() {
        String rel = engine.applyThresholdRules(50, 80, "Medium", java.util.List.of(), java.util.List.of());
        assertEquals("Low", rel);
    }

    @Test
    public void testNullFlagsAndEvidenceHandled() {
        // should not throw
        String rel = engine.applyThresholdRules(85, 80, null, null, null);
        // No evidence -> Low relevance per rules
        assertEquals("Low", rel);
    }
}
