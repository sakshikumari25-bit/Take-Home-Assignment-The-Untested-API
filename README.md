# Take-Home Assignment — The Untested API

> [!NOTE]
> **Completed Assignment Deliverables:**
> - 📄 **[BUG_REPORT.md](./BUG_REPORT.md)**: Detailed report on 10 identified bugs, root causes, reproduction steps, and fixes.
> - 📄 **[DEVELOPMENT_NOTES.md](./DEVELOPMENT_NOTES.md)**: Technical design decisions, architecture understanding, validation strategy, and edge case breakdown.
> - 📄 **[SUBMISSION.md](./SUBMISSION.md)**: Candidate submission overview and responses to evaluation questions.
> - 🧪 **Comprehensive Test Suite**: 65 unit and integration tests with **97.66% code coverage** (100% on routes, services, and validators).
> - ✨ **New Feature Implemented**: `PATCH /tasks/:id/assign` implemented with validation, error handling, and tests.

---

## Overview

The **Task Manager API** is a RESTful API built with Node.js and Express.js using an in-memory data store. This project features a full test suite built with Jest and Supertest, comprehensive input validation, robust error handling, and complete bug fixes.

---

## Getting Started

### Prerequisites
- Node.js (v18+)
- npm

### Installation & Server Execution

```bash
cd task-api

# Install dependencies
npm install

# Start the API server (runs on http://localhost:3000)
npm start
```

### Running Tests & Coverage

```bash
cd task-api

# Run automated unit and integration tests
npm test

# Run tests with code coverage report
npm run coverage
```

---

## Project Structure

```
task-api/
  src/
    app.js                  # Express application setup & global error handling
    routes/tasks.js         # HTTP route definitions & controller handlers
    services/taskService.js # Core business logic & in-memory data store
    utils/validators.js     # Input validation helpers
  tests/
    unit/
      taskService.test.js   # Service layer unit tests
      validators.test.js    # Validator unit tests
    integration/
      tasks.test.js         # API integration tests using Supertest
  package.json
  jest.config.js
BUG_REPORT.md               # Detailed breakdown of all 10 discovered bugs & fixes
DEVELOPMENT_NOTES.md        # Architecture, design decisions & implementation notes
SUBMISSION.md               # Final submission summary & production readiness Q&A
```

---

## API Reference

| Method   | Path                  | Description |
|----------|-----------------------|-------------|
| `GET`    | `/tasks`              | List all tasks. Supports `?status=todo`, `?page=1`, `?limit=10` |
| `POST`   | `/tasks`              | Create a new task |
| `PUT`    | `/tasks/:id`          | Update an existing task |
| `DELETE` | `/tasks/:id`          | Delete a task (returns 204 No Content) |
| `PATCH`  | `/tasks/:id/complete` | Mark a task as complete (`status: "done"`) |
| `GET`    | `/tasks/stats`        | Get task statistics (counts by status + overdue count) |
| `PATCH`  | `/tasks/:id/assign`   | Assign or re-assign a task to a user |

---

### Task Schema

```json
{
  "id": "uuid",
  "title": "string",
  "description": "string",
  "status": "todo | in_progress | done",
  "priority": "low | medium | high",
  "dueDate": "ISO 8601 string or null",
  "assignee": "string or null",
  "completedAt": "ISO 8601 string or null",
  "createdAt": "ISO 8601 string"
}
```

---

## Feature Documentation: `PATCH /tasks/:id/assign`

Assigns or re-assigns a task to a specific team member.

### Request
- **Method:** `PATCH`
- **URL Path:** `/tasks/:id/assign`
- **Headers:** `Content-Type: application/json`
- **Body:**
  ```json
  {
    "assignee": "Taroo Developer"
  }
  ```

### Response (200 OK)
```json
{
  "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "title": "Complete assignment",
  "description": "Write tests and documentation",
  "status": "in_progress",
  "priority": "high",
  "dueDate": null,
  "assignee": "Taroo Developer",
  "completedAt": null,
  "createdAt": "2026-08-14T18:00:00.000Z"
}
```

### Error Responses
- **400 Bad Request**: If `assignee` field is missing, empty, only whitespace, or non-string (`{ "error": "assignee is required and must be a non-empty string" }`).
- **404 Not Found**: If task ID does not exist (`{ "error": "Task not found" }`).

---

## Sample cURL Commands

**1. Create a task**
```bash
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Implement feature", "priority": "high"}'
```

**2. List tasks with filtering & pagination**
```bash
curl "http://localhost:3000/tasks?status=todo&page=1&limit=5"
```

**3. Assign a task**
```bash
curl -X PATCH http://localhost:3000/tasks/<TASK_ID>/assign \
  -H "Content-Type: application/json" \
  -d '{"assignee": "Alex Rivera"}'
```

**4. Mark task as complete**
```bash
curl -X PATCH http://localhost:3000/tasks/<TASK_ID>/complete
```

---

## Summary of Bugs Identified and Fixed

For complete reproduction steps and root causes, see **[BUG_REPORT.md](./BUG_REPORT.md)**.

| Bug ID | Component | Summary | Status |
|---|---|---|---|
| **BUG-01** | `taskService.js` | Partial status filtering using `includes` instead of exact equality | Fixed |
| **BUG-02** | `taskService.js` | Off-by-one pagination offset calculation (`page * limit`) | Fixed |
| **BUG-03** | `taskService.js` | `completeTask()` hardcoding `priority: 'medium'` | Fixed |
| **BUG-04** | `tasks.js` route | Mutual exclusivity of status filter and pagination query params | Fixed |
| **BUG-05** | `taskService.js` | Overwriting immutable system fields (`id`, `createdAt`) via `PUT` | Fixed |
| **BUG-06** | `app.js` | Global error handler returning 500 for malformed JSON payloads | Fixed |
| **BUG-07** | `validators.js` | `TypeError` crashes when body is `null` or a non-object primitive | Fixed |
| **BUG-08** | `validators.js` | Omitted type check on optional `description` field | Fixed |
| **BUG-09** | `taskService.js` | Overwriting `completedAt` timestamp when re-completing done task | Fixed |
| **BUG-10** | `taskService.js` | `PUT` status changes not populating/clearing `completedAt` timestamp | Fixed |

---

## Summary of Tests and Code Coverage

- **Total Test Cases:** 65 passed across unit and integration suites.
- **Service Layer (`taskService.js`):** 100% Statements / 100% Lines
- **Route Layer (`tasks.js`):** 100% Statements / 100% Lines
- **Validator Layer (`validators.js`):** 100% Statements / 100% Lines
- **Overall Project Coverage:** **97.66% Statements / 97.45% Lines**
