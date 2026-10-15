package com.caltal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;

class SavedPlaceServiceTest {

    private final SavedPlaceRepository repository = mock(SavedPlaceRepository.class);
    private final SavedPlaceService service = new SavedPlaceService(repository);

    private final User ash = new User("ash@example.com", "hash", "Ash");

    @Test
    void savesANewPlace() {
        when(repository.save(any(SavedPlace.class))).thenAnswer(call -> call.getArgument(0));

        SavedPlace saved = service.add(ash, " Home ", 53.8, -1.55, "Leeds");

        assertEquals("Home", saved.getName());
        verify(repository).save(any(SavedPlace.class));
    }

    @Test
    void stopsAtTwentyPlaces() {
        when(repository.countByOwner(ash)).thenReturn((long) SavedPlaceService.MAX_PLACES);

        assertThrows(IllegalArgumentException.class,
                () -> service.add(ash, "One too many", 53.8, -1.55, null));
        verify(repository, never()).save(any(SavedPlace.class));
    }

    @Test
    void refusesASecondPlaceWithTheSameNameWhateverTheCapitals() {
        // Compared as a trimmed, lower-case key
        when(repository.existsByOwnerAndNameKey(ash, "home")).thenReturn(true);

        assertThrows(PlaceNameTakenException.class,
                () -> service.add(ash, "  HOME ", 53.8, -1.55, null));
        verify(repository, never()).save(any(SavedPlace.class));
    }

    @Test
    void canRenameAPlaceWithoutClashingWithItself() {
        SavedPlace home = new SavedPlace(ash, "Home", 53.8, -1.55, null);
        when(repository.findByIdAndOwner(7L, ash)).thenReturn(Optional.of(home));
        when(repository.existsByOwnerAndNameKeyAndIdNot(ash, "home", 7L)).thenReturn(false);
        when(repository.save(home)).thenReturn(home);

        SavedPlace renamed = service.update(ash, 7L, "HOME", 53.8, -1.55, null);

        assertEquals("HOME", renamed.getName());
    }

    @Test
    void refusesToRenameAPlaceToAnotherPlacesName() {
        SavedPlace gym = new SavedPlace(ash, "Gym", 53.8, -1.55, null);
        when(repository.findByIdAndOwner(8L, ash)).thenReturn(Optional.of(gym));
        when(repository.existsByOwnerAndNameKeyAndIdNot(ash, "home", 8L)).thenReturn(true);

        assertThrows(PlaceNameTakenException.class,
                () -> service.update(ash, 8L, "Home", 53.8, -1.55, null));
        verify(repository, never()).save(any(SavedPlace.class));
    }

    @Test
    void someoneElsesPlaceCannotBeChangedOrDeleted() {
        // The lookup includes the owner, so another person's place is simply not found
        when(repository.findByIdAndOwner(9L, ash)).thenReturn(Optional.empty());

        assertThrows(PlaceNotFoundException.class,
                () -> service.update(ash, 9L, "Mine now", 53.8, -1.55, null));
        assertThrows(PlaceNotFoundException.class, () -> service.delete(ash, 9L));
        verify(repository, never()).delete(any(SavedPlace.class));
    }

    @Test
    void deletesAnOwnedPlace() {
        SavedPlace home = new SavedPlace(ash, "Home", 53.8, -1.55, null);
        when(repository.findByIdAndOwner(7L, ash)).thenReturn(Optional.of(home));

        service.delete(ash, 7L);

        verify(repository).delete(home);
    }
}
