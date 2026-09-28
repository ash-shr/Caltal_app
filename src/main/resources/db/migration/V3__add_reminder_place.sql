-- A task can name a second place: where the reminder should fire, when that is
-- somewhere other than the task's own location. All three columns are nullable,
-- and existing tasks keep reminding at their own location.
ALTER TABLE task ADD COLUMN trigger_latitude  DOUBLE PRECISION;
ALTER TABLE task ADD COLUMN trigger_longitude DOUBLE PRECISION;
ALTER TABLE task ADD COLUMN trigger_radius    INTEGER;
