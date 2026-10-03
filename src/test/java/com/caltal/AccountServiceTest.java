package com.caltal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.mockito.InOrder;
import org.springframework.security.crypto.password.PasswordEncoder;

class AccountServiceTest {

    private final UserRepository users = mock(UserRepository.class);
    private final TaskRepository tasks = mock(TaskRepository.class);
    private final PasswordEncoder encoder = mock(PasswordEncoder.class);
    private final JwtService jwt = mock(JwtService.class);

    private final AccountService service = new AccountService(users, tasks, encoder, jwt);

    private User ash() {
        return new User("ash@example.com", "old-hash", "Ash");
    }

    @Test
    void renamesTheAccountAndSavesIt() {
        User user = ash();
        when(users.save(user)).thenReturn(user);

        User renamed = service.rename(user, "  Ashutosh ");

        assertEquals("Ashutosh", renamed.getName());
        verify(users).save(user);
    }

    @Test
    void refusesABlankName() {
        assertThrows(IllegalArgumentException.class, () -> service.rename(ash(), "   "));
        verify(users, never()).save(any(User.class));
    }

    @Test
    void changingThePasswordNeedsTheCurrentOne() {
        User user = ash();
        when(encoder.matches("wrong-guess", "old-hash")).thenReturn(false);

        assertThrows(IllegalArgumentException.class,
                () -> service.changePassword(user, "wrong-guess", "brand-new-pass"));
        verify(users, never()).save(any(User.class));
    }

    @Test
    void aNewPasswordEndsEveryOldSessionAndReturnsAFreshToken() {
        User user = ash();
        when(encoder.matches("current-pass", "old-hash")).thenReturn(true);
        when(encoder.encode("brand-new-pass")).thenReturn("new-hash");
        when(jwt.generateToken(user)).thenReturn("fresh-token");

        AuthResponse response = service.changePassword(user, "current-pass", "brand-new-pass");

        assertEquals("new-hash", user.getPasswordHash());
        assertEquals(1, user.getTokenVersion());
        assertEquals("fresh-token", response.getToken());
        verify(users).save(user);
    }

    @Test
    void aNewPasswordFollowsTheSameRulesAsSigningUp() {
        User user = ash();
        when(encoder.matches("current-pass", "old-hash")).thenReturn(true);

        assertThrows(IllegalArgumentException.class,
                () -> service.changePassword(user, "current-pass", "short"));
        assertThrows(IllegalArgumentException.class,
                () -> service.changePassword(user, "current-pass", "x".repeat(73)));
    }

    @Test
    void aGoogleOnlyAccountHasNoPasswordToChange() {
        User googleOnly = User.fromGoogle("ash@gmail.com", "Ash", "google-1");

        assertThrows(IllegalArgumentException.class,
                () -> service.changePassword(googleOnly, null, "brand-new-pass"));
    }

    @Test
    void deletingAnAccountRemovesItsTasksBeforeTheUser() {
        User user = ash();
        when(encoder.matches("current-pass", "old-hash")).thenReturn(true);

        service.deleteAccount(user, "current-pass");

        InOrder order = inOrder(tasks, users);
        order.verify(tasks).deleteAllByOwner(user);
        order.verify(users).delete(user);
    }

    @Test
    void deletingAnAccountNeedsTheRightPassword() {
        User user = ash();
        when(encoder.matches("wrong-guess", "old-hash")).thenReturn(false);

        assertThrows(IllegalArgumentException.class,
                () -> service.deleteAccount(user, "wrong-guess"));
        verify(tasks, never()).deleteAllByOwner(any(User.class));
        verify(users, never()).delete(any(User.class));
    }

    @Test
    void aGoogleOnlyAccountCanBeDeletedWithoutAPassword() {
        User googleOnly = User.fromGoogle("ash@gmail.com", "Ash", "google-1");

        service.deleteAccount(googleOnly, null);

        verify(users).delete(googleOnly);
    }
}
