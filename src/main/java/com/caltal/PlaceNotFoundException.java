package com.caltal;

// Also what someone gets for a place that exists but isn't theirs: from the
// outside, the two must look exactly the same.
public class PlaceNotFoundException extends RuntimeException {

    public PlaceNotFoundException(Long id) {
        super("Place " + id + " not found");
    }
}
