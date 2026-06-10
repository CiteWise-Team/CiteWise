package com.citewise.backend.module3.service;

import com.citewise.backend.module3.dto.Document;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class DeterministicCitationEngine {

    /**
     * Intercepts AI raw output, scans for [DocX] placeholders,
     * replaces with properly formatted APA 7th Edition inline citations
     */
    public String injectAPACitations(String rawAiText, List<Document> sources) {
        if (rawAiText == null || sources == null || sources.isEmpty()) {
            return rawAiText;
        }

        String result = rawAiText;
        
        // Pattern to match [Doc1], [Doc2], etc.
        Pattern pattern = Pattern.compile("\\[Doc(\\d+)\\]");
        Matcher matcher = pattern.matcher(result);
        
        Map<String, String> citationMap = new HashMap<>();
        
        while (matcher.find()) {
            String fullMatch = matcher.group();
            String docNumber = matcher.group(1);
            
            if (!citationMap.containsKey(fullMatch)) {
                int index = Integer.parseInt(docNumber) - 1;
                if (index >= 0 && index < sources.size()) {
                    Document doc = sources.get(index);
                    String citation = formatApaCitation(doc);
                    citationMap.put(fullMatch, citation);
                }
            }
        }
        
        // Replace all placeholders with APA citations
        for (Map.Entry<String, String> entry : citationMap.entrySet()) {
            result = result.replace(entry.getKey(), entry.getValue());
        }
        
        return result;
    }

    /**
     * Formats APA 7th Edition inline citation
     * Example: (Vaswani et al., 2017) or (Smith & Jones, 2022)
     */
    private String formatApaCitation(Document doc) {
        StringBuilder citation = new StringBuilder("(");
        
        if (doc.getAuthor() != null && !doc.getAuthor().isEmpty()) {
            citation.append(doc.getAuthor());
        } else {
            citation.append("Author");
        }
        
        if (doc.getYear() != null && doc.getYear() > 0) {
            citation.append(", ").append(doc.getYear());
        } else {
            citation.append(", n.d.");
        }
        
        citation.append(")");
        return citation.toString();
    }
}