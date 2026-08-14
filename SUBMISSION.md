# Take-Home Assignment Submission — The Untested API

**Candidate:** Full Stack Developer Intern Candidate  
**Repository:** Task Manager API (`task-api`)  

---

## Executive Summary

This submission includes:
1. **Full Automated Test Suite**: 65 unit and integration tests using Jest and Supertest with **97.66% code coverage** (100% on routes, services, and validators).
2. **Bug Report (`BUG_REPORT.md`)**: Detailed breakdown of 10 identified bugs (high, medium, and low severity) found across all components.
3. **Bug Remediation**: Complete fixes for all 10 identified bugs in `src/app.js`, `src/services/taskService.js`, `src/routes/tasks.js`, and `src/utils/validators.js`.
4. **New Feature (`PATCH /tasks/:id/assign`)**: Implemented REST endpoint for task assignment with strict validation, error handling, and 100% test coverage.
5. **Development Notes (`DEVELOPMENT_NOTES.md`)**: Comprehensive documentation of design decisions, architecture understanding, validation logic, and trade-offs.

---

## Code Coverage Report

```
-----------------|---------|----------|---------|---------|-------------------
File             | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-----------------|---------|----------|---------|---------|-------------------
All files        |   97.66 |    94.57 |   96.66 |   97.45 |
 src             |   73.33 |    77.77 |      50 |   73.33 |
  app.js         |   73.33 |    77.77 |      50 |   73.33 | 13-14,20-21
 src/routes      |     100 |    91.66 |     100 |     100 |
  tasks.js       |     100 |    91.66 |     100 |     100 |
 src/services    |     100 |    91.66 |     100 |     100 |
  taskService.js |     100 |    91.66 |     100 |     100 |
 src/utils       |     100 |      100 |     100 |     100 |
  validators.js  |     100 |      100 |     100 |     100 |
-----------------|---------|----------|---------|---------|-------------------
Test Suites: 3 passed, 3 total
Tests:       65 passed, 65 total
Snapshots:   0 total
Time:        1.067 s
```

---

## Feature Implementation: `PATCH /tasks/:id/assign`

### Endpoint Specification
- **Method & Route:** `PATCH /tasks/:id/assign`
- **Request Body:** `{ "assignee": "Jane Doe" }`
- **Responses:**
  - `200 OK`: Returns the updated task object with `assignee` set.
  - `400 Bad Request`: Returned if `assignee` is missing, not a string, empty, or whitespace-only (`{ "error": "assignee is required and must be a non-empty string" }`).
  - `404 Not Found`: Returned if task ID does not exist (`{ "error": "Task not found" }`).

### Design & Validation Decisions
1. **HTTP Verb Selection:** `PATCH` was selected as specified, matching partial resource updates (updating only the `assignee` attribute while keeping other fields intact).
2. **Whitespace Trimming:** Assignee strings are trimmed automatically before storage to eliminate accidental leading/trailing spaces.
3. **Strict Validation:** Rejects empty strings, whitespace-only strings (`"   "`), numbers, booleans, non-string inputs, or non-object payloads.
4. **Re-assignment Handling:** Assigning a task that already has an assignee updates the assignee to the new name without error.

---

## Submission Questions & Reflections

### 1. What would you test next if you had more time?
- **Concurrent Request / Race Conditions:** Test in-memory mutation safety under high concurrency or simulated latency.
- **SQL / NoSQL Injection & Payload Oversizing:** Test payload size limits to protect against memory exhaustion attacks.
- **Load & Stress Testing:** Benchmark endpoint performance when the in-memory store grows to 10,000+ tasks.

### 2. Anything that surprised you in the codebase?
- **`completeTask` Priority Reset:** Surprised to see `completeTask` hardcoding `priority: 'medium'`, which unintentionally degraded high-priority tasks upon completion.
- **Pagination Indexing Formula:** The pagination calculation `offset = page * limit` was 0-indexed in a 1-indexed URL interface, causing page 1 to skip the first 10 items.
- **Partial Matching for Status Filter:** `getByStatus` used `String.prototype.includes`, making `/tasks?status=do` match both `todo` and `done` tasks.
- **Express JSON Error Status:** Express error middleware returning 500 for invalid JSON syntax instead of 400 Bad Request.

### 3. Any questions you'd ask before shipping this to production?
- **Persistence Layer:** Are we moving from in-memory storage to a persistent database (PostgreSQL/MongoDB)? How will state survive application restarts?
- **Authentication & Authorization:** Who is allowed to assign tasks or mark them as completed? Should users only be able to view/update tasks assigned to them?
- **API Versioning:** Should routes be prefixed with `/api/v1/tasks` for future breaking change safety?
- **Rate Limiting & CORS:** What CORS policies and rate limits should be applied to prevent API abuse?

---

## How to Run Tests

```bash
cd task-api

# Run test suite
npm test

# Run tests with code coverage report
npm run coverage

# Start application server
npm start
```
