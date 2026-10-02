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

    // Where you want to be told about this task, when that is somewhere other
    // than the task itself. "Remind me about the post office as I leave work",
    // rather than reminding me once I am already at the post office.
    private Double triggerLatitude;
    private Double triggerLongitude;
    private Integer triggerRadius;

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

    // Applies a complete new set of details. Validation runs afterwards, exactly
    // as it does in the constructor, so a task can never be edited into an
    // invalid state (a TIME task holding coordinates, say).
    public void update(String name, LocalDate dueDate, ReminderType reminderType,
            Double latitude, Double longitude, Integer radius, LocalTime remindAt) {
        setName(name);
        setDueDate(dueDate);
        setReminderType(reminderType);
        setLatitude(latitude);
        setLongitude(longitude);
        setRadius(radius);
        setRemindAt(remindAt);
        validateReminderType();
    }

    public LocalDate getDueDate() {
        return dueDate;
    }

    public Long getId() {
        return id;
    }

    // The place that actually fires the reminder: the trigger if one is set,
    // otherwise the task's own location.
    public Double getReminderLatitude() {
        return triggerLatitude != null ? triggerLatitude : latitude;
    }

    public Double getReminderLongitude() {
        return triggerLongitude != null ? triggerLongitude : longitude;
    }

    public Integer getReminderRadius() {
        return triggerRadius != null ? triggerRadius : radius;
    }

    public boolean isWithinRange(double userLatitude, double userLongitude) {
        Double reminderLatitude = getReminderLatitude();
        Double reminderLongitude = getReminderLongitude();
        Integer reminderRadius = getReminderRadius();

        if (reminderLatitude == null || reminderLongitude == null || reminderRadius == null) {
            return false;
        }

        return distanceTo(reminderLatitude, reminderLongitude, userLatitude, userLongitude)
                <= reminderRadius;
    }

    private static final double EARTH_RADIUS_METRES = 6_371_000.0;

    // Matches the VARCHAR(255) column. Checking here means an over-long name is a
    // clear 400 rather than a database error surfacing as a 500.
    static final int MAX_NAME_LENGTH = 255;

    // 50km. Anything bigger isn't a place any more, and on phones it would also
    // exceed what the OS geofencing APIs will reliably monitor.
    static final int MAX_RADIUS_METRES = 50_000;

    private double distanceTo(double fromLatitude, double fromLongitude,
            double userLatitude, double userLongitude) {
        double taskLatitudeRadians = Math.toRadians(fromLatitude);
        double userLatitudeRadians = Math.toRadians(userLatitude);

        double latitudeDifference = Math.toRadians(userLatitude - fromLatitude);
        double longitudeDifference = Math.toRadians(userLongitude - fromLongitude);

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

    public Double getTriggerLatitude() {
        return triggerLatitude;
    }

    public Double getTriggerLongitude() {
        return triggerLongitude;
    }

    public Integer getTriggerRadius() {
        return triggerRadius;
    }

    // All three together or none at all, and only on a task that has a place.
    public void applyTrigger(Double latitude, Double longitude, Integer radius) {
        boolean anyPresent = latitude != null || longitude != null || radius != null;
        boolean allPresent = latitude != null && longitude != null && radius != null;

        if (anyPresent && !allPresent) {
            throw new IllegalArgumentException(
                    "A reminder place needs a latitude, a longitude and a radius");
        }

        if (anyPresent && reminderType == ReminderType.TIME) {
            throw new IllegalArgumentException(
                    "A time-only task cannot have a reminder place");
        }

        checkRadius(radius);

        if (latitude != null && (latitude < -90 || latitude > 90)) {
            throw new IllegalArgumentException("Latitude must be between -90 and 90");
        }

        if (longitude != null && (longitude < -180 || longitude > 180)) {
            throw new IllegalArgumentException("Longitude must be between -180 and 180");
        }

        this.triggerLatitude = latitude;
        this.triggerLongitude = longitude;
        this.triggerRadius = radius;
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
        if (name.length() > MAX_NAME_LENGTH) {
            throw new IllegalArgumentException(
                    "Name must be " + MAX_NAME_LENGTH + " characters or fewer");
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
        checkRadius(radius);
        this.radius = radius;
    }

    private static void checkRadius(Integer radius) {
        if (radius == null) {
            return;
        }
        if (radius <= 0) {
            throw new IllegalArgumentException("Radius must be positive");
        }
        if (radius > MAX_RADIUS_METRES) {
            throw new IllegalArgumentException(
                    "Radius must be " + MAX_RADIUS_METRES + " metres or less");
        }
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