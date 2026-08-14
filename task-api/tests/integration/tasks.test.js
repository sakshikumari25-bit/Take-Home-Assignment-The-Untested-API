const request = require('supertest');
const app = require('../../src/app');
const taskService = require('../../src/services/taskService');

describe('Task API Integration Tests', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('GET /tasks', () => {
    test('returns empty array initially', async () => {
      const res = await request(app).get('/tasks');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    test('returns list of tasks', async () => {
      taskService.create({ title: 'Task A' });
      taskService.create({ title: 'Task B' });

      const res = await request(app).get('/tasks');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });

    test('filters tasks by status', async () => {
      taskService.create({ title: 'Todo Task', status: 'todo' });
      taskService.create({ title: 'Done Task', status: 'done' });

      const res = await request(app).get('/tasks?status=todo');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe('Todo Task');
    });

    test('paginates tasks correctly using page and limit', async () => {
      for (let i = 1; i <= 5; i++) {
        taskService.create({ title: `Task ${i}` });
      }

      const res = await request(app).get('/tasks?page=1&limit=2');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].title).toBe('Task 1');
      expect(res.body[1].title).toBe('Task 2');
    });

    test('BUG-04 verification: allows combining status filter and pagination', async () => {
      for (let i = 1; i <= 5; i++) {
        taskService.create({ title: `Todo Task ${i}`, status: 'todo' });
      }
      taskService.create({ title: 'Done Task', status: 'done' });

      const res = await request(app).get('/tasks?status=todo&page=1&limit=2');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].title).toBe('Todo Task 1');
      expect(res.body[1].title).toBe('Todo Task 2');
    });
  });

  describe('GET /tasks/stats', () => {
    test('returns correct task statistics', async () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      taskService.create({ title: 'T1', status: 'todo', dueDate: pastDate });
      taskService.create({ title: 'T2', status: 'done' });

      const res = await request(app).get('/tasks/stats');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        todo: 1,
        in_progress: 0,
        done: 1,
        overdue: 1,
      });
    });
  });

  describe('POST /tasks', () => {
    test('creates a task with valid body and returns 201 Created', async () => {
      const payload = {
        title: 'New API Task',
        description: 'Integration test task',
        priority: 'high',
      };

      const res = await request(app).post('/tasks').send(payload);
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.title).toBe('New API Task');
      expect(res.body.priority).toBe('high');
      expect(res.body.status).toBe('todo');
    });

    test('returns 400 Bad Request when title is missing', async () => {
      const res = await request(app).post('/tasks').send({ description: 'No title' });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    test('returns 400 Bad Request when priority is invalid', async () => {
      const res = await request(app).post('/tasks').send({ title: 'Test', priority: 'invalid' });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('PUT /tasks/:id', () => {
    test('updates a task and returns 200 OK', async () => {
      const task = taskService.create({ title: 'Original Task' });

      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ title: 'Updated Task Title', status: 'in_progress' });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated Task Title');
      expect(res.body.status).toBe('in_progress');
    });

    test('returns 400 Bad Request on invalid update data', async () => {
      const task = taskService.create({ title: 'Test Task' });

      const res = await request(app).put(`/tasks/${task.id}`).send({ title: '' });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    test('returns 404 Not Found when task ID does not exist', async () => {
      const res = await request(app).put('/tasks/non-existent-id').send({ title: 'Valid Title' });
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Task not found' });
    });
  });

  describe('DELETE /tasks/:id', () => {
    test('deletes task and returns 204 No Content', async () => {
      const task = taskService.create({ title: 'To Be Deleted' });

      const res = await request(app).delete(`/tasks/${task.id}`);
      expect(res.status).toBe(204);

      const check = await request(app).get('/tasks');
      expect(check.body).toHaveLength(0);
    });

    test('returns 404 Not Found when deleting non-existent task', async () => {
      const res = await request(app).delete('/tasks/non-existent-id');
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Task not found' });
    });
  });

  describe('PATCH /tasks/:id/complete', () => {
    test('marks task complete and returns 200 OK', async () => {
      const task = taskService.create({ title: 'Complete Me', priority: 'high' });

      const res = await request(app).patch(`/tasks/${task.id}/complete`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('done');
      expect(res.body.priority).toBe('high');
      expect(res.body.completedAt).not.toBeNull();
    });

    test('returns 404 Not Found for invalid task ID', async () => {
      const res = await request(app).patch('/tasks/non-existent-id/complete');
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Task not found' });
    });
  });

  describe('PATCH /tasks/:id/assign', () => {
    test('assigns task to user and returns 200 OK with updated task', async () => {
      const task = taskService.create({ title: 'Assign Me' });

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'Taroo Developer' });

      expect(res.status).toBe(200);
      expect(res.body.assignee).toBe('Taroo Developer');
    });

    test('returns 400 Bad Request when assignee is missing or empty', async () => {
      const task = taskService.create({ title: 'Assign Me' });

      const res1 = await request(app).patch(`/tasks/${task.id}/assign`).send({});
      expect(res1.status).toBe(400);

      const res2 = await request(app).patch(`/tasks/${task.id}/assign`).send({ assignee: '   ' });
      expect(res2.status).toBe(400);
    });

    test('returns 404 Not Found when task ID does not exist', async () => {
      const res = await request(app)
        .patch('/tasks/non-existent-id/assign')
        .send({ assignee: 'Jane Doe' });

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Task not found' });
    });
  });
});
