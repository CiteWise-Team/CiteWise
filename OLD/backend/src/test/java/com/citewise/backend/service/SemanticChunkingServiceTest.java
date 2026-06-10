package com.citewise.backend.service;

import com.citewise.backend.entity.SemanticBaseline;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class SemanticChunkingServiceTest {

    @Test
    void returnsNonBlankForNonBlankInput() {
        SemanticChunkingService service = new SemanticChunkingService(2000, 4, 900, 100);
        SemanticBaseline baseline = new SemanticBaseline();

        String output = service.selectRelevantChunks("This is a short abstract about methods.", baseline);
        assertNotNull(output);
        assertFalse(output.isBlank());
    }

    @Test
    void respectsMaxCharsLimit() {
        SemanticChunkingService service = new SemanticChunkingService(200, 3, 800, 100);
        SemanticBaseline baseline = new SemanticBaseline();
        baseline.setProjectTitle("Machine Learning");

        StringBuilder text = new StringBuilder();
        for (int i = 0; i < 20; i++) {
            text.append("Paragraph ").append(i).append(" with methods and evaluation metrics.\n\n");
        }

        String output = service.selectRelevantChunks(text.toString(), baseline);
        assertTrue(output.length() <= 200);
    }

    @Test
    void preservesChunkOrderWhilePrioritizingKeywords() {
        SemanticChunkingService service = new SemanticChunkingService(4000, 2, 1000, 120);
        SemanticBaseline baseline = new SemanticBaseline();
        baseline.setProjectTitle("Machine Learning Governance");
        baseline.setRationale("We focus on governance and evaluation metrics.");
        baseline.setResearchGaps("[\"data governance gap\"]");

        String text = String.join("\n\n",
            "Intro paragraph without keywords.",
            "This study addresses machine learning data governance gap and introduces a method.",
            "Another paragraph about evaluation metrics and framework for governance.",
            "Conclusion paragraph."
        );

        String output = service.selectRelevantChunks(text, baseline);
        int firstIndex = output.toLowerCase().indexOf("machine learning");
        int secondIndex = output.toLowerCase().indexOf("evaluation metrics");

        assertTrue(firstIndex >= 0, "Expected keyword chunk to be included");
        assertTrue(secondIndex >= 0, "Expected second keyword chunk to be included");
        assertTrue(firstIndex < secondIndex, "Expected selected chunks to preserve document order");
    }
}
