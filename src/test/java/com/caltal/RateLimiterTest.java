package com.caltal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.concurrent.atomic.AtomicLong;

import org.junit.jupiter.api.Test;

class RateLimiterTest {

    // A clock the test can move by hand, so nothing has to wait a real minute
    private final AtomicLong now = new AtomicLong(1_000_000);

    private RateLimiter limiter(int limit, long windowMillis) {
        return new RateLimiter(limit, windowMillis, now::get);
    }

    @Test
    void allowsRequestsUpToTheLimit() {
        RateLimiter limiter = limiter(3, 60_000);

        assertTrue(limiter.check("1.2.3.4").allowed());
        assertTrue(limiter.check("1.2.3.4").allowed());
        assertTrue(limiter.check("1.2.3.4").allowed());
    }

    @Test
    void blocksTheRequestAfterTheLimitAndSaysWhenToRetry() {
        RateLimiter limiter = limiter(2, 60_000);
        limiter.check("1.2.3.4");
        limiter.check("1.2.3.4");

        now.addAndGet(15_000);
        RateLimiter.Decision decision = limiter.check("1.2.3.4");

        assertFalse(decision.allowed());
        assertEquals(45, decision.retryAfterSeconds());
    }

    @Test
    void startsCountingAgainOnceTheWindowHasPassed() {
        RateLimiter limiter = limiter(1, 60_000);
        limiter.check("1.2.3.4");
        assertFalse(limiter.check("1.2.3.4").allowed());

        now.addAndGet(60_000);

        assertTrue(limiter.check("1.2.3.4").allowed());
    }

    @Test
    void countsEachClientSeparately() {
        RateLimiter limiter = limiter(1, 60_000);
        limiter.check("1.2.3.4");

        assertFalse(limiter.check("1.2.3.4").allowed());
        assertTrue(limiter.check("5.6.7.8").allowed());
    }

    @Test
    void rejectsANonsenseConfiguration() {
        assertThrows(IllegalArgumentException.class, () -> limiter(0, 60_000));
        assertThrows(IllegalArgumentException.class, () -> limiter(5, 0));
    }
}
