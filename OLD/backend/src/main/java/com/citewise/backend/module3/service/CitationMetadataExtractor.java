package com.citewise.backend.module3.service;

import com.citewise.backend.module3.dto.CitationMetadata;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import org.xml.sax.InputSource;

import javax.xml.parsers.DocumentBuilderFactory;
import java.io.StringReader;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class CitationMetadataExtractor {

    private static final Logger log = LoggerFactory.getLogger(CitationMetadataExtractor.class);

    private static final int TOP_TEXT_LIMIT = 6000;
    private static final Pattern DOI_PATTERN = Pattern.compile("10\\.\\d{4,9}/[-._;()/:A-Z0-9]+", Pattern.CASE_INSENSITIVE);
    private static final Pattern YEAR_PATTERN = Pattern.compile("\\b(199\\d|20[0-2]\\d|2030)\\b");
    private static final Pattern URL_PATTERN = Pattern.compile("https?://\\S+|www\\.\\S+", Pattern.CASE_INSENSITIVE);
    private static final Pattern EMAIL_PATTERN = Pattern.compile("\\b\\S+@\\S+\\.\\S+\\b");
    private static final Pattern ARXIV_PATTERN = Pattern.compile("(?i)(?:arxiv\\s*:?\\s*|arxiv\\.org/(?:abs|pdf)/)?\\b(\\d{4}\\.\\d{4,5})(?:v\\d+)?\\b");
    private static final Pattern SECTION_HEADING_PATTERN = Pattern.compile("^(abstract|introduction|keywords?|affiliations?|correspondence)\\b", Pattern.CASE_INSENSITIVE);
    private static final Pattern TITLE_TOPIC_TERM_PATTERN = Pattern.compile(
        "\\b(framework|benchmark|benchmarking|system|systems|retrieval|augmented|generation|synthesis|literature|scalable|citation-aware|citation\\s+aware|outline-guided|outline\\s+guided|scientific|capabilities|llms?|rag|agentic|ragcap|ragcap-bench|scirag)\\b",
        Pattern.CASE_INSENSITIVE
    );

    private final HttpClient httpClient = HttpClient.newBuilder()
        .connectTimeout(java.time.Duration.ofSeconds(5))
        .build();

    @Value("${citewise.metadata.arxiv-lookup-enabled:true}")
    private boolean arxivLookupEnabled = true;

    @Value("${citewise.metadata.doi-lookup-enabled:false}")
    private boolean doiLookupEnabled = false;

    public CitationMetadata extract(String filename, String parsedText) {
        String text = parsedText == null ? "" : parsedText;
        String topText = text.substring(0, Math.min(text.length(), TOP_TEXT_LIMIT));
        List<String> lines = extractCleanLines(topText);
        List<String> warnings = new ArrayList<>();

        String arxivId = extractArxivId(filename, topText);
        String doi = extractDoi(topText);
        Integer year = extractYear(topText);
        TitleCandidate titleCandidate = extractTitle(lines, filename);
        AuthorExtraction authorExtraction = extractAuthors(lines, titleCandidate);
        String journal = extractJournal(lines, titleCandidate.index(), titleCandidate.title());
        String url = "";
        String sourceType = isBlank(journal) ? "article" : "journal-article";

        CitationMetadata arxivMetadata = null;
        if (!isBlank(arxivId) && arxivLookupEnabled) {
            arxivMetadata = lookupArxivMetadata(arxivId, warnings);
            if (arxivMetadata != null) {
                if (arxivMetadata.getAuthors() != null && !arxivMetadata.getAuthors().isEmpty()) {
                    authorExtraction = new AuthorExtraction(arxivMetadata.getAuthors(), arxivMetadata.getAuthorDisplay());
                }
                if (!isBlank(arxivMetadata.getTitle())) {
                    titleCandidate = new TitleCandidate(arxivMetadata.getTitle(), titleCandidate.index(), 1000);
                }
                if (arxivMetadata.getYear() != null) {
                    year = arxivMetadata.getYear();
                }
                if (!isBlank(arxivMetadata.getUrl())) {
                    url = arxivMetadata.getUrl();
                }
                if (!isBlank(arxivMetadata.getJournal())) {
                    journal = arxivMetadata.getJournal();
                }
                sourceType = "arXiv";
            }
        }

        String title = titleCandidate.title();
        if (isBlank(title)) {
            warnings.add("MISSING_TITLE");
            title = null;
        }
        if (isBlank(authorExtraction.authorDisplay())) {
            warnings.add("MISSING_AUTHOR");
        }
        if (year == null) {
            warnings.add("MISSING_YEAR");
        }

        boolean metadataReliable = !isBlank(authorExtraction.authorDisplay())
            && year != null
            && !isBlank(title)
            && !isFilenameTitle(title, filename);

        if (!metadataReliable) {
            warnings.add("LOW_CONFIDENCE_METADATA");
        }

        CitationMetadata metadata = new CitationMetadata();
        metadata.setAuthors(authorExtraction.authors());
        metadata.setAuthorDisplay(authorExtraction.authorDisplay());
        metadata.setYear(year);
        metadata.setTitle(title);
        metadata.setJournal(nullToEmpty(journal));
        metadata.setVolume("");
        metadata.setIssue("");
        metadata.setPages("");
        metadata.setDoi(nullToEmpty(doi));
        metadata.setUrl(nullToEmpty(url));
        metadata.setArxivId(nullToEmpty(arxivId));
        metadata.setPublisher("");
        metadata.setSourceType(sourceType);
        metadata.setMetadataReliable(metadataReliable);
        metadata.setWarnings(deduplicate(warnings));
        return metadata;
    }

    private String extractArxivId(String filename, String text) {
        String combined = String.join(" ", nullToEmpty(filename), nullToEmpty(text));
        Matcher matcher = ARXIV_PATTERN.matcher(combined);
        if (!matcher.find()) {
            return "";
        }
        return matcher.group(1);
    }

    private CitationMetadata lookupArxivMetadata(String arxivId, List<String> warnings) {
        String url = "";
        try {
            String encodedId = URLEncoder.encode(arxivId, StandardCharsets.UTF_8);
            url = "https://export.arxiv.org/api/query?id_list=" + encodedId;
            URI uri = URI.create(url);
            HttpRequest request = HttpRequest.newBuilder(uri)
                .timeout(java.time.Duration.ofSeconds(10))
                .header("User-Agent", "CiteWise-Capstone/1.0 (academic metadata extraction)")
                .header("Accept", "application/atom+xml, application/xml, text/xml")
                .GET()
                .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300 || isBlank(response.body())) {
                warnings.add("ARXIV_LOOKUP_FAILED");
                log.warn(
                    "ARXIV_LOOKUP_FAILED arxivId={} url={} status={} responseSnippet={}",
                    arxivId,
                    url,
                    response.statusCode(),
                    snippet(response.body())
                );
                return null;
            }
            CitationMetadata metadata = parseArxivAtom(arxivId, response.body());
            if (metadata == null || metadata.getAuthors() == null || metadata.getAuthors().isEmpty()) {
                warnings.add("ARXIV_LOOKUP_FAILED");
                log.warn(
                    "ARXIV_LOOKUP_FAILED arxivId={} url={} status={} responseSnippet={}",
                    arxivId,
                    url,
                    response.statusCode(),
                    snippet(response.body())
                );
                return null;
            }
            return metadata;
        } catch (Exception e) {
            warnings.add("ARXIV_LOOKUP_FAILED");
            log.warn(
                "ARXIV_LOOKUP_FAILED arxivId={} url={} errorType={} message={}",
                arxivId,
                url,
                e.getClass().getName(),
                e.getMessage()
            );
            return null;
        }
    }

    private CitationMetadata parseArxivAtom(String arxivId, String xml) throws Exception {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        factory.setNamespaceAware(true);
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
        factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
        org.w3c.dom.Document document = factory.newDocumentBuilder().parse(new InputSource(new StringReader(xml)));
        List<Element> entries = childElements(document.getDocumentElement(), "entry");
        if (entries.isEmpty()) {
            return null;
        }

        Element entry = entries.get(0);
        List<String> authors = new ArrayList<>();
        for (Element author : childElements(entry, "author")) {
            String name = textContent(author, "name");
            if (isValidAuthorName(name)) {
                authors.add(cleanName(name));
            }
        }

        CitationMetadata metadata = new CitationMetadata();
        metadata.setArxivId(arxivId);
        metadata.setAuthors(authors);
        metadata.setAuthorDisplay(buildAuthorDisplay(authors, false));
        metadata.setTitle(cleanTitle(textContent(entry, "title")));
        metadata.setYear(yearFromDate(textContent(entry, "published")));
        String entryUrl = textContent(entry, "id");
        metadata.setUrl(isBlank(entryUrl) ? "https://arxiv.org/abs/" + arxivId : entryUrl.replace("http://", "https://"));
        metadata.setJournal(cleanTitle(textContent(entry, "journal_ref")));
        metadata.setSourceType("arXiv");
        return metadata;
    }

    private String textContent(Element parent, String tagName) {
        Element child = firstChildElement(parent, tagName);
        if (child == null) {
            return "";
        }
        return child.getTextContent().replaceAll("\\s+", " ").trim();
    }

    private Element firstChildElement(Element parent, String localName) {
        List<Element> children = childElements(parent, localName);
        return children.isEmpty() ? null : children.get(0);
    }

    private List<Element> childElements(Element parent, String localName) {
        List<Element> elements = new ArrayList<>();
        if (parent == null) {
            return elements;
        }
        NodeList nodes = parent.getChildNodes();
        for (int i = 0; i < nodes.getLength(); i++) {
            Node node = nodes.item(i);
            if (node instanceof Element element && localName.equals(elementName(element))) {
                elements.add(element);
            }
        }
        return elements;
    }

    private String elementName(Element element) {
        if (element.getLocalName() != null) {
            return element.getLocalName();
        }
        String name = element.getNodeName();
        int colon = name.indexOf(':');
        return colon >= 0 ? name.substring(colon + 1) : name;
    }

    private String snippet(String value) {
        if (value == null) {
            return "";
        }
        String cleaned = value.replaceAll("\\s+", " ").trim();
        return cleaned.length() <= 300 ? cleaned : cleaned.substring(0, 300);
    }

    private Integer yearFromDate(String date) {
        if (isBlank(date) || date.length() < 4) {
            return null;
        }
        Matcher matcher = YEAR_PATTERN.matcher(date.substring(0, Math.min(date.length(), 10)));
        return matcher.find() ? Integer.parseInt(matcher.group(1)) : null;
    }

    private String extractDoi(String text) {
        Matcher matcher = DOI_PATTERN.matcher(text);
        if (!matcher.find()) {
            return "";
        }
        return matcher.group()
            .replaceAll("[\\s\\]\\)>,.;:]+$", "")
            .toLowerCase(Locale.ROOT);
    }

    private Integer extractYear(String text) {
        Matcher matcher = YEAR_PATTERN.matcher(text);
        while (matcher.find()) {
            int year = Integer.parseInt(matcher.group(1));
            if (year >= 1990 && year <= 2030) {
                return year;
            }
        }
        return null;
    }

    private TitleCandidate extractTitle(List<String> lines, String filename) {
        int abstractIndex = findFirstIndex(lines, "^abstract\\b");
        int searchEnd = abstractIndex >= 0 ? abstractIndex : Math.min(lines.size(), 80);

        TitleCandidate best = new TitleCandidate("", -1, -1);
        for (int i = 0; i < searchEnd; i++) {
            String line = lines.get(i);
            if (!isTitleCandidate(line, filename)) {
                continue;
            }

            String candidate = line;
            if (i + 1 < searchEnd && shouldJoinTitleLine(candidate, lines.get(i + 1), filename)) {
                candidate = candidate + " " + lines.get(i + 1);
            }

            int score = scoreTitle(candidate, i);
            if (score > best.score()) {
                best = new TitleCandidate(cleanTitle(candidate), i, score);
            }
        }

        return best;
    }

    private AuthorExtraction extractAuthors(List<String> lines, TitleCandidate titleCandidate) {
        int titleIndex = titleCandidate.index();
        String title = titleCandidate.title();
        if (titleIndex < 0 || lines.isEmpty()) {
            return new AuthorExtraction(List.of(), null);
        }

        int start = Math.max(0, titleIndex + 1);
        int end = Math.min(lines.size(), titleIndex + 10);
        List<String> collectedAuthors = new ArrayList<>();
        boolean explicitEtAl = false;
        for (int i = start; i < end; i++) {
            if (isSectionHeading(lines.get(i))) {
                break;
            }
            String line = cleanAuthorLine(lines.get(i));
            line = removeTitlePrefix(line, title);
            if (!isAuthorCandidate(line, title)) {
                if (!collectedAuthors.isEmpty()) {
                    break;
                }
                continue;
            }

            explicitEtAl = explicitEtAl || line.toLowerCase(Locale.ROOT).contains(" et al");
            List<String> authors = parseAuthors(line);
            if (!authors.isEmpty()) {
                collectedAuthors.addAll(authors);
            }
        }
        if (!collectedAuthors.isEmpty()) {
            List<String> authors = deduplicate(collectedAuthors);
            return new AuthorExtraction(authors, buildAuthorDisplay(authors, explicitEtAl));
        }

        String mergedRemainder = removeTitlePrefix(cleanAuthorLine(lines.get(titleIndex)), title);
        if (isAuthorCandidate(mergedRemainder, title)) {
            boolean mergedExplicitEtAl = mergedRemainder.toLowerCase(Locale.ROOT).contains(" et al");
            List<String> authors = parseAuthors(mergedRemainder);
            return new AuthorExtraction(authors, buildAuthorDisplay(authors, mergedExplicitEtAl));
        }

        return new AuthorExtraction(List.of(), null);
    }

    private String extractJournal(List<String> lines, int titleIndex, String title) {
        int end = titleIndex >= 0 ? Math.min(titleIndex, 8) : Math.min(lines.size(), 8);
        for (int i = 0; i < end; i++) {
            String line = lines.get(i);
            if (line.equalsIgnoreCase(title) || isIgnoredLine(line)) {
                continue;
            }
            String lower = line.toLowerCase(Locale.ROOT);
            if (lower.contains("journal")
                || lower.contains("proceedings")
                || lower.contains("transactions")
                || lower.contains("review")
                || lower.contains("letters")
                || lower.contains("international ")) {
                return line;
            }
        }
        return "";
    }

    private List<String> extractCleanLines(String text) {
        return Arrays.stream(text.replace("\r\n", "\n").replace('\r', '\n').split("\\n"))
            .map(line -> line.replaceAll("\\s+", " ").trim())
            .filter(line -> !line.isBlank())
            .toList();
    }

    private boolean isTitleCandidate(String line, String filename) {
        if (isBlank(line) || isIgnoredLine(line) || isFilenameTitle(line, filename)) {
            return false;
        }
        int letters = countLetters(line);
        if (letters < 10 || line.length() < 15 || line.length() > 240) {
            return false;
        }
        if (line.split(",").length > 4) {
            return false;
        }
        String lower = line.toLowerCase(Locale.ROOT);
        return !lower.matches(".*\\b(volume|vol\\.|issue|no\\.|pp\\.|pages?)\\b.*")
            && !isLikelyAuthorLine(line);
    }

    private boolean shouldJoinTitleLine(String current, String next, String filename) {
        if (!isTitleCandidate(next, filename)) {
            return false;
        }
        if ((current + " " + next).length() > 240) {
            return false;
        }
        return !current.matches(".*[.!?]$");
    }

    private int scoreTitle(String candidate, int lineIndex) {
        String lower = candidate.toLowerCase(Locale.ROOT);
        int score = 100 - lineIndex;
        score += Math.min(candidate.length(), 120) / 4;
        if (lower.contains(":")) {
            score += 8;
        }
        if (lower.matches(".*\\b(study|analysis|review|framework|model|approach|method|effect|impact)\\b.*")) {
            score += 10;
        }
        if (lower.matches(".*\\b(journal|conference|proceedings|copyright|license|issn)\\b.*")) {
            score -= 45;
        }
        if (candidate.equals(candidate.toUpperCase(Locale.ROOT)) && candidate.length() < 40) {
            score -= 30;
        }
        return score;
    }

    private boolean isIgnoredLine(String line) {
        String lower = line.toLowerCase(Locale.ROOT);
        return line.matches("^\\d+$")
            || lower.equals("abstract")
            || lower.equals("introduction")
            || lower.startsWith("keywords")
            || lower.contains("issn")
            || lower.contains("isbn")
            || lower.contains("doi:")
            || DOI_PATTERN.matcher(line).find()
            || URL_PATTERN.matcher(line).find()
            || EMAIL_PATTERN.matcher(line).find()
            || lower.contains("creative commons")
            || lower.contains("open access")
            || lower.contains("copyright")
            || lower.contains("licensed under")
            || lower.contains("all rights reserved")
            || lower.contains("orcid")
            || lower.contains("arxiv")
            || lower.matches(".*\\b(university|department|faculty|school of|institute|college)\\b.*");
    }

    private String cleanAuthorLine(String line) {
        return EMAIL_PATTERN.matcher(line)
            .replaceAll(" ")
            .replaceAll("(?i)^(authors?|by)\\s*[:\\-]\\s*", "")
            .replaceAll("(?i)orcid:?\\s*\\S+", " ")
            .replaceAll("[*\\u2020\\u2021\\u00A7\\u00B6]+", " ")
            .replaceAll("\\b\\d+(?:,\\d+)*\\b", " ")
            .replaceAll("\\s+", " ")
            .trim();
    }

    private boolean isAuthorCandidate(String line, String title) {
        if (isBlank(line) || isIgnoredLine(line) || line.length() > 220) {
            return false;
        }
        String lower = line.toLowerCase(Locale.ROOT);
        if (line.contains(":")
            || lower.endsWith(".pdf")
            || lower.matches(".*\\b(abstract|introduction|keywords|received|accepted|published|correspondence|affiliation|university|department|institute|journal|conference|volume|issue|pages?)\\b.*")
            || isSameOrSimilar(line, title)
            || looksLikeTitleOrTopic(line)) {
            return false;
        }
        int words = line.split("\\s+").length;
        boolean hasListSeparator = line.contains(",") || line.contains(";") || line.contains("&") || lower.contains(" and ");
        if (words > 8 && !hasListSeparator) {
            return false;
        }
        return isLikelyAuthorLine(line);
    }

    private boolean isLikelyAuthorLine(String line) {
        String lower = line.toLowerCase(Locale.ROOT);
        if (looksLikeTitleOrTopic(line)) {
            return false;
        }
        if (lower.contains(" et al")) {
            String withoutEtAl = line.replaceAll("(?i)\\bet\\s+al\\.?\\b", "").trim();
            return isPersonalName(withoutEtAl);
        }
        if (line.contains(",") || line.contains("&") || lower.contains(" and ")) {
            return !parseAuthors(line).isEmpty();
        }
        return isPersonalName(line);
    }

    private List<String> parseAuthors(String line) {
        if (looksLikeTitleOrTopic(line)) {
            return List.of();
        }
        String cleaned = line
            .replaceAll("(?i)\\bet\\s+al\\.?\\b", "")
            .replaceAll("\\band\\b", ",")
            .replace("&", ",")
            .replaceAll("\\s+", " ")
            .trim();

        String[] rawTokens = cleaned.split("\\s*[,;]\\s*");
        List<String> authors = new ArrayList<>();
        for (int i = 0; i < rawTokens.length; i++) {
            String token = cleanName(rawTokens[i]);
            if (isBlank(token)) {
                continue;
            }
            if (i + 1 < rawTokens.length && isInitials(rawTokens[i + 1])) {
                String name = cleanName(token + ", " + rawTokens[i + 1]);
                if (isValidAuthorName(name)) {
                    authors.add(name);
                }
                i++;
            } else if (isValidAuthorName(token)) {
                authors.add(token);
            }
        }

        if (authors.isEmpty()) {
            String single = cleanName(cleaned);
            if (isValidAuthorName(single)) {
                authors.add(single);
            }
        }
        return authors;
    }

    private String cleanName(String name) {
        return name
            .replaceAll("\\([^)]*\\)", " ")
            .replaceAll("[^A-Za-z.,'\\-\\s]", " ")
            .replaceAll("\\s+", " ")
            .trim();
    }

    private boolean isInitials(String value) {
        return value != null && value.trim().matches("(?:[A-Z]\\.?\\s*){1,4}");
    }

    private boolean isValidAuthorName(String name) {
        if (isBlank(name) || name.length() < 2 || name.length() > 80) {
            return false;
        }
        String lower = name.toLowerCase(Locale.ROOT);
        if (lower.matches(".*\\b(article|journal|abstract|introduction|keywords|volume|issue|university|department)\\b.*")
            || looksLikeTitleOrTopic(name)) {
            return false;
        }
        return isPersonalName(name) || name.matches("[A-Z][A-Za-z'\\-]+,\\s*(?:[A-Z]\\.?\\s*){1,4}");
    }

    private String buildAuthorDisplay(List<String> authors, boolean explicitEtAl) {
        if (authors.isEmpty()) {
            return null;
        }
        String first = lastName(authors.get(0));
        if (explicitEtAl || authors.size() >= 3) {
            return first + " et al.";
        }
        if (authors.size() == 2) {
            return first + " & " + lastName(authors.get(1));
        }
        return first;
    }

    private String lastName(String author) {
        String clean = cleanName(author);
        int comma = clean.indexOf(',');
        if (comma > 0) {
            return clean.substring(0, comma).trim();
        }
        String[] parts = clean.split("\\s+");
        return parts.length == 0 ? clean : parts[parts.length - 1];
    }

    private int findFirstIndex(List<String> lines, String regex) {
        Pattern pattern = Pattern.compile(regex, Pattern.CASE_INSENSITIVE);
        for (int i = 0; i < lines.size(); i++) {
            if (pattern.matcher(lines.get(i)).find()) {
                return i;
            }
        }
        return -1;
    }

    private String cleanTitle(String title) {
        return title.replaceAll("\\s+", " ").replaceAll("[.\\s]+$", "").trim();
    }

    private boolean isFilenameTitle(String title, String filename) {
        if (isBlank(title) || isBlank(filename)) {
            return false;
        }
        String normalizedTitle = normalizeComparable(title);
        String normalizedFilename = normalizeComparable(filename.replaceFirst("(?i)\\.pdf$", ""));
        return normalizedTitle.equals(normalizedFilename) || normalizeComparable(title).equals(normalizeComparable(filename));
    }

    private String normalizeComparable(String value) {
        return value == null ? "" : value.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "");
    }

    private int countLetters(String value) {
        int count = 0;
        for (int i = 0; i < value.length(); i++) {
            if (Character.isLetter(value.charAt(i))) {
                count++;
            }
        }
        return count;
    }

    private String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private boolean isSectionHeading(String line) {
        return line != null && SECTION_HEADING_PATTERN.matcher(line.trim()).find();
    }

    private boolean looksLikeTitleOrTopic(String value) {
        if (isBlank(value)) {
            return false;
        }
        String normalized = value.toLowerCase(Locale.ROOT).replace('_', ' ').replace('-', ' ');
        return TITLE_TOPIC_TERM_PATTERN.matcher(normalized).find()
            || normalized.contains("ragcap bench")
            || normalized.contains("scirag");
    }

    private boolean isPersonalName(String value) {
        String name = cleanName(value);
        if (isBlank(name) || name.contains(",") || looksLikeTitleOrTopic(name)) {
            return false;
        }
        String[] parts = name.split("\\s+");
        if (parts.length < 2 || parts.length > 4) {
            return false;
        }
        for (String part : parts) {
            if (!part.matches("[A-Z][A-Za-z'\\-]+|[A-Z]\\.?")) {
                return false;
            }
        }
        return true;
    }

    private boolean isSameOrSimilar(String candidate, String title) {
        if (isBlank(candidate) || isBlank(title)) {
            return false;
        }
        String a = normalizeComparable(candidate);
        String b = normalizeComparable(title);
        return a.equals(b) || a.contains(b) || b.contains(a);
    }

    private String removeTitlePrefix(String candidate, String title) {
        if (isBlank(candidate) || isBlank(title)) {
            return candidate;
        }
        String normalizedCandidate = normalizeComparable(candidate);
        String normalizedTitle = normalizeComparable(title);
        if (normalizedCandidate.equals(normalizedTitle)) {
            return "";
        }
        if (!normalizedCandidate.startsWith(normalizedTitle)) {
            return candidate;
        }

        int bestIndex = -1;
        for (int i = Math.min(candidate.length(), title.length()); i < candidate.length(); i++) {
            String suffix = candidate.substring(0, i);
            if (normalizeComparable(suffix).equals(normalizedTitle)) {
                bestIndex = i;
                break;
            }
        }
        if (bestIndex < 0 || bestIndex >= candidate.length()) {
            return "";
        }
        return candidate.substring(bestIndex).replaceFirst("^[\\s:;.,-]+", "").trim();
    }

    private List<String> deduplicate(List<String> values) {
        Set<String> set = new LinkedHashSet<>(values);
        return new ArrayList<>(set);
    }

    private record TitleCandidate(String title, int index, int score) {
    }

    private record AuthorExtraction(List<String> authors, String authorDisplay) {
    }
}
