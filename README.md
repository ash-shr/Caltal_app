# Caltal

A location-aware task service. Tasks are pinned to a place with a radius, and the API tells you which of your tasks you're currently near — so "buy milk" surfaces when you're by the shop rather than when you're at home.

**Live API:** https://caltal.fly.dev/api/tasks

Built as a Spring Boot REST API with PostgreSQL, containerised, and deployed to Fly.io. Also deployed to AWS ECS Fargate with RDS as an exercise in cloud infrastructure.

## What it does

Each task has a name, a latitude and longitude, and a radius in metres. Given a user's current position, the service returns the incomplete tasks whose geofence that position falls inside.

Distance is calculated with the Haversine formula — spherical rather than flat-plane, so it stays accurate over larger distances and near the poles.

## Tech stack

- **Java 21**, **Spring Boot 3.5**
- **Spring Data JPA** / Hibernate
- **PostgreSQL 16** (H2 in tests)
- **JUnit 5**, **Mockito**, **MockMvc**
- **Maven**
- **Docker** / Docker Compose
- **GitHub Actions** CI, **SonarCloud** static analysis
- - Deployed on **Fly.io**; also deployed to **AWS ECS Fargate** with **RDS PostgreSQL**

## Architecture

```
HTTP request
    ↓
TaskController      REST endpoints, request/response handling
    ↓
TaskService         business logic — which tasks are nearby, completion rules
    ↓
TaskRepository      interface defining storage
    ↓
JpaTaskRepository   JPA-backed implementation (InMemoryTaskRepository for tests)
```

Each layer depends on the one below through an interface, with dependencies supplied by constructor injection. The service layer has no knowledge of HTTP or of how tasks are persisted — swapping the in-memory repository for the JPA one required no changes to `TaskService` or its tests.

Validation lives in the `Task` domain object itself: latitude, longitude and radius are checked in the setters, which the constructor routes through, so an invalid task cannot be created. The controller translates the resulting `IllegalArgumentException` into a 400 response.

## Running it

**Requirements:** Docker and Docker Compose.

```bash
mvn clean package
docker compose up --build
```

The API is then on `http://localhost:8080`. Postgres runs as a second container with a named volume, so data survives `docker compose down`.

To run without Docker you'll need a local PostgreSQL and JDK 21:

```bash
mvn spring-boot:run
```

Connection details are read from `DB_URL`, `DB_USER` and `DB_PASSWORD` environment variables, falling back to `localhost:5432/caltal` if unset.

## Frontend

A React client lives in `frontend/`, built with Vite. It lists tasks and creates new ones against the live API.

```bash
cd frontend
npm install
npm run dev
```

Runs on `http://localhost:5173`. The backend allows cross-origin requests from that address.

## API

**List all tasks**
```
GET /api/tasks
```

**Tasks due on a date**
```
GET /api/tasks/on?date=2026-09-21
```
Returns all tasks due on the given date. Dates use ISO format (`YYYY-MM-DD`).

**Find tasks near a position**
```
GET /api/tasks/nearby?lat=53.7961&lon=-1.5451
```
Returns incomplete tasks whose geofence contains the given point.

**Create a task**
```
POST /api/tasks
Content-Type: application/json

{
  "name": "buy milk",
  "latitude": 53.7960,
  "longitude": -1.5450,
  "radius": 200,
  "dueDate": "2026-09-21"
}
```
Returns `201 Created` with the saved task. Invalid coordinates or a missing due date return `400 Bad Request` with the validation message.

Example:

```bash
curl -X POST https://caltal.fly.dev/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"name":"buy milk","latitude":53.7960,"longitude":-1.5450,"radius":200,"dueDate":"2026-09-21"}'
```

## Tests

## Tests

```bash
mvn test
```

18 tests across four classes:

- `TaskTest` — domain validation, completion, geofence calculation
- `TaskServiceTest` — filtering by location and by date, including a hand-written fake repository used to verify the service calls through to storage
- `TaskControllerTest` — the web layer via `@WebMvcTest` and MockMvc, with the service mocked
- `JpaTaskRepositoryTest` — the real entity mapping against an in-memory H2 database via `@DataJpaTest`

The first three need no database or running server and complete in a couple of seconds. The JPA test exists because unit tests against an in-memory repository can't catch mapping errors — a misplaced `@Id` annotation passed every other test and only failed once deployed.

The geofence logic was built test-first: the tests were written against `isWithinRange` before it existed, implemented with a flat-plane approximation to get them passing, then refactored to Haversine with the unchanged tests confirming the behaviour hadn't shifted.

## CI

Every push and pull request runs the full build and test suite on a clean Ubuntu runner, followed by a SonarCloud scan for bugs, vulnerabilities and maintainability issues.

## Deployment
The live instance runs on Fly.io — the same Dockerfile used locally, with database credentials supplied as Fly secrets rather than baked into the image. The machine scales to zero when idle, so the first request after a period of inactivity takes a few seconds to wake.

It was also deployed to AWS as a separate exercise: image in ECR, container on ECS Fargate, database on RDS, with security groups restricting database access to the task's security group and an IAM execution role for image pulls and log delivery.

Both deployments read the same three environment variables (`DB_URL`, `DB_USER`, `DB_PASSWORD`), so the identical image runs locally, on Fly and on AWS with no rebuild.

## Notes and known limitations

- **Schema management** uses Hibernate's `ddl-auto=update`, which fails silently when it can't apply a change — the app starts against a mismatched schema. Flyway migrations would make schema changes explicit and fail the deploy instead.
- - **Database credentials** are supplied as environment variables. On Fly these come from encrypted secrets; the AWS deployment passed them in the task definition, which should move to Secrets Manager.
- **No authentication.** Every task is visible to every caller; there's no concept of a user yet.
- **No client.** This is the backend only — there's no web or mobile frontend at present.
- **Frontend is early.** The React client lists and creates tasks; the calendar view, styling and geolocation are in progress.
