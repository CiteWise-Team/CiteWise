package com.citewise.backend.module3.controller;

import com.citewise.backend.module3.dto.SynthesisResponseDto;
import com.citewise.backend.module3.service.RAGSynthesisService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/synthesis")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class DraftGenerationController {

    private final RAGSynthesisService raqSynthesisService;

    @PostMapping("/generate")
    public ResponseEntity<SynthesisResponseDto> generateIntroduction(
            @RequestParam UUID sessionId,
            @RequestParam(required = false) String chosenGap) {
        SynthesisResponseDto response = raqSynthesisService.orchestrateDrafting(sessionId, chosenGap);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportDraft(@RequestParam UUID draftId, @RequestParam String format) {
        return raqSynthesisService.exportDraft(draftId, format);
    }
}
