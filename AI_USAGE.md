# AI Usage Report

In compliance with the assignment submission requirements, this document truthfully records how I utilized AI tools during the development of this School Admission System, the architecture and planning I established, the mistakes the AI made, and how I caught and corrected them.

---

## 1. System Planning & Architecture Ownership (My Design)

From the beginning, I took full ownership of the system architecture, step-by-step roadmap, and technical design:
* **Roadmap & Execution Plan:** I formulated and followed the 13-step plan (Step 0 to Step 13), deciding the database schema, concurrency locking model, and Docker orchestration.
* **Page-Based Frontend Architecture:** Rather than having a cluttered single-page application, I designed a clean, modular page-based architecture:
  * **Student Admission Portal (`/` via `src/pages/HomePage.tsx`):** Identity management, active countdown hold cards, live seat list, and application history.
  * **Admin Management Portal (`/admin` via `src/pages/AdminPage.tsx`):** Class creation form and real-time class seat monitoring.
  * **Router Orchestration (`src/App.tsx`):** Clean routing connecting both pages wrapped in an `ErrorBoundary`.
* **Multi-Hold State Architecture:** I designed the client-side state machine so that students holding seats in multiple classes can manage all their active holds simultaneously with live countdown timers, with confirmed/cancelled holds automatically transitioning down to their application history.

### AI Tools I Used
1. **Anthropic Claude 3.5 Sonnet:** I used Claude for the backend development, database configuration, xUnit Testcontainers concurrency testing, and backend Dockerization (Steps 0–6).
2. **Google Gemini 3.8 Flash (via Antigravity):** I used Gemini for the frontend development, page-based architecture implementation, full Vitest integration test suite, frontend Dockerization, and final verification (Steps 7–12).

---

## 2. Where I Used AI

I used the AI tools primarily as pair-programming assistants to accelerate implementation:
* Generating boilerplate C# Web API controllers, EF Core entity models (`Class`, `Hold`), and migration scaffolding.
* Formulating raw PostgreSQL row-lock queries (`SELECT ... FOR UPDATE`) and atomic SQL updates.
* Assisting with the `Testcontainers.PostgreSql` test harness setup.
* Generating React TypeScript component boilerplates and Tailwind CSS styling based on my design.
* Providing Dockerfile templates and Nginx runtime configuration.

---

## 3. Where the AI Was Wrong, and How I Caught & Fixed It

Throughout the project, both AI assistants made numerous mistakes ranging from environment issues to major architectural flaws. Here is how I caught and resolved them:

### Part A: Backend & Environment Mistakes 

1. **Concurrency Claim vs Real Evidence:**
   * *The AI's mistake:* Claude claimed that the 5-seat / 50-request concurrency result (5 created, 45 conflicts) could be directly observed in the test execution logs.
   * *How I caught it:* I checked the logs and asked where that came from, because the test logs only showed EF Core SQL queries, not HTTP status codes. The real proof was the assertions inside the test (`Assert.Equal(5, ...)`, `Assert.Equal(45, ...)`), which passed.

2. **PowerShell Quoting Rules for `curl.exe`:**
   * *The AI's mistake:* Several `curl.exe` commands with inline JSON failed because of quoting rules in Windows PowerShell (Claude provided bash-style single quotes `-d '{"name": ...}'`).
   * *How I caught it:* PowerShell threw `curl: option -: is unknown`. I caught the issue and replaced the curl commands with PowerShell `Invoke-RestMethod` and hashtables converted to JSON.

3. **.NET Version Mismatch:**
   * *The AI's mistake:* The assignment plan targeted .NET 8, but my machine has .NET 10 installed (`10.0.403`).
   * *How I caught it:* I checked `dotnet --version` and noticed the discrepancy. Package versions and Docker base images had to be changed to `net10.0` and `mcr.microsoft.com/dotnet/sdk:10.0` / `aspnet:10.0`.

4. **Wrong Expectation in Docker:**
   * *The AI's mistake:* Claude said `GET /classes` would return an empty list `[]` after the first Docker run.
   * *How I caught it:* It did not return an empty list because the Docker volume (`pgdata`) still held data from my earlier local runs. This turned out to be a useful check confirming that data persistence across restarts works as required.

5. **Credentials Mismatch in Compose Healthcheck:**
   * *The AI's mistake:* I changed the database credentials to `admin` / `jotilpassword`, but the Docker Compose healthcheck was still hardcoded to use `app`.
   * *How I caught it:* The container logs showed `role "app" does not exist` repeating every 3 seconds. I caught the error in the logs and updated the healthcheck to `pg_isready -U admin -d admission`.

6. **Instructions and Numbering Ambiguities:**
   * *The AI's mistake:* Some commands were given without stating which folder to run them in (e.g. root vs `backend/src/`), and one step number was mislabelled.
   * *How I caught it:* I noticed the directory confusion and asked for clarification each time to keep the project structure clean.

---

### Part B: Frontend & System Architecture Mistakes 

7. **Architectural Mistake: Monolithic Single-Page vs Separate Admin Page:**
   * *The AI's mistake:* Gemini initially tried to place the admin's "Create Class" form directly on the student admission home page.
   * *How I caught it:* I stopped the AI and told it that students should never see admin forms on their home page:
     > *"admin je new class add krbe ta kintu onno url er moddhe hobe. home page theke krte parbe na. admin page and home page namer 2ta page banano oi 2ta page er moddhe dorkari shob component add krbo then app.tsx e call krbo."*
   * *How I fixed it:* I had Gemini build my page-based architecture with React Router: `/` for student admission (`HomePage.tsx`) and `/admin` for the admin portal (`AdminPage.tsx`).

8. **Architectural Mistake: Single-Hold State Bottleneck:**
   * *The AI's mistake:* Gemini structured the frontend state to track only one single hold (`activeHold: ActiveHoldState | null`).
   * *How I caught it:* When I applied for two different shifts (`Class 6 - Morning Shift` and `Class 6 - Day Shift`) and confirmed the morning shift, the UI remained locked on "CONFIRMED", making it impossible to see the timer or confirm the day shift hold.
   * *How I fixed it:* I caught this architectural flaw and instructed Gemini:
     > *"held e thaka shob application timer shoho upore thakbe confirm kora hole ta niche chole jabe. ekhon jodi more than one application held thake tahole upore more than one application thakbe."*
   * I directed Gemini to refactor the state into an array (`activeHolds: ActiveHoldState[]`) so all running holds show with countdown timers and auto-move down to the history section upon confirmation or cancellation.

9. **UX Mistake: Intrusive Browser Alert on Cancellation:**
   * *The AI's mistake:* Gemini added `if (!confirm(...)) return;` when clicking "বাতিল করুন" (Cancel), triggering an annoying browser alert popup.
   * *How I caught it:* I tested cancelling a hold and found the popup disruptive:
     > *"ami jokhon running application cancel krte chai tokhon amar ekta alert ashe ami eta alert chai na. cancel krle direct cancel hoye jabe."*
   * *How I fixed it:* I instructed Gemini to remove the alert so clicking cancel immediately calls the API and releases the seat.

10. **Logic Mistake: Apply Button on Already-Confirmed Classes:**
    * *The AI's mistake:* In the class list, classes where I had already confirmed admission still showed an active "আবেদন করুন" button (which would fail with 409 Conflict).
    * *How I caught it:* I reviewed the class cards after confirmation and saw the redundant button:
      > *"ami already jei class gulay confirm kre fhelsi oi class er application button ta hide kre dite chacchi eta kra jabe?"*
    * *How I fixed it:* I had Gemini replace the apply button on confirmed classes with a green status badge: `✓ আসন ইতিমধ্যে নিশ্চিত করা হয়েছে`.

11. **Deployment Mistake: Windows CRLF Line Endings:**
    * *The AI's mistake:* Creating `frontend/nginx/40-config.sh` on Windows introduced CRLF line endings, which causes `/bin/sh: 40-config.sh: not found` in Alpine Linux.
    * *How I caught it:* I checked the assignment guidelines regarding line endings and converted the script to Unix LF (`\n`), verifying it with byte inspection.

12. **Testing Mistake: Shallow Component Tests vs Full Integration Tests:**
    * *The AI's mistake:* Gemini initially wrote shallow component tests with hardcoded mock props.
    * *How I caught it:* I asked for real integration tests mirroring my backend `TestApp.cs`:
      > *"tahole ekhon full integration test amar frontend er jonno o banao. kno hard code noy. ekdom abar backend er test er moto."*
    * *How I fixed it:* I had Gemini build `testServer.ts` (an in-memory state-machine backend) and `integration.test.tsx` testing the full user journeys from admin class creation to student application, timer countdown, and payment confirmation.

---

## 4. Conclusion

I used AI tools (**Claude 3.5 Sonnet** and **Gemini 3.8 Flash**) as accelerators for writing code, but I drove the system architecture, caught every logical and structural mistake, and guided the implementation to ensure the project met every functional and non-functional requirement.
