package com.caltal;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.LongSupplier;

// A fixed-window counter: each key may make `limit` requests per window. When
// the window runs out, the count starts again from zero.
//
// Deliberately in memory. That's right for one machine; with several, each
// would keep its own count and the effective limit would multiply — at that
// point the counts belong in something shared, like Redis.
public class RateLimiter {

    public record Decision(boolean allowed, long retryAfterSeconds) {
    }

    private record Window(long startMillis, int count) {
    }

    // Past this many tracked clients, expired windows get swept out, so a flood
    // of different addresses can't grow the map forever.
    private static final int MAX_TRACKED_KEYS = 10_000;

    private final int limit;
    private final long windowMillis;
    private final LongSupplier clock;
    private final Map<String, Window> windows = new ConcurrentHashMap<>();

    // The clock is a parameter so tests can move time forward instead of waiting.
    public RateLimiter(int limit, long windowMillis, LongSupplier clock) {
        if (limit <= 0 || windowMillis <= 0) {
            throw new IllegalArgumentException("Limit and window must both be positive");
        }
        this.limit = limit;
        this.windowMillis = windowMillis;
        this.clock = clock;
    }

    public Decision check(String key) {
        long now = clock.getAsLong();

        if (windows.size() > MAX_TRACKED_KEYS) {
            windows.values().removeIf(window -> now - window.startMillis() >= windowMillis);
        }

        // compute() is atomic per key, so two simultaneous requests from the same
        // address can't both read the same count and both get through.
        Window window = windows.compute(key, (ignored, current) ->
                current == null || now - current.startMillis() >= windowMillis
                        ? new Window(now, 1)
                        : new Window(current.startMillis(), current.count() + 1));

        if (window.count() <= limit) {
            return new Decision(true, 0);
        }

        long remainingMillis = window.startMillis() + windowMillis - now;
        return new Decision(false, Math.max(1, (remainingMillis + 999) / 1000));
    }
}
