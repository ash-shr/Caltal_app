package com.caltal;

import java.util.List;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/places")
public class SavedPlaceController {

    private final SavedPlaceService service;
    private final CurrentUserService currentUser;

    public SavedPlaceController(SavedPlaceService service, CurrentUserService currentUser) {
        this.service = service;
        this.currentUser = currentUser;
    }

    @GetMapping
    public List<SavedPlace> list() {
        return service.list(currentUser.get());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SavedPlace add(@RequestBody SavedPlaceRequest request) {
        return service.add(
                currentUser.get(),
                request.name(),
                request.latitude(),
                request.longitude(),
                request.address());
    }

    @PutMapping("/{id}")
    public SavedPlace update(@PathVariable Long id, @RequestBody SavedPlaceRequest request) {
        return service.update(
                currentUser.get(),
                id,
                request.name(),
                request.latitude(),
                request.longitude(),
                request.address());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.delete(currentUser.get(), id);
    }

    @ExceptionHandler(PlaceNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public String handleNotFound(PlaceNotFoundException exception) {
        return exception.getMessage();
    }

    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public String handleInvalidRequest(IllegalArgumentException exception) {
        return exception.getMessage();
    }

    // A name already in use is a conflict with what's saved, not a malformed
    // request, so 409. The service's check catches it normally; when two saves
    // with the same name arrive at the same moment, both can pass that check
    // and the database's unique rule stops the second — same answer either way.
    @ExceptionHandler(PlaceNameTakenException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public String handleNameTaken(PlaceNameTakenException exception) {
        return exception.getMessage();
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public String handleClash(DataIntegrityViolationException exception) {
        return "You already have a place with that name";
    }

    public record SavedPlaceRequest(String name, Double latitude, Double longitude, String address) {
    }
}
