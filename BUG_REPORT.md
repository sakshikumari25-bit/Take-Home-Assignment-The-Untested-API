# Bug Report — Task Manager API

This document details the bugs identified during comprehensive code review and automated test suite construction for the Task Manager API.

---

## Summary of Identified Bugs

| Bug ID | Component | Location / Method | Description | Severity | Status |
|---|---|---|---|---|---|
| **BUG-01** | `taskService.js` | `getByStatus()` | Uses partial string matching (`includes`) instead of exact matching (`===`) | High | Fixed |
| **BUG-02** | `taskService.js` | `getPaginated()` | Off-by-one page index error in pagination offset calculation | High | Fixed |
| **BUG-03** | `taskService.js` | `completeTask()` | Hardcodes `priority: 'medium'` when marking tasks complete | Medium | Fixed |
| **BUG-04** | `tasks.js` route | `GET /tasks` | `status` filter and `page`/`limit` pagination parameters are mutually exclusive | Medium | Fixed |
| **BUG-05** | `taskService.js` | `update()` | Allows client to overwrite system fields (`id`, `createdAt`, `completedAt`) | Medium | Fixed |
| **BUG-06** | `app.js` | Express Error Handler | Malformed JSON payloads return 500 Internal Server Error instead of 400 Bad Request | High | Fixed |
| **BUG-07** | `validators.js` | `validateCreateTask` / `validateUpdateTask` | Throws `TypeError` crash when request body is `null` or non-object primitive | High | Fixed |
| **BUG-08** | `validators.js` | `validateCreateTask` / `validateUpdateTask` | Missing string type check on optional `description` field | Low | Fixed |
| **BUG-09** | `taskService.js` | `completeTask()` | Re-completing an already completed task overwrites original `completedAt` timestamp | Medium | Fixed |
| **BUG-10** | `taskService.js` | `update()` | Status transitions to/from `'done'` do not auto-manage `completedAt` timestamp | Medium | Fixed |

---

## Detailed Bug Breakdown

### BUG-01: Partial Matching in `getByStatus()`

- **Severity:** High
- **Location:** [taskService.js](file:///home/sama/assisment/task-api/src/services/taskService.js#L9) (`getByStatus`)
- **Expected Behavior:** Querying tasks by `status` (e.g. `GET /tasks?status=todo`) must only return tasks whose `status` strictly equals `"todo"`. Querying `status=do` must return an empty array `[]`.
- **Actual Behavior:** The service executed `tasks.filter((t) => t.status.includes(status))`. Passing `status=do` returned tasks with status `todo` and `done`. Passing `status=in` returned `in_progress` tasks.
- **How Discovered:** Discovered when writing unit tests for `getByStatus("do")` expecting `[]`, which unexpectedly returned tasks with status `"todo"` and `"done"`.
- **Root Cause:**
  ```javascript
  const getByStatus = (status) => tasks.filter((t) => t.status.includes(status));
  ```
- **Fix Applied:** Replaced `includes()` with strict equality comparison `===`:
  ```javascript
  const getByStatus = (status) => tasks.filter((t) => t.status === status);
  ```

---

### BUG-02: 1-Based Pagination Offset Off-by-One Calculation

- **Severity:** High
- **Location:** [taskService.js](file:///home/sama/assisment/task-api/src/services/taskService.js#L14) (`getPaginated`)
- **Expected Behavior:** In 1-based page indexing (where `page=1` represents the first page), requesting `page=1&limit=10` should return items `0` through `9` (offset = 0).
- **Actual Behavior:** The service calculated `const offset = page * limit`. For `page=1` and `limit=10`, `offset = 10`, which skipped the first 10 tasks entirely and returned items `10` through `19`.
- **How Discovered:** Discovered during unit testing of `getPaginated(1, 2)` on a list of 5 tasks; it returned items index 2 and 3 instead of 0 and 1.
- **Root Cause:**
  ```javascript
  const offset = page * limit;
  ```
- **Fix Applied:** Updated offset calculation to subtract 1 from page number:
  ```javascript
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.max(1, parseInt(limit) || 10);
  const offset = (pageNum - 1) * limitNum;
  ```

---

### BUG-03: `completeTask()` Hardcodes Priority Override

- **Severity:** Medium
- **Location:** [taskService.js](file:///home/sama/assisment/task-api/src/services/taskService.js#L74) (`completeTask`)
- **Expected Behavior:** Calling `PATCH /tasks/:id/complete` should update `status` to `"done"` and set `completedAt` timestamp while retaining the task's existing `priority` (`"high"`, `"medium"`, or `"low"`).
- **Actual Behavior:** The function explicitly hardcoded `priority: 'medium'` during completion, causing high or low priority tasks to lose their priority level upon completion.
- **How Discovered:** Discovered during integration testing when marking a `"high"` priority task complete and asserting that `priority` remained `"high"`.
- **Root Cause:**
  ```javascript
  const updated = {
    ...task,
    priority: 'medium', // Overwrites original task priority!
    status: 'done',
    completedAt: new Date().toISOString(),
  };
  ```
- **Fix Applied:** Removed `priority: 'medium'` from the returned object so `...task` retains original priority.

---

### BUG-04: Mutual Exclusivity of Status Filtering and Pagination in `GET /tasks`

- **Severity:** Medium
- **Location:** [tasks.js](file:///home/sama/assisment/task-api/src/routes/tasks.js#L14) (`GET /tasks` route handler)
- **Expected Behavior:** Requesting `GET /tasks?status=todo&page=1&limit=2` should filter tasks by status `"todo"` and then return page 1 with 2 items.
- **Actual Behavior:** The route used independent `if` statements with early returns. When `status` was present, `if (status)` returned immediately without applying pagination parameters.
- **How Discovered:** Integration test calling `GET /tasks?status=todo&page=1&limit=2` on 5 `todo` tasks returned all 5 tasks instead of 2.
- **Root Cause:**
  ```javascript
  if (status) {
    const tasks = taskService.getByStatus(status);
    return res.json(tasks); // Early return bypasses pagination logic
  }
  ```
- **Fix Applied:** Refactored `GET /tasks` to chain filtering and pagination cleanly:
  ```javascript
  let tasks = status ? taskService.getByStatus(status) : taskService.getAll();
  if (page !== undefined || limit !== undefined) {
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, parseInt(limit) || 10);
    const offset = (pageNum - 1) * limitNum;
    tasks = tasks.slice(offset, offset + limitNum);
  }
  res.json(tasks);
  ```

---

### BUG-05: System / Read-Only Fields Can Be Overwritten via `PUT /tasks/:id`

- **Severity:** Medium
- **Location:** [taskService.js](file:///home/sama/assisment/task-api/src/services/taskService.js#L54) (`update`)
- **Expected Behavior:** `PUT /tasks/:id` should only update user-configurable fields (`title`, `description`, `status`, `priority`, `dueDate`, `assignee`). Read-only system metadata like `id` and `createdAt` must not be overwritten.
- **Actual Behavior:** `update` performed a direct shallow merge (`{ ...tasks[index], ...fields }`). Passing `{ "id": "hacked-id", "createdAt": "2000-01-01" }` corrupted internal task data.
- **How Discovered:** Unit test attempting to pass `{ id: 'custom-id' }` to `update()`.
- **Root Cause:**
  ```javascript
  const updated = { ...tasks[index], ...fields };
  ```
- **Fix Applied:** Destructured system fields out of input payload before merging:
  ```javascript
  const { id: _, createdAt: __, completedAt: ___, ...allowedFields } = fields;
  const updated = { ...tasks[index], ...allowedFields };
  ```

---

### BUG-06: Malformed JSON Payloads Return 500 Internal Server Error

- **Severity:** High
- **Location:** [app.js](file:///home/sama/assisment/task-api/src/app.js#L9) (Global Express Error Middleware)
- **Expected Behavior:** When a client sends malformed JSON syntax in a POST/PUT/PATCH request, Express's `express.json()` middleware catches it and passes a 400 `SyntaxError` to the error handler. The server should return `400 Bad Request` with `{ "error": "Invalid JSON payload" }`.
- **Actual Behavior:** The error handler indiscriminately set HTTP status 500 for all uncaught errors, resulting in `500 Internal Server Error`.
- **How Discovered:** Integration testing sending unclosed JSON strings (e.g. `{ "title": "test`).
- **Root Cause:**
  ```javascript
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal server error' });
  });
  ```
- **Fix Applied:** Added check for `SyntaxError` with status 400:
  ```javascript
  app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
      return res.status(400).json({ error: 'Invalid JSON payload' });
    }
    console.error(err.stack);
    res.status(500).json({ error: 'Internal server error' });
  });
  ```

---

### BUG-07: Validator Crash (`TypeError`) on Null or Non-Object Payloads

- **Severity:** High
- **Location:** [validators.js](file:///home/sama/assisment/task-api/src/utils/validators.js#L5) (`validateCreateTask`, `validateUpdateTask`, `validateAssignTask`)
- **Expected Behavior:** Sending `null` or non-object primitives in the request body should be caught by validators and return a `400 Bad Request` validation message.
- **Actual Behavior:** `validateCreateTask` accessed `body.title` directly without verifying `body` is a non-null object, throwing `TypeError: Cannot read properties of null (reading 'title')` resulting in unhandled server error.
- **How Discovered:** Unit testing validators with `null`, `123`, and array payloads.
- **Root Cause:** Missing initial type assertion on `body` parameter.
- **Fix Applied:** Added guard clause at top of validators:
  ```javascript
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'request body must be an object';
  }
  ```

---

### BUG-08: Missing Type Checking for `description` Field

- **Severity:** Low
- **Location:** [validators.js](file:///home/sama/assisment/task-api/src/utils/validators.js#L11) (`validateCreateTask`, `validateUpdateTask`)
- **Expected Behavior:** If `description` is provided in request body, it must be validated as a string to preserve task shape integrity.
- **Actual Behavior:** Passing `{ title: "Test", description: 12345 }` bypassed validation, storing numeric data in `description`.
- **How Discovered:** Schema integrity analysis during code review.
- **Root Cause:** No condition checked `typeof body.description`.
- **Fix Applied:** Added validation check:
  ```javascript
  if (body.description !== undefined && typeof body.description !== 'string') {
    return 'description must be a string';
  }
  ```

---

### BUG-09: Re-completing Completed Task Overwrites `completedAt` Timestamp

- **Severity:** Medium
- **Location:** [taskService.js](file:///home/sama/assisment/task-api/src/services/taskService.js#L71) (`completeTask`)
- **Expected Behavior:** Marking an already completed task as complete (`PATCH /tasks/:id/complete`) should be idempotent and preserve the original `completedAt` timestamp.
- **Actual Behavior:** Every invocation generated a new `new Date().toISOString()`, overwriting past completion history.
- **How Discovered:** Edge case unit testing on task completion lifecycle.
- **Root Cause:** `completedAt` was set unconditionally to `new Date().toISOString()`.
- **Fix Applied:** Preserved existing `completedAt` timestamp if task was already done:
  ```javascript
  const completedAt = task.status === 'done' && task.completedAt ? task.completedAt : new Date().toISOString();
  ```

---

### BUG-10: Status Update via `PUT` Disregards `completedAt` State

- **Severity:** Medium
- **Location:** [taskService.js](file:///home/sama/assisment/task-api/src/services/taskService.js#L57) (`update`)
- **Expected Behavior:** Updating task status to `'done'` via `PUT` should populate `completedAt` if null. Updating status away from `'done'` (e.g. back to `'in_progress'`) should reset `completedAt` to `null`.
- **Actual Behavior:** `PUT` updates replaced `status` string without updating or clearing `completedAt`.
- **How Discovered:** Audit of state transition consistency across endpoints.
- **Root Cause:** Lack of state synchronization for `completedAt` in generic `update()` function.
- **Fix Applied:** Added status transition handling in `update()`:
  ```javascript
  if (allowedFields.status === 'done' && !currentTask.completedAt) {
    updated.completedAt = new Date().toISOString();
  } else if (allowedFields.status && allowedFields.status !== 'done') {
    updated.completedAt = null;
  }
  ```
