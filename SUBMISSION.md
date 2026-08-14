# Take-Home Assignment Submission — The Untested API

**Candidate:** Taroo (Full Stack Developer Intern Candidate)  
**GitHub Repository:** https://github.com/sakshikumari25-bit/Take-Home-Assignment-The-Untested-API  
**Live API Endpoint:** https://icy-doors-push.loca.lt/tasks  
**Deadline:** 16th August 2026, 11:00 PM  


---

## Executive Summary

This submission includes:
1. **Full Test Suite**: 56 unit and integration tests using Jest and Supertest with **97.41% code coverage** (100% on routes, services, and validators).
2. **Bug Report (`BUG_REPORT.md`)**: Detailed breakdown of 5 critical/medium severity bugs found in the codebase.
3. **Bug Remediation**: Complete fixes for all 5 identified bugs in `src/services/taskService.js` and `src/routes/tasks.js`.
4. **New Feature (`PATCH /tasks/:id/assign`)**: Implemented REST endpoint for task assignment with strict validation and full test coverage.

---

## Code Coverage Report

```
-----------------|---------|----------|---------|---------|-------------------
File             | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-----------------|---------|----------|---------|---------|-------------------
All files        |   97.41 |    93.47 |   93.33 |   97.16 |
 src             |   69.23 |       75 |       0 |   69.23 |
  app.js         |   69.23 |       75 |       0 |   69.23 | 10-11,17-18
 src/routes      |     100 |    91.66 |     100 |     100 |
  tasks.js       |     100 |    91.66 |     100 |     100 |
 src/services    |     100 |     87.5 |     100 |     100 |
  taskService.js |     100 |     87.5 |     100 |     100 |
 src/utils       |     100 |      100 |     100 |     100 |
  validators.js  |     100 |      100 |     100 |     100 |
-----------------|---------|----------|---------|---------|-------------------
Test Suites: 3 passed, 3 total
Tests:       56 passed, 56 total
Snapshots:   0 total
```

---

## Feature Implementation: `PATCH /tasks/:id/assign`

### Endpoint Specification
- **Method & Route:** `PATCH /tasks/:id/assign`
- **Request Body:** `{ "assignee": "Taroo Developer" }`
- **Responses:**
  - `200 OK`: Returns the updated task object with `assignee` set.
  - `400 Bad Request`: Returned if `assignee` is missing, not a string, or contains only whitespace (`{ "error": "assignee is required and must be a non-empty string" }`).
  - `404 Not Found`: Returned if task ID does not exist (`{ "error": "Task not found" }`).

### Design & Validation Decisions
1. **HTTP Verb Selection:** `PATCH` was selected as specified, matching partial resource updates (updating only the `assignee` attribute while keeping other fields intact).
2. **Whitespace Trimming:** Assignee strings are trimmed automatically before storage to eliminate accidental leading/trailing spaces.
3. **Strict Validation:** Rejects empty strings, whitespace-only strings (`"   "`), numbers, and non-string inputs.
4. **Re-assignment Handling:** Assigning a task that already has an assignee updates the assignee to the new name without error.

---

## Submission Questions & Reflections

### 1. What would you test next if you had more time?
- **Concurrent Request / Race Conditions:** Test in-memory mutation safety under high concurrency or simulated latency.
- **Malformed JSON Payloads:** Edge cases for invalid JSON strings sent in request bodies or missing content-type headers.
- **SQL / NoSQL Injection & Payload Oversizing:** Test payload size limits to protect against memory exhaustion attacks.
- **Load & Stress Testing:** Benchmark endpoint performance when the in-memory store grows to 10,000+ tasks.

### 2. Anything that surprised you in the codebase?
- **`completeTask` Priority Reset:** Surprised to see `completeTask` hardcoding `priority: 'medium'`, which unintentionally degraded high-priority tasks upon completion.
- **Pagination Indexing Formula:** The pagination calculation `offset = page * limit` was 0-indexed in a 1-indexed URL interface, causing page 1 to skip the first 10 items.
- **Partial Matching for Status Filter:** `getByStatus` used `String.prototype.includes`, making `/tasks?status=do` match both `todo` and `done` tasks.

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
