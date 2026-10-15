package com.caltal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

// Runs against a real (in-memory) database, with the real migrations, so it
// also checks that V6 matches the SavedPlace class.
@DataJpaTest
class SavedPlaceRepositoryTest {

    @Autowired
    private SavedPlaceRepository places;

    @Autowired
    private UserRepository users;

    @Test
    void listsOnlyTheOwnersPlacesInNameOrder() {
        User ash = users.save(new User("ash@example.com", "hash", "Ash"));
        User sam = users.save(new User("sam@example.com", "hash", "Sam"));
        places.save(new SavedPlace(ash, "Work", 53.79, -1.54, null));
        places.save(new SavedPlace(ash, "Gym", 53.80, -1.56, null));
        places.save(new SavedPlace(sam, "Home", 51.5, -0.12, null));

        List<SavedPlace> ashs = places.findAllByOwnerOrderByNameAsc(ash);

        assertEquals(List.of("Gym", "Work"), ashs.stream().map(SavedPlace::getName).toList());
    }

    @Test
    void findsNameClashesWhateverTheCapitalsButOnlyForTheSameOwner() {
        User ash = users.save(new User("ash@example.com", "hash", "Ash"));
        User sam = users.save(new User("sam@example.com", "hash", "Sam"));
        SavedPlace home = places.save(new SavedPlace(ash, "Home", 53.8, -1.55, null));

        assertTrue(places.existsByOwnerAndNameKey(ash, SavedPlace.keyFor("HOME")));
        assertFalse(places.existsByOwnerAndNameKey(sam, SavedPlace.keyFor("Home")));
        assertFalse(places.existsByOwnerAndNameKeyAndIdNot(ash, "home", home.getId()));
    }

    @Test
    void deletesEveryPlaceOfOneOwnerAndNoOneElses() {
        User ash = users.save(new User("ash@example.com", "hash", "Ash"));
        User sam = users.save(new User("sam@example.com", "hash", "Sam"));
        places.save(new SavedPlace(ash, "Home", 53.8, -1.55, null));
        places.save(new SavedPlace(sam, "Home", 51.5, -0.12, null));

        places.deleteAllByOwner(ash);

        assertEquals(0, places.countByOwner(ash));
        assertEquals(1, places.countByOwner(sam));
    }
}
