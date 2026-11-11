# Design Decisions and Assumptions

This document outlines the architectural decisions, trade-offs, and behavioral assumptions implemented in the School Admission System.

---

## 1. Concurrency Handling & Seat Integrity

### Why Row-Level Locking (`SELECT ... FOR UPDATE`)?
In a first-come, first-served admission system, high concurrency occurs when many applicants apply for a limited number of seats simultaneously.
To prevent over-allocation (where `held + confirmed > totalSeats`), we use database row-level locking:

1. **Transaction Scope:** Every hold creation request starts an explicit database transaction (`BeginTransactionAsync`).
2. **Row Lock:** The class record is selected using:
   ```sql
   SELECT * FROM "Classes" WHERE "Id" = @id FOR UPDATE
   ```
3. **Serialization:** Any other concurrent request attempting to apply for a seat in the same class will wait at the database level until the current transaction commits or rolls back.
4. **Active Capacity Verification:** Inside the locked transaction, active holds are evaluated:
   ```csharp
   activeCount = count(h => h.ClassId == classId && ((h.Status == HELD && h.ExpiresAt > now) || h.Status == CONFIRMED));
   if (activeCount >= class.TotalSeats) return 409 Conflict;
   ```
5. **No Counter Column:** A `counter` column on the `Classes` table was intentionally avoided. Counter columns are prone to drift, deadlocks, and desynchronization when holds expire silently. Instead, seats are computed dynamically:
   * `heldSeats` = number of `HELD` holds where `expires_at > now`
   * `confirmedSeats` = number of `CONFIRMED` holds
   * `availableSeats` = `totalSeats - heldSeats - confirmedSeats`

### Multi-Process Safety (Bonus Requirement)
Because the lock resides strictly inside the PostgreSQL database engine (`FOR UPDATE`), it is completely agnostic to the number of backend instances. Whether one backend process or ten backend processes run concurrently across different containers or servers, PostgreSQL serializes modifications to the class row, ensuring `held + confirmed <= totalSeats` holds true under any load.

---

## 2. Confirmation and Cancellation Atomicity

Confirmation uses a single atomic SQL statement:
```sql
UPDATE "Holds"
SET "Status" = 'CONFIRMED'
WHERE "Id" = @id AND "StudentId" = @studentId AND "Status" = 'HELD' AND "ExpiresAt" > @now;
```
* If exactly 1 row is modified, the confirmation is successful (`200 OK`).
* If 0 rows are modified, the system queries the hold to return the exact HTTP status:
  * Hold does not exist $\rightarrow$ `404 Not Found`
  * Hold belongs to another student $\rightarrow$ `403 Forbidden`
  * Hold was already confirmed $\rightarrow$ `200 OK` (idempotent, seat count does not increase)
  * Hold has expired or was cancelled $\rightarrow$ `409 Conflict`

---

## 3. Assumptions & Edge Case Decisions Matrix

| Situation | Decision | Reason / Rationale |
| :--- | :---: | :--- |
| `X-Student-Id` header missing or not 17 digits | **400 Bad Request** | The 17-digit birth registration number is the sole student identity. Malformed or missing IDs are rejected before reaching database logic. |
| Class or Hold not found | **404 Not Found** | Standard REST semantics for nonexistent resources. |
| Confirming or cancelling someone else's hold | **403 Forbidden** | Authorization boundary: only the student who initiated the hold can modify it. |
| Applying again to the same class when holding active/confirmed seat | **409 Conflict** | Rule #3 states a student cannot hold more than one active seat in one class. Applying to different classes is permitted. |
| Confirming an expired hold | **409 Conflict** | Once expiry time passes, the held seat is released back to the general pool and cannot be paid for. |
| Confirming an already confirmed hold | **200 OK** | Idempotent operation: confirms success without increasing confirmed seats. |
| Cancelling a `HELD` hold | **204 NoContent** | Cancelling releases the hold immediately, returning the seat to available status. |
| Cancelling a `CONFIRMED` hold | **409 Conflict** | Once admission is confirmed and fee paid, self-service cancellation is disabled; official school administrative intervention is required. |
| Empty class name or `totalSeats <= 0` | **400 Bad Request** | Input validation ensures meaningful classes with positive seat counts. |
| Two classes with the same name | **Allowed** | Classes are uniquely identified by GUID-based IDs (`c_...`). Schools may operate duplicate shift names across different sections. |
| Consistent Error Body | **`{ "message": "..." }`** | A uniform JSON structure guarantees clean consumption and user-friendly error translation across the frontend. |
| Expiry detection on read (`GET /holds/{id}`) | **Dynamically computed as `EXPIRED`** | Eliminates reliance on background cron jobs. If UTC time has passed `expiresAt`, the hold is reported as `EXPIRED` instantly. |
| Frontend Port | **`3000`** | Mapped from container port 80 to host port 3000 to avoid conflicting with common developer ports. |
| Time Handling | **UTC & Truncated to Seconds** | All database timestamps and comparisons use UTC, with sub-second precision truncated to avoid clock-skew mismatches between client and server. |

