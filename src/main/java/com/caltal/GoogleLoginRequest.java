package com.caltal;

// The ID token Google's button hands the browser, passed straight through.
public class GoogleLoginRequest {

    private String credential;

    public String getCredential() { return credential; }
    public void setCredential(String credential) { this.credential = credential; }
}
