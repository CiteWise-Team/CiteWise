package com.citewise.backend.module3.service;

import com.citewise.backend.module3.dto.CitationMetadata;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class CitationMetadataExtractorTest {

    private final CitationMetadataExtractor extractor = extractorWithoutExternalLookups();

    @Test
    void extractsCommonAcademicFirstPageMetadata() {
        String text = String.join("\n",
            "Journal of Learning Analytics",
            "A Practical Framework for AI Feedback in Higher Education",
            "Jane Smith, Marco Garcia, and Aisha Patel",
            "Department of Education, Example University",
            "Abstract",
            "This 2024 study evaluates feedback quality in academic writing.",
            "https://doi.org/10.1234/jla.2024.5678"
        );

        CitationMetadata metadata = extractor.extract("downloaded-paper.pdf", text);

        assertEquals("Smith et al.", metadata.getAuthorDisplay());
        assertEquals(2024, metadata.getYear());
        assertEquals("A Practical Framework for AI Feedback in Higher Education", metadata.getTitle());
        assertEquals("10.1234/jla.2024.5678", metadata.getDoi());
        assertTrue(metadata.isMetadataReliable());
    }

    @Test
    void flagsLowConfidenceWhenNoTitleOrAuthorCanBeExtracted() {
        CitationMetadata metadata = extractor.extract("filename.pdf", "1\n\nAbstract\nNo useful first-page metadata.");

        assertNull(metadata.getTitle());
        assertNull(metadata.getAuthorDisplay());
        assertTrue(metadata.getAuthors().isEmpty());
        assertFalse(metadata.isMetadataReliable());
        assertTrue(metadata.getWarnings().contains("MISSING_TITLE"));
        assertTrue(metadata.getWarnings().contains("MISSING_AUTHOR"));
        assertTrue(metadata.getWarnings().contains("MISSING_YEAR"));
        assertTrue(metadata.getWarnings().contains("LOW_CONFIDENCE_METADATA"));
    }

    @Test
    void rejectsTitleWordsAsAuthors() {
        String text = String.join("\n",
            "Agentic RAG Systems",
            "Benchmarking Capabilities of LLMs",
            "Abstract",
            "Published in 2024."
        );

        CitationMetadata metadata = extractor.extract("agentic-rag-systems.pdf", text);

        assertNotNull(metadata.getTitle());
        assertNull(metadata.getAuthorDisplay());
        assertTrue(metadata.getAuthors().isEmpty());
        assertTrue(metadata.getWarnings().contains("MISSING_AUTHOR"));
    }

    @Test
    void rejectsLowercaseTopicLineAsAuthor() {
        String text = String.join("\n",
            "Synthesis for Scientific Literature",
            "scalable citation-aware outline-guided retrieval for scientific generation",
            "Abstract",
            "2024"
        );

        CitationMetadata metadata = extractor.extract("synthesis.pdf", text);

        assertNull(metadata.getAuthorDisplay());
        assertTrue(metadata.getAuthors().isEmpty());
        assertTrue(metadata.getWarnings().contains("MISSING_AUTHOR"));
    }

    @Test
    void acceptsRealAuthorNamesAfterTitle() {
        String text = String.join("\n",
            "RAGCap-Bench: Benchmarking Capabilities of LLMs",
            "Hang Ding, Yilun Zhao, Tiansheng Hu",
            "Abstract",
            "2024"
        );

        CitationMetadata metadata = extractor.extract("ragcap-bench.pdf", text);

        assertEquals("Ding et al.", metadata.getAuthorDisplay());
        assertEquals(List.of("Hang Ding", "Yilun Zhao", "Tiansheng Hu"), metadata.getAuthors());
        assertTrue(metadata.isMetadataReliable());
    }

    @Test
    void detectsArxivIdFromVersionedFilenameWithoutUsingItAsAuthor() {
        String text = String.join("\n",
            "RAGCap-Bench: Benchmarking Capabilities of LLMs in Agentic Retrieval Augmented Generation Systems",
            "Hang Ding, Yilun Zhao, Tiansheng Hu",
            "Abstract",
            "2024"
        );

        CitationMetadata metadata = extractor.extract("2510.13910v2.pdf", text);

        assertEquals("2510.13910", metadata.getArxivId());
        assertEquals("Ding et al.", metadata.getAuthorDisplay());
        assertFalse(metadata.getAuthors().isEmpty());
    }

    @Test
    void acceptsAuthorLabelAndMultiLineAuthorBlock() {
        String text = String.join("\n",
            "SciRAG: Adaptive, Citation-Aware, and Outline-Guided Retrieval and Synthesis for Scientific Literature",
            "Authors: Manasi Patwardhan",
            "Arman Cohan",
            "Affiliations",
            "Allen Institute for AI",
            "Abstract",
            "2024"
        );

        CitationMetadata metadata = extractor.extract("2511.14362v1.pdf", text);

        assertEquals("Patwardhan & Cohan", metadata.getAuthorDisplay());
        assertEquals(List.of("Manasi Patwardhan", "Arman Cohan"), metadata.getAuthors());
    }

    @Test
    void parsesArxivAtomMetadata() throws Exception {
        String xml = """
            <?xml version='1.0' encoding='UTF-8'?>
            <feed xmlns="http://www.w3.org/2005/Atom">
              <entry>
                <id>http://arxiv.org/abs/2510.13910v2</id>
                <title>RAGCap-Bench: Benchmarking Capabilities of LLMs in Agentic Retrieval Augmented Generation Systems</title>
                <published>2025-10-15T04:13:00Z</published>
                <author><name>Jingru Lin</name></author>
                <author><name>Chen Zhang</name></author>
                <author><name>Stephen Y. Liu</name></author>
                <author><name>Haizhou Li</name></author>
              </entry>
            </feed>
            """;

        var method = CitationMetadataExtractor.class.getDeclaredMethod("parseArxivAtom", String.class, String.class);
        method.setAccessible(true);
        CitationMetadata metadata = (CitationMetadata) method.invoke(extractor, "2510.13910", xml);

        assertEquals("Lin et al.", metadata.getAuthorDisplay());
        assertEquals(List.of("Jingru Lin", "Chen Zhang", "Stephen Y. Liu", "Haizhou Li"), metadata.getAuthors());
        assertEquals(2025, metadata.getYear());
        assertEquals("https://arxiv.org/abs/2510.13910v2", metadata.getUrl());
        assertEquals("arXiv", metadata.getSourceType());
    }

    private CitationMetadataExtractor extractorWithoutExternalLookups() {
        CitationMetadataExtractor value = new CitationMetadataExtractor();
        try {
            var field = CitationMetadataExtractor.class.getDeclaredField("arxivLookupEnabled");
            field.setAccessible(true);
            field.setBoolean(value, false);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
        return value;
    }
}
