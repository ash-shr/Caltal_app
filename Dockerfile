# --- Stage 1: build the React app -------------------------------------------
FROM node:22-alpine AS frontend
WORKDIR /frontend

# Dependencies first, so a source-only change doesn't reinstall everything
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
# The map key comes in from the deploy (the MAPTILER_KEY secret on GitHub,
# see .github/workflows/fly-deploy.yml), so it isn't kept in the code. Vite
# reads VITE_ variables from the environment as well as from .env files.
# Without it the website's map would be blank, so the build stops instead.
# A deploy by hand needs it too: fly deploy --build-arg VITE_MAP_KEY=...
ARG VITE_MAP_KEY
RUN test -n "$VITE_MAP_KEY" || (echo "VITE_MAP_KEY build argument is missing" && exit 1)
RUN npm run build

# --- Stage 2: build the Spring Boot jar --------------------------------------
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build

COPY pom.xml .
RUN mvn dependency:go-offline

COPY src ./src

# Anything on the classpath under /static is served by Spring Boot, so the built
# React app ends up inside the same jar and is served from the same origin.
COPY --from=frontend /frontend/dist ./src/main/resources/static

RUN mvn package -DskipTests

# --- Stage 3: the image that actually runs -----------------------------------
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /build/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
