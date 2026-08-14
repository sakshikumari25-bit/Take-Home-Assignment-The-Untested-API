# Development Notes — Task Manager API

This document details the architectural analysis, bug investigation, design decisions, implementation details, trade-offs, and verification results for the Task Manager API take-home assignment.

---

## 1. Architectural Overview & Understanding

The application is a lightweight RESTful API built with **Node.js** and **Express.js**, following a standard 3-layer architecture:

1. **Routing Layer (`src/routes/tasks.js`)**: Handles HTTP requests, extracts parameters/query strings/bodies, invokes validation helpers, interacts with the service layer, and maps service responses to appropriate HTTP status codes and JSON outputs.
2. **Service & Data Layer (`src/services/taskService.js`)**: Implements business logic and maintains an in-memory data store (`let tasks = []`). Provides CRUD operations, filtering, pagination, statistics calculation, task completion, and assignment. Includes a `_reset()` helper for test isolation.
3. **Validation & Utilities Layer (`src/utils/validators.js`)**: Implements input validation functions (`validateCreateTask`, `validateUpdateTask`, `validateAssignTask`) to validate payload types, non-empty titles/assignees, valid status/priority enums, and valid ISO date strings.
4. **Application Entry Point (`src/app.js`)**: Configures Express middleware (`express.json()`), mounts router endpoints, and provides centralized error handling.

---

## 2. Summary of Discovered Bugs & Remediation

During comprehensive code review and automated test suite creation, **10 distinct bugs** were identified across all source files:

1. **BUG-01 (High)**: `getByStatus()` used `String.prototype.includes` instead of exact equality (`===`), causing query `status=do` to match `todo` and `done`.
2. **BUG-02 (High)**: `getPaginated()` calculated offset as `page * limit` instead of `(page - 1) * limit`, causing `page=1` to skip the first page of items.
3. **BUG-03 (Medium)**: `completeTask()` hardcoded `priority: 'medium'`, overriding original task priority when completed.
4. **BUG-04 (Medium)**: `GET /tasks` route handler executed early return when `status` was present, making status filtering and `page`/`limit` pagination mutually exclusive.
5. **BUG-05 (Medium)**: `update()` performed shallow merge without stripping system fields (`id`, `createdAt`, `completedAt`), allowing clients to mutate immutable metadata.
6. **BUG-06 (High)**: Global error handler in `app.js` set HTTP 500 for malformed JSON parsing errors thrown by `express.json()`, violating HTTP standards.
7. **BUG-07 (High)**: `validators.js` accessed properties directly on `body` without null/object type assertions, causing `TypeError` server crashes on `null` or non-object payloads.
8. **BUG-08 (Low)**: `validators.js` omitted type check on optional `description` field, allowing non-string values.
9. **BUG-09 (Medium)**: `completeTask()` unconditionally generated a new `completedAt` timestamp, overwriting history when re-completing an already completed task.
10. **BUG-10 (Medium)**: `update()` did not manage `completedAt` when updating `status` via `PUT`, leaving done tasks with null timestamps or active tasks with past timestamps.

### Fix Reasoning
All 10 bugs were fixed cleanly at their root causes without introducing breaking changes or architectural redesigns. Fixing BUG-06 and BUG-07 prevents server crashes and ensures consistent `400 Bad Request` responses for client input errors. Fixing BUG-01 through BUG-05 and BUG-09/10 enforces data integrity and API spec correctness.

---

## 3. `PATCH /tasks/:id/assign` Feature Implementation

### Feature Specification
The `PATCH /tasks/:id/assign` endpoint allows assigning or re-assigning a task to a user.

### Endpoint Interface
- **HTTP Method:** `PATCH`
- **URL Path:** `/tasks/:id/assign`
- **Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "assignee": "Jane Doe"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "id": "c9b1d8e0-1234-4567-89ab-cdef01234567",
    "title": "Build feature",
    "description": "Task description",
    "status": "in_progress",
    "priority": "high",
    "dueDate": "2026-12-31T23:59:59.000Z",
    "assignee": "Jane Doe",
    "completedAt": null,
    "createdAt": "2026-08-14T18:00:00.000Z"
  }
  ```
- **Error Responses:**
  - `400 Bad Request` (Missing, invalid type, empty, or whitespace-only assignee name):
    ```json
    { "error": "assignee is required and must be a non-empty string" }
    ```
  - `404 Not Found` (Task ID does not exist):
    ```json
    { "error": "Task not found" }
    ```

---

## 4. Key Design Decisions

### Validation Decisions
1. **Assignee Payload:** Evaluated `body` as a non-null object. The `assignee` field must be a non-empty string.
2. **Whitespace Trimming:** Leading and trailing whitespace is automatically trimmed before storage (`assignee.trim()`).
3. **Re-assignment:** Updating an already assigned task with a new assignee string succeeds and replaces the assignee value seamlessly.

### HTTP Status Code Decisions
- `200 OK`: Successful task update.
- `201 Created`: Successful task creation.
- `204 No Content`: Successful task deletion.
- `400 Bad Request`: Input validation failures, missing mandatory fields, invalid dates/enums, or malformed JSON payloads.
- `404 Not Found`: Operating on a non-existent task ID (`PUT`, `DELETE`, `PATCH /complete`, `PATCH /assign`).
- `500 Internal Server Error`: Unhandled server runtime exceptions.

### Edge Cases Handled & Tested
- Missing required fields in `POST` / `PUT` / `PATCH`.
- Invalid data types (numbers, booleans, arrays, null) passed to text/enum fields.
- Non-existent task IDs across all mutative routes.
- Pagination bounds (e.g. `page=0`, negative limit, limit exceeding array bounds).
- Combining query parameters (`status` + `page` + `limit`).
- Malformed JSON payloads in HTTP requests.
- Re-completing already completed tasks (timestamp idempotency).
- Overwriting read-only system metadata (`id`, `createdAt`, `completedAt`).

---

## 5. Surprises & Trade-offs

### Surprises
- **Pagination Off-by-One:** Calculating 1-based page offset as `page * limit` meant that querying page 1 skipped the first page completely.
- **Priority Degradation:** Marking tasks as complete involuntarily downgraded high-priority tasks to medium priority.
- **JSON Error Handling in Express:** Default Express error handling for invalid JSON body syntax returns HTTP status 500 unless explicitly caught by checking `err instanceof SyntaxError && err.status === 400`.

### Trade-offs & Assumptions
- **In-Memory Store:** The API uses an in-memory JS array for storage. Data is transient across server restarts. In a production scenario, this would be backed by PostgreSQL or MongoDB.
- **UUID Format:** Task IDs generated use UUID v4. Route handlers treat task IDs as opaque string identifiers.

---

## 6. Verification Summary

- **Total Test Cases:** 65 automated tests (Unit & Integration).
- **Test Results:** 65 Passed, 0 Failed, 0 Skipped.
- **Code Coverage:**
  - `src/services/taskService.js`: **100% Statements / 100% Lines**
  - `src/routes/tasks.js`: **100% Statements / 100% Lines**
  - `src/utils/validators.js`: **100% Statements / 100% Lines**
  - Overall Project Coverage: **97.66% Statements / 97.45% Lines**
