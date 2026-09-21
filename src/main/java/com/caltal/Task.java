package com.caltal;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import java.time.LocalDate;

@Entity

public class Task {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private LocalDate dueDate;
    private Long id;
    private String name;
    private double latitude;
    private double longitude;
    private int radius;
    private boolean isComplete;

    protected Task() {

    }

    public Task(String name, double latitude, double longitude, int radius, LocalDate dueDate) {
        setName(name);
        setLatitude(latitude);
        setLongitude(longitude);
        setRadius(radius);
        setDueDate(dueDate);
        this.isComplete = false;

    }

    public LocalDate getDueDate() {
        return dueDate;
    }

    

    public Long getID() {
        return id;
    }

    public boolean isWithinRange(double userLatitude, double userLongitude) {
        double distance = distanceTo(userLatitude, userLongitude);
        return distance <= radius;
    }

    private static final double EARTH_RADIUS_METRES = 6_371_000.0;

    private double distanceTo(double userLatitude, double userLongitude) {
        double taskLatitudeRadians = Math.toRadians(this.latitude);
        double userLatitudeRadians = Math.toRadians(userLatitude);

        double latitudeDifference = Math.toRadians(userLatitude - this.latitude);
        double longitudeDifference = Math.toRadians(userLongitude - this.longitude);

        double halfLatitudeSine = Math.sin(latitudeDifference / 2);
        double halfLongitudeSine = Math.sin(longitudeDifference / 2);

        double a = halfLatitudeSine * halfLatitudeSine
                + Math.cos(taskLatitudeRadians) * Math.cos(userLatitudeRadians)
                        * halfLongitudeSine * halfLongitudeSine;

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return EARTH_RADIUS_METRES * c;
    }

    public String getName() {
        return name;
    }

    public double getLatitude() {
        return latitude;
    }

    public double getLongitude() {
        return longitude;
    }

    public int getRadius() {
        return radius;
    }

    public boolean isComplete() {
        return isComplete;
    }

   

    public void setName(String name) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Name must not be empty");
        }
        this.name = name;
    }

    public void setLatitude(double latitude) {
        if (latitude < -90 || latitude > 90) {
            throw new IllegalArgumentException("Latitude must be between -90 and 90");
        }
        this.latitude = latitude;
    }

    public void setLongitude(double longitude) {
        if (longitude < -180 || longitude > 180) {
            throw new IllegalArgumentException("Longitude must be between -180 and 180");
        }
        this.longitude = longitude;
    }

    public void setRadius(int radius) {
        if (radius <= 0) {
            throw new IllegalArgumentException("Radius must be positive");
        }
        this.radius = radius;
    }

    public void setDueDate(LocalDate dueDate) {
        if (dueDate == null) {
            throw new IllegalArgumentException("Due date must not be null");
        }
        this.dueDate = dueDate;
    }

    public void markComplete() {
        this.isComplete = true;
    }
}