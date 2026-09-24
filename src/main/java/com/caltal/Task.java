package com.caltal;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Enumerated;
import jakarta.persistence.EnumType;
import java.time.LocalDate;
import java.time.LocalTime;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;

@Entity

public class Task {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)


    private Long id;

    private String name;
    private Double latitude;
    private Double longitude;
    private Integer radius;
    private boolean isComplete;
    private LocalDate dueDate;

    @Enumerated(EnumType.STRING)
    private ReminderType reminderType;
    private LocalTime remindAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    @JsonIgnore
    private User owner;
    protected Task() {

    }

    public Task(String name, double latitude, double longitude, int radius,
            LocalDate dueDate, User owner) {
        this(name, dueDate, owner, ReminderType.LOCATION, latitude, longitude, radius, null);
    }

    public Task(String name, LocalDate dueDate, User owner, ReminderType reminderType,
            Double latitude, Double longitude, Integer radius, LocalTime remindAt) {
        setName(name);
        setReminderType(reminderType);
        setDueDate(dueDate);
        setOwner(owner);
        setLatitude(latitude);
        setLongitude(longitude);
        setRadius(radius);
        setRemindAt(remindAt);
        this.isComplete = false;
        validateReminderType();
    }

    public LocalDate getDueDate() {
        return dueDate;
    }

    public Long getId() {
        return id;
    }

    public boolean isWithinRange(double userLatitude, double userLongitude) {
        if (latitude == null || longitude == null || radius == null) {
            return false;
        }
        double distance = distanceTo(userLatitude, userLongitude);
        return distance <= radius;
    }

    private static final double EARTH_RADIUS_METRES = 6_371_000.0;

    private double distanceTo(double userLatitude, double userLongitude) {
        double taskLatitudeRadians = Math.toRadians(latitude);
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

    public Double getLatitude() {
        return latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public Integer getRadius() {
        return radius;
    }

    public boolean isComplete() {
        return isComplete;
    }

    public User getOwner() {
        return owner;
    }

    public ReminderType getReminderType() {
        return reminderType;
    }

    public LocalTime getRemindAt() {
        return remindAt;
    }

    public void setOwner(User owner) {
        if (owner == null) {
            throw new IllegalArgumentException("Task must have an owner");
        }
        this.owner = owner;
    }

    public void setName(String name) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Name must not be empty");
        }
        this.name = name;
    }

    public void setLatitude(Double latitude) {
        if (latitude != null && (latitude < -90 || latitude > 90)) {
            throw new IllegalArgumentException("Latitude must be between -90 and 90");
        }
        this.latitude = latitude;
    }

    public void setLongitude(Double longitude) {
        if (longitude != null && (longitude < -180 || longitude > 180)) {
            throw new IllegalArgumentException("Longitude must be between -180 and 180");
        }
        this.longitude = longitude;
    }

    public void setRadius(Integer radius) {
        if (radius != null && radius <= 0) {
            throw new IllegalArgumentException("Radius must be positive");
        }
        this.radius = radius;
    }

    public void setReminderType(ReminderType reminderType) {
        if (reminderType == null) {
            throw new IllegalArgumentException("Reminder type must not be null");
        }
        this.reminderType = reminderType;
    }

    public void setRemindAt(LocalTime remindAt) {
        this.remindAt = remindAt;
    }

    private void validateReminderType() {
        switch (reminderType) {
            case LOCATION:
                if (latitude == null || longitude == null || radius == null) {
                    throw new IllegalArgumentException("LOCATION task must have latitude, longitude, and radius");
                }
                if (remindAt != null) {
                    throw new IllegalArgumentException("LOCATION task must not have a remindAt time");
                }
                break;
            case TIME:
                if (remindAt == null) {
                    throw new IllegalArgumentException("TIME task must have a remindAt time");
                }
                if (latitude != null || longitude != null || radius != null) {
                    throw new IllegalArgumentException("TIME task must not have location fields");
                }
                break;
            case BOTH:
                if (latitude == null || longitude == null || radius == null) {
                    throw new IllegalArgumentException("BOTH task must have latitude, longitude, and radius");
                }
                if (remindAt == null) {
                    throw new IllegalArgumentException("BOTH task must have a remindAt time");
                }
                break;
        }
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