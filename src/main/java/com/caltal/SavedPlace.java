package com.caltal;

import java.util.Locale;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

// A place someone has given a name to, like "Home" or "Gym". Choosing one when
// adding a task copies its position into the task, so moving or deleting a
// saved place later never changes tasks that were already made.
@Entity
@Table(name = "saved_place")
public class SavedPlace {

    static final int MAX_NAME_LENGTH = 50;
    static final int MAX_ADDRESS_LENGTH = 255;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    @JsonIgnore
    private User owner;

    @Column(nullable = false, length = MAX_NAME_LENGTH)
    private String name;

    // The name in lower case. The database keeps these unique per person, so
    // "Home" and "home" can never both exist.
    @Column(nullable = false, length = MAX_NAME_LENGTH)
    @JsonIgnore
    private String nameKey;

    @Column(nullable = false)
    private double latitude;

    @Column(nullable = false)
    private double longitude;

    // What the map search called it ("Leeds Station, New Station Street"), if
    // it came from a search. Only shown to help tell places apart.
    @Column(length = MAX_ADDRESS_LENGTH)
    private String address;

    protected SavedPlace() {
    }

    public SavedPlace(User owner, String name, Double latitude, Double longitude, String address) {
        if (owner == null) {
            throw new IllegalArgumentException("A saved place must belong to someone");
        }
        this.owner = owner;
        update(name, latitude, longitude, address);
    }

    // Renaming and moving go through the same checks as creating
    public void update(String name, Double latitude, Double longitude, String address) {
        setName(name);
        setPosition(latitude, longitude);
        setAddress(address);
    }

    private void setName(String name) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Give the place a name");
        }

        String cleaned = name.trim();

        if (cleaned.length() > MAX_NAME_LENGTH) {
            throw new IllegalArgumentException(
                    "A place name must be " + MAX_NAME_LENGTH + " characters or fewer");
        }

        this.name = cleaned;
        this.nameKey = keyFor(cleaned);
    }

    // Locale.ROOT, so the result doesn't depend on the server's language
    // settings (in Turkish, "I".toLowerCase() isn't "i").
    static String keyFor(String name) {
        return name.trim().toLowerCase(Locale.ROOT);
    }

    private void setPosition(Double latitude, Double longitude) {
        if (latitude == null || longitude == null
                || !Double.isFinite(latitude) || !Double.isFinite(longitude)
                || latitude < -90 || latitude > 90
                || longitude < -180 || longitude > 180) {
            throw new IllegalArgumentException("That isn't a real place on the map");
        }

        this.latitude = latitude;
        this.longitude = longitude;
    }

    // An address is only a description, so an over-long one is shortened
    // rather than refused.
    private void setAddress(String address) {
        if (address == null || address.isBlank()) {
            this.address = null;
            return;
        }

        String cleaned = address.trim();
        this.address = cleaned.length() > MAX_ADDRESS_LENGTH
                ? cleaned.substring(0, MAX_ADDRESS_LENGTH)
                : cleaned;
    }

    public Long getId() {
        return id;
    }

    public User getOwner() {
        return owner;
    }

    public String getName() {
        return name;
    }

    public String getNameKey() {
        return nameKey;
    }

    public double getLatitude() {
        return latitude;
    }

    public double getLongitude() {
        return longitude;
    }

    public String getAddress() {
        return address;
    }
}
