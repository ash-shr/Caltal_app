package com.caltal;

import java.util.List;

import org.springframework.stereotype.Service;

@Service
public class SavedPlaceService {

    // Enough for Home, Work, family, the gym and the usual shops, while keeping
    // the list short enough to scroll through quickly.
    static final int MAX_PLACES = 20;

    private final SavedPlaceRepository places;

    public SavedPlaceService(SavedPlaceRepository places) {
        this.places = places;
    }

    public List<SavedPlace> list(User owner) {
        return places.findAllByOwnerOrderByNameAsc(owner);
    }

    public SavedPlace add(User owner, String name, Double latitude, Double longitude, String address) {
        if (places.countByOwner(owner) >= MAX_PLACES) {
            throw new IllegalArgumentException("You can save up to " + MAX_PLACES + " places");
        }

        // Built first, so the name is already trimmed when checking for a clash
        SavedPlace place = new SavedPlace(owner, name, latitude, longitude, address);

        if (places.existsByOwnerAndNameKey(owner, place.getNameKey())) {
            throw new PlaceNameTakenException(place.getName());
        }

        return places.save(place);
    }

    public SavedPlace update(User owner, Long id, String name, Double latitude, Double longitude,
            String address) {
        SavedPlace place = findOwned(owner, id);
        place.update(name, latitude, longitude, address);

        if (places.existsByOwnerAndNameKeyAndIdNot(owner, place.getNameKey(), id)) {
            throw new PlaceNameTakenException(place.getName());
        }

        return places.save(place);
    }

    public void delete(User owner, Long id) {
        places.delete(findOwned(owner, id));
    }

    private SavedPlace findOwned(User owner, Long id) {
        return places.findByIdAndOwner(id, owner)
                .orElseThrow(() -> new PlaceNotFoundException(id));
    }
}
