package com.caltal;

public class AuthResponse {

    private final String token;
    private final String name;
    private final String email;

    public AuthResponse(String token, String name, String email) {
        this.token = token;
        this.name = name;
        this.email = email;
    }

    public String getToken() { return token; }
    public String getName() { return name; }
    public String getEmail() { return email; }
}