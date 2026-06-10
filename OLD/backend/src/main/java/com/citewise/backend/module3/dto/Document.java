package com.citewise.backend.module3.dto;

import java.util.UUID;

public class Document {
    private UUID id;
    private String author;
    private Integer year;
    private String title;

    public Document() {
    }

    public Document(UUID id, String author, Integer year, String title) {
        this.id = id;
        this.author = author;
        this.year = year;
        this.title = title;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getAuthor() {
        return author;
    }

    public void setAuthor(String author) {
        this.author = author;
    }

    public Integer getYear() {
        return year;
    }

    public void setYear(Integer year) {
        this.year = year;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }
}
