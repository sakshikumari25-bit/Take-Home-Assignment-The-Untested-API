# Bug Report — Task Manager API

This document details the bugs identified during code review and automated test suite construction for the Task Manager API.

---

## Summary of Bugs

| Bug ID | Component | Endpoint / Method | Description | Severity | Status |
|---|---|---|---|---|---|
| **BUG-01** | `taskService.js` | `getByStatus()` | Uses partial string matching (`String.prototype.includes`) instead of exact matching | High | Fixed |
| **BUG-02** | `taskService.js` | `getPaginated()` | Off-by-one page index error in pagination offset calculation | High | Fixed |
| **BUG-03** | `taskService.js` | `completeTask()` | Hardcodes `priority: 'medium'` when marking tasks complete | Medium | Fixed |
| **BUG-04** | `tasks.js` route | `GET /tasks` | `status` filter and `page`/`limit` pagination parameters are mutually exclusive | Medium | Fixed |
| **BUG-05** | `taskService.js` | `update()` | Allows client to overwrite system fields (`id`, `createdAt`, `completedAt`) | Medium | Fixed |

---

## Detailed Bug Breakdown

### BUG-01: Partial Matching in `getByStatus()`

- **Severity:** High
- **Location:** `src/services/taskService.js` (`getByStatus`, Line 9)
- **Expected Behavior:** Querying tasks by `status` (e.g. `GET /tasks?status=todo`) should only return tasks whose `status` strictly equals `"todo"`. Querying `status=do` should return `[]`.
- **Actual Behavior:** The service executes `tasks.filter((t) => t.status.includes(status))`. Passing `status=do` returns tasks with status `todo` and `done`. Passing `status=in` returns `in_progress` tasks.
- **How Discovered:** Discovered when writing unit tests for `getByStatus("do")` expecting an empty array, which unexpectedly returned tasks with status `"todo"` and `"done"`.
- **Root Cause:**
  ```javascript
  // Line 9 in taskService.js
  const getByStatus = (status) => tasks.filter((t) => t.status.includes(status));
  ```
- **Fix:** Replace `includes()` with strict equality check `===`:
  ```javascript
  const getByStatus = (status) => tasks.filter((t) => t.status === status);
  ```

---

### BUG-02: 1-Based Pagination Offset Off-by-One Calculation

- **Severity:** High
- **Location:** `src/services/taskService.js` (`getPaginated`, Line 12)
- **Expected Behavior:** In 1-based page indexing (where `page=1` is the first page), requesting `page=1&limit=10` should return items `0` through `9` (offset = 0).
- **Actual Behavior:** The service calculates `const offset = page * limit`. For `page=1` and `limit=10`, `offset = 10`, which skips the first 10 tasks entirely and returns items `10` through `19`. Page 1 displays Page 2 results, and page 0 would be required to get items 0-9.
- **How Discovered:** Discovered during unit testing of `getPaginated(1, 2)` on a list of 5 tasks: returned tasks `[3, 4]` instead of `[1, 2]`.
- **Root Cause:**
  ```javascript
  // Line 12 in taskService.js
  const offset = page * limit;
  ```
- **Fix:** Update offset calculation to subtract 1 from page number for 1-based page indexing:
  ```javascript
  const offset = (Math.max(1, page) - 1) * limit;
  ```

---

### BUG-03: `completeTask()` Hardcodes Priority Override

- **Severity:** Medium
- **Location:** `src/services/taskService.js` (`completeTask`, Line 69)
- **Expected Behavior:** Calling `PATCH /tasks/:id/complete` should update `status` to `"done"` and set `completedAt` timestamp while retaining the task's existing `priority` (`"high"`, `"medium"`, or `"low"`).
- **Actual Behavior:** The function explicitly sets `priority: 'medium'` during completion, causing any `"high"` or `"low"` priority task to lose its priority level when marked as complete.
- **How Discovered:** Discovered during integration testing when marking a `"high"` priority task complete and asserting that `priority` remained `"high"`.
- **Root Cause:**
  ```javascript
  // Lines 67-72 in taskService.js
  const updated = {
    ...task,
    priority: 'medium', // Overwrites original priority!
    status: 'done',
    completedAt: new Date().toISOString(),
  };
  ```
- **Fix:** Remove `priority: 'medium'` from the return object so `...task` retains original priority:
  ```javascript
  const updated = {
    ...task,
    status: 'done',
    completedAt: new Date().toISOString(),
  };
  ```

---

### BUG-04: Mutual Exclusivity of Status Filtering and Pagination in `GET /tasks`

- **Severity:** Medium
- **Location:** `src/routes/tasks.js` (`router.get('/')`, Lines 14-27)
- **Expected Behavior:** Sending `GET /tasks?status=todo&page=1&limit=5` should return page 1 of tasks filtered by status `"todo"`.
- **Actual Behavior:** The route uses independent `if` statements with early returns. When `status` is provided, `if (status)` executes `taskService.getByStatus(status)` and returns immediately without applying pagination parameters.
- **How Discovered:** Integration test calling `GET /tasks?status=todo&page=1&limit=2` on 5 `todo` tasks returned all 5 tasks instead of 2 tasks.
- **Root Cause:**
  ```javascript
  // Lines 14-24 in tasks.js
  if (status) {
    const tasks = taskService.getByStatus(status);
    return res.json(tasks); // Early return bypasses pagination!
  }

  if (page !== undefined || limit !== undefined) { ... }
  ```
- **Fix:** Refactor `GET /tasks` route handler to allow combining status filtering and pagination seamlessly.

---

### BUG-05: System / Read-Only Fields Can Be Overwritten via `PUT /tasks/:id`

- **Severity:** Medium
- **Location:** `src/services/taskService.js` (`update`, Line 50) & `src/routes/tasks.js`
- **Expected Behavior:** `PUT /tasks/:id` should only update editable task fields (`title`, `description`, `status`, `priority`, `dueDate`, `assignee`). Read-only system metadata like `id`, `createdAt`, and `completedAt` should not be mutable by client body input.
- **Actual Behavior:** `update` performs a shallow merge (`{ ...tasks[index], ...fields }`). Passing `{ "id": "hacked-id", "createdAt": "2000-01-01" }` overwrites internal task ID and creation timestamp.
- **How Discovered:** Unit test attempting to pass `{ id: 'custom-id' }` to `update()`.
- **Root Cause:**
  ```javascript
  // Line 50 in taskService.js
  const updated = { ...tasks[index], ...fields };
  ```
- **Fix:** Destructure and filter allowed update fields in `taskService.update` or route handler:
  ```javascript
  const { id: _, createdAt: __, completedAt: ___, ...allowedFields } = fields;
  const updated = { ...tasks[index], ...allowedFields };
  ```
