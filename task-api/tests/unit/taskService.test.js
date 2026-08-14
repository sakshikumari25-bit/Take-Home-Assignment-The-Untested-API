const taskService = require('../../src/services/taskService');

describe('taskService Unit Tests', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('create and getAll', () => {
    test('creates a task with default values and retrieves it', () => {
      const task = taskService.create({ title: 'Task 1' });
      expect(task).toHaveProperty('id');
      expect(task.title).toBe('Task 1');
      expect(task.description).toBe('');
      expect(task.status).toBe('todo');
      expect(task.priority).toBe('medium');
      expect(task.dueDate).toBeNull();
      expect(task.completedAt).toBeNull();
      expect(task).toHaveProperty('createdAt');

      const all = taskService.getAll();
      expect(all).toHaveLength(1);
      expect(all[0]).toEqual(task);
    });

    test('getAll returns a copy of array to prevent external mutation', () => {
      taskService.create({ title: 'Task 1' });
      const list = taskService.getAll();
      list.push({ id: 'fake' });
      expect(taskService.getAll()).toHaveLength(1);
    });
  });

  describe('findById', () => {
    test('returns matching task when ID exists', () => {
      const created = taskService.create({ title: 'Find Me' });
      const found = taskService.findById(created.id);
      expect(found).toEqual(created);
    });

    test('returns undefined when task does not exist', () => {
      expect(taskService.findById('non-existent-id')).toBeUndefined();
    });
  });

  describe('getByStatus', () => {
    test('filters tasks by exact status match', () => {
      taskService.create({ title: 'Task Todo 1', status: 'todo' });
      taskService.create({ title: 'Task Todo 2', status: 'todo' });
      taskService.create({ title: 'Task Done', status: 'done' });
      taskService.create({ title: 'Task Progress', status: 'in_progress' });

      const todoTasks = taskService.getByStatus('todo');
      expect(todoTasks).toHaveLength(2);
      expect(todoTasks.every((t) => t.status === 'todo')).toBe(true);

      const doneTasks = taskService.getByStatus('done');
      expect(doneTasks).toHaveLength(1);
      expect(doneTasks[0].status).toBe('done');
    });

    test('BUG-01 verification: partial query "do" must NOT return "todo" or "done"', () => {
      taskService.create({ title: 'Task Todo', status: 'todo' });
      taskService.create({ title: 'Task Done', status: 'done' });

      const partialMatch = taskService.getByStatus('do');
      expect(partialMatch).toHaveLength(0);
    });
  });

  describe('getPaginated', () => {
    beforeEach(() => {
      for (let i = 1; i <= 5; i++) {
        taskService.create({ title: `Task ${i}` });
      }
    });

    test('BUG-02 verification: page 1 returns first page of items (1-based index)', () => {
      const page1 = taskService.getPaginated(1, 2);
      expect(page1).toHaveLength(2);
      expect(page1[0].title).toBe('Task 1');
      expect(page1[1].title).toBe('Task 2');
    });

    test('returns second page of items', () => {
      const page2 = taskService.getPaginated(2, 2);
      expect(page2).toHaveLength(2);
      expect(page2[0].title).toBe('Task 3');
      expect(page2[1].title).toBe('Task 4');
    });

    test('returns remaining items on last page', () => {
      const page3 = taskService.getPaginated(3, 2);
      expect(page3).toHaveLength(1);
      expect(page3[0].title).toBe('Task 5');
    });

    test('returns empty array when page exceeds total items', () => {
      const emptyPage = taskService.getPaginated(10, 2);
      expect(emptyPage).toEqual([]);
    });
  });

  describe('getStats', () => {
    test('calculates counts by status and overdue items accurately', () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString(); // 1 day ago
      const futureDate = new Date(Date.now() + 86400000).toISOString(); // 1 day future

      taskService.create({ title: 'T1', status: 'todo', dueDate: pastDate }); // Overdue
      taskService.create({ title: 'T2', status: 'in_progress', dueDate: pastDate }); // Overdue
      taskService.create({ title: 'T3', status: 'done', dueDate: pastDate }); // Completed (not overdue)
      taskService.create({ title: 'T4', status: 'todo', dueDate: futureDate }); // Not overdue
      taskService.create({ title: 'T5', status: 'in_progress' }); // No due date

      const stats = taskService.getStats();
      expect(stats).toEqual({
        todo: 2,
        in_progress: 2,
        done: 1,
        overdue: 2,
      });
    });
  });

  describe('update', () => {
    test('updates specified fields of an existing task', () => {
      const task = taskService.create({ title: 'Original Title', priority: 'low' });
      const updated = taskService.update(task.id, { title: 'Updated Title', priority: 'high' });

      expect(updated.title).toBe('Updated Title');
      expect(updated.priority).toBe('high');
      expect(taskService.findById(task.id).title).toBe('Updated Title');
    });

    test('returns null when updating non-existent task', () => {
      expect(taskService.update('non-existent-id', { title: 'New' })).toBeNull();
    });

    test('BUG-05 verification: does not allow overwriting system fields (id, createdAt, completedAt)', () => {
      const task = taskService.create({ title: 'System Field Protection Test' });
      const originalId = task.id;
      const originalCreatedAt = task.createdAt;

      const updated = taskService.update(task.id, {
        id: 'hacked-id',
        createdAt: '2000-01-01T00:00:00.000Z',
        completedAt: '2000-01-01T00:00:00.000Z',
        title: 'Title Changed',
      });

      expect(updated.id).toBe(originalId);
      expect(updated.createdAt).toBe(originalCreatedAt);
      expect(updated.title).toBe('Title Changed');
    });
  });

  describe('remove', () => {
    test('removes existing task and returns true', () => {
      const task = taskService.create({ title: 'Delete Me' });
      expect(taskService.remove(task.id)).toBe(true);
      expect(taskService.findById(task.id)).toBeUndefined();
      expect(taskService.getAll()).toHaveLength(0);
    });

    test('returns false when removing non-existent task', () => {
      expect(taskService.remove('fake-id')).toBe(false);
    });
  });

  describe('completeTask', () => {
    test('marks task as completed with status done and completedAt timestamp', () => {
      const task = taskService.create({ title: 'Task to Complete', priority: 'high' });
      const completed = taskService.completeTask(task.id);

      expect(completed.status).toBe('done');
      expect(completed.completedAt).not.toBeNull();
      expect(typeof completed.completedAt).toBe('string');
    });

    test('BUG-03 verification: preserves original task priority when completed', () => {
      const highTask = taskService.create({ title: 'High Priority Task', priority: 'high' });
      const completed = taskService.completeTask(highTask.id);
      expect(completed.priority).toBe('high');
    });

    test('returns null if completing non-existent task', () => {
      expect(taskService.completeTask('fake-id')).toBeNull();
    });
  });

  describe('assignTask', () => {
    test('assigns assignee to task and returns updated task', () => {
      const task = taskService.create({ title: 'Task to Assign' });
      const assigned = taskService.assignTask(task.id, 'John Doe');

      expect(assigned.assignee).toBe('John Doe');
      expect(taskService.findById(task.id).assignee).toBe('John Doe');
    });

    test('returns null if assigning non-existent task', () => {
      expect(taskService.assignTask('fake-id', 'John Doe')).toBeNull();
    });
  });
});
