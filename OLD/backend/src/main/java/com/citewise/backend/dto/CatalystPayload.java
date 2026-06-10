package com.citewise.backend.dto;

import java.util.List;

public record CatalystPayload(String title, String rationale, List<String> gaps) {}
