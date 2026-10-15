package com.caltal;

public class PlaceNameTakenException extends RuntimeException {

    public PlaceNameTakenException(String name) {
        super("You already have a place called " + name);
    }
}
