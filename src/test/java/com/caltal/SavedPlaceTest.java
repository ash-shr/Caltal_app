package com.caltal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

class SavedPlaceTest {

    private final User ash = new User("ash@example.com", "hash", "Ash");

    @Test
    void storesTheNameTrimmed() {
        SavedPlace home = new SavedPlace(ash, "  Home ", 53.8, -1.55, null);

        assertEquals("Home", home.getName());
    }

    @Test
    void keepsALowerCaseKeySoHomeAndHomeCountAsTheSameName() {
        SavedPlace home = new SavedPlace(ash, " HoMe ", 53.8, -1.55, null);

        assertEquals("home", home.getNameKey());
    }

    @ParameterizedTest
    @ValueSource(strings = { "", "   " })
    void refusesABlankName(String blank) {
        assertThrows(IllegalArgumentException.class,
                () -> new SavedPlace(ash, blank, 53.8, -1.55, null));
    }

    @Test
    void refusesAMissingName() {
        assertThrows(IllegalArgumentException.class,
                () -> new SavedPlace(ash, null, 53.8, -1.55, null));
    }

    @Test
    void refusesAnOverlongName() {
        assertThrows(IllegalArgumentException.class,
                () -> new SavedPlace(ash, "x".repeat(51), 53.8, -1.55, null));
    }

    @ParameterizedTest
    @CsvSource({ "91, 0", "-91, 0", "0, 181", "0, -181", "NaN, 0", "0, Infinity" })
    void refusesAPositionThatIsNotOnTheMap(double latitude, double longitude) {
        assertThrows(IllegalArgumentException.class,
                () -> new SavedPlace(ash, "Home", latitude, longitude, null));
    }

    @Test
    void refusesAMissingPosition() {
        assertThrows(IllegalArgumentException.class,
                () -> new SavedPlace(ash, "Home", null, -1.55, null));
    }

    @Test
    void refusesAPlaceWithNoOwner() {
        assertThrows(IllegalArgumentException.class,
                () -> new SavedPlace(null, "Home", 53.8, -1.55, null));
    }

    @Test
    void treatsABlankAddressAsNone() {
        SavedPlace home = new SavedPlace(ash, "Home", 53.8, -1.55, "   ");

        assertNull(home.getAddress());
    }

    @Test
    void shortensAnOverlongAddressRatherThanRefusingIt() {
        SavedPlace home = new SavedPlace(ash, "Home", 53.8, -1.55, "a".repeat(400));

        assertEquals(SavedPlace.MAX_ADDRESS_LENGTH, home.getAddress().length());
    }

    @Test
    void canBeRenamedAndMoved() {
        SavedPlace place = new SavedPlace(ash, "Home", 53.8, -1.55, null);

        place.update("Old home", 51.5, -0.12, "London");

        assertEquals("Old home", place.getName());
        assertEquals(51.5, place.getLatitude());
        assertEquals(-0.12, place.getLongitude());
        assertEquals("London", place.getAddress());
    }
}
