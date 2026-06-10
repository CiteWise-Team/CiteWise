package com.citewise.backend.service;

import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;

import static org.junit.jupiter.api.Assertions.*;

class DocumentUploadServiceTest {

    @Test
    void sanitizeExtractedTextRemovesNullBytesAndInvalidControls() throws Exception {
        DocumentUploadService service = new DocumentUploadService(
            20,
            null,
            null,
            null,
            null,
            null,
            null,
            Runnable::run,
            Runnable::run
        );
        Method method = DocumentUploadService.class.getDeclaredMethod("sanitizeExtractedText", String.class);
        method.setAccessible(true);

        String sanitized = (String) method.invoke(service, "A\u0000B\u0001 C\r\n\rD\n\n\nE\t F");

        assertFalse(sanitized.contains("\u0000"));
        assertFalse(sanitized.contains("\u0001"));
        assertEquals("AB C\n\nD\n\nE F", sanitized);
    }
}
