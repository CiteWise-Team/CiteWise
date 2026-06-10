package com.citewise.backend.service;

import com.citewise.backend.dto.CatalystPayload;
import com.citewise.backend.dto.GapItem;
import com.citewise.backend.dto.GapResponse;
import com.citewise.backend.dto.TopicItem;
import com.citewise.backend.dto.TopicResponse;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class CatalystClient {
    private final RestTemplate restTemplate;
    private final String baseUrl;

    public CatalystClient(RestTemplate restTemplate, @Value("${catalyst.base-url}") String baseUrl) {
        this.restTemplate = restTemplate;
        this.baseUrl = baseUrl;
    }

    public CatalystPayload fetchCatalystData(String groupId) {
        TopicItem topic = fetchTopic(groupId);
        List<String> gaps = fetchGaps(groupId);
        String title = topic == null ? null : topic.title();
        String rationale = topic == null ? null : topic.rationale();
        return new CatalystPayload(title, rationale, gaps);
    }

    private TopicItem fetchTopic(String groupId) {
        String url = String.format("%s/topic/%s", baseUrl, groupId);
        TopicResponse response = restTemplate.getForObject(url, TopicResponse.class);
        if (response == null || response.data() == null || response.data().isEmpty()) {
            return null;
        }
        return response.data().get(0);
    }

    private List<String> fetchGaps(String groupId) {
        String url = String.format("%s/gap/%s", baseUrl, groupId);
        GapResponse response = restTemplate.getForObject(url, GapResponse.class);
        if (response == null || response.data() == null) {
            return Collections.emptyList();
        }
        return response.data().stream()
            .map(GapItem::gap)
            .filter(Objects::nonNull)
            .map(String::trim)
            .filter(value -> !value.isEmpty())
            .toList();
    }
}
