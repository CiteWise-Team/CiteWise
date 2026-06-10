package com.citewise.backend.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record GapResponse(boolean success, String message, List<GapItem> data) {}
