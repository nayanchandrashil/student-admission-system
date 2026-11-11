# School Admission System

An online, first-come, first-served student admission system for a private school, built with **.NET 10 Web API**, **PostgreSQL 16**, and **React 18 (Vite + TypeScript)**, fully containerized with **Docker & Docker Compose**.

---

## Architecture Overview

* **Backend (`backend/`):** .NET 10 Web API, Entity Framework Core with Npgsql, PostgreSQL row-level locks, atomic updates, Testcontainers integration testing.
* **Frontend (`frontend/`):** React 18 (Vite, TypeScript, Tailwind CSS), Nginx 1.27 Alpine production runtime with runtime environment configuration (`40-config.sh`).
* **Database (`db`):** PostgreSQL 16 with persistent volume `pgdata`.
* **Security & Identity:** Passwordless identity using a 17-digit birth registration number (`X-Student-Id`).
* **Devops:** Docker & Docker Compose for containerized deployment.

---

## Quick Start (Docker)

To build and run the entire application stack:

```bash
docker compose up --build
```

After startup:
* **Student Admission Portal:** [http://localhost:3000](http://localhost:3000)
* **Admin Management Portal:** [http://localhost:3000/admin](http://localhost:3000/admin)
* **Backend API:** [http://localhost:8080](http://localhost:8080)
* **API Health & Classes:** [http://localhost:8080/classes](http://localhost:8080/classes)

To stop the containers while preserving database records:
```bash
docker compose down
```

To stop and wipe database volumes for a clean slate:
```bash
docker compose down -v
```

---

## Environment Variables

| Variable | Description | Default | Configured In |
| :--- | :--- | :--- | :--- |
| `HOLD_DURATION_SECONDS` | Seat hold countdown duration in seconds | `600` (10 mins) | `api` (docker-compose.yml) |
| `ConnectionStrings__Default` | PostgreSQL database connection string | `Host=db;Port=5432;Database=admission;Username=admin;Password=jotilpassword` | `api` (docker-compose.yml) |
| `API_BASE_URL` | Frontend client-facing backend API URL | `http://localhost:8080` | `web` (docker-compose.yml / 40-config.sh) |
| `ASPNETCORE_URLS` | ASP.NET Core internal listening URL | `http://+:8080` | `api` (docker-compose.yml) |

---

## Running Automated Tests

### 1. Backend Tests (xUnit + Testcontainers PostgreSQL)
The backend tests run against real PostgreSQL containers spun up via Testcontainers, verifying transaction isolation, 50-student concurrency, and the complete hold lifecycle.

```bash
dotnet test backend/tests/SchoolAdmission.Tests/SchoolAdmission.Tests.csproj
```

### 2. Frontend Tests (Vitest + React Testing Library)
The frontend tests include unit component tests and a full integration test suite simulating real user flows (Admin class creation, 17-digit validation, hold countdown, fee confirmation, and cancellation).

```bash
cd frontend
npm test
```

To run frontend tests with coverage / single run:
```bash
cd frontend
npm run test
```

---

## API Specification

All endpoints communicate using JSON with camelCase fields. `X-Student-Id` header is required for student endpoints and must be exactly 17 digits.

| # | Method | Path | Header | Request Body | Success Response |
|---|---|---|---|---|---|
| 1 | `POST` | `/classes` | none | `{ "name", "totalSeats" }` | `201 Created`: `{ id, name, totalSeats }` |
| 2 | `GET` | `/classes` | none | none | `200 OK`: `[{ id, name, totalSeats, heldSeats, confirmedSeats, availableSeats }]` |
| 3 | `GET` | `/classes/{classId}` | none | none | `200 OK`: `{ id, name, totalSeats, heldSeats, confirmedSeats, availableSeats }` |
| 4 | `POST` | `/classes/{classId}/holds` | `X-Student-Id` | none | `201 Created`: `{ holdId, classId, studentId, status, expiresAt }` (409 if full or duplicate) |
| 5 | `GET` | `/holds/{holdId}` | none | none | `200 OK`: `{ holdId, classId, status, expiresAt }` |
| 6 | `POST` | `/holds/{holdId}/confirm` | `X-Student-Id` | none | `200 OK`: `{ holdId, status: "CONFIRMED" }` |
| 7 | `DELETE` | `/holds/{holdId}` | `X-Student-Id` | none | `204 NoContent` |
| 8 | `GET` | `/me/holds` | `X-Student-Id` | none | `200 OK`: `[{ holdId, classId, className, status, expiresAt }]` |

* **Statuses:** `HELD`, `CONFIRMED`, `EXPIRED`, `CANCELLED`
* **Time Format:** ISO 8601 UTC truncated to seconds (`2026-11-01T04:10:00Z`).

