const { validateCreateTask, validateUpdateTask, validateAssignTask } = require('../../src/utils/validators');

describe('Validators Unit Tests', () => {
  describe('validateCreateTask', () => {
    test('returns null for valid task data', () => {
      const validPayload = {
        title: 'Complete assignment',
        description: 'Write unit and integration tests',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2026-12-31T23:59:59.000Z',
      };
      expect(validateCreateTask(validPayload)).toBeNull();
    });

    test('returns error when title is missing', () => {
      expect(validateCreateTask({})).toMatch(/title is required/i);
    });

    test('returns error when title is not a string', () => {
      expect(validateCreateTask({ title: 12345 })).toMatch(/title is required/i);
    });

    test('returns error when title is empty string or only whitespace', () => {
      expect(validateCreateTask({ title: '   ' })).toMatch(/title is required/i);
    });

    test('returns error for invalid status', () => {
      expect(validateCreateTask({ title: 'Test', status: 'invalid_status' })).toMatch(/status must be one of/i);
    });

    test('returns error for invalid priority', () => {
      expect(validateCreateTask({ title: 'Test', priority: 'super_high' })).toMatch(/priority must be one of/i);
    });

    test('returns error for invalid dueDate', () => {
      expect(validateCreateTask({ title: 'Test', dueDate: 'not-a-date' })).toMatch(/dueDate must be a valid ISO date/i);
    });

    test('returns error when payload is null or non-object', () => {
      expect(validateCreateTask(null)).toMatch(/request body must be an object/i);
      expect(validateCreateTask(123)).toMatch(/request body must be an object/i);
      expect(validateCreateTask('string')).toMatch(/request body must be an object/i);
      expect(validateCreateTask([1, 2])).toMatch(/request body must be an object/i);
    });

    test('returns error when description is provided as a non-string', () => {
      expect(validateCreateTask({ title: 'Test', description: 123 })).toMatch(/description must be a string/i);
    });
  });

  describe('validateUpdateTask', () => {
    test('returns null for valid partial updates', () => {
      expect(validateUpdateTask({ title: 'New Title' })).toBeNull();
      expect(validateUpdateTask({ status: 'done', priority: 'low' })).toBeNull();
      expect(validateUpdateTask({})).toBeNull();
    });

    test('returns error when payload is null or non-object', () => {
      expect(validateUpdateTask(null)).toMatch(/request body must be an object/i);
      expect(validateUpdateTask(456)).toMatch(/request body must be an object/i);
      expect(validateUpdateTask([1, 2])).toMatch(/request body must be an object/i);
    });

    test('returns error if provided title is invalid', () => {
      expect(validateUpdateTask({ title: '' })).toMatch(/title must be a non-empty string/i);
      expect(validateUpdateTask({ title: 123 })).toMatch(/title must be a non-empty string/i);
    });

    test('returns error when description is provided as a non-string', () => {
      expect(validateUpdateTask({ description: 999 })).toMatch(/description must be a string/i);
    });

    test('returns error for invalid status update', () => {
      expect(validateUpdateTask({ status: 'unknown' })).toMatch(/status must be one of/i);
    });

    test('returns error for invalid priority update', () => {
      expect(validateUpdateTask({ priority: 'urgent' })).toMatch(/priority must be one of/i);
    });

    test('returns error for invalid dueDate update', () => {
      expect(validateUpdateTask({ dueDate: 'invalid-date' })).toMatch(/dueDate must be a valid ISO date/i);
    });
  });

  describe('validateAssignTask', () => {
    test('returns null for valid assignee name', () => {
      expect(validateAssignTask({ assignee: 'Taroo Developer' })).toBeNull();
    });

    test('returns error when assignee field is missing', () => {
      expect(validateAssignTask({})).toMatch(/assignee is required/i);
    });

    test('returns error when payload is null or non-object', () => {
      expect(validateAssignTask(null)).toMatch(/assignee is required/i);
      expect(validateAssignTask('not-an-object')).toMatch(/assignee is required/i);
      expect(validateAssignTask([1, 2])).toMatch(/assignee is required/i);
    });

    test('returns error when assignee is not a string', () => {
      expect(validateAssignTask({ assignee: 123 })).toMatch(/non-empty string/i);
    });

    test('returns error when assignee is empty or whitespace', () => {
      expect(validateAssignTask({ assignee: '   ' })).toMatch(/non-empty string/i);
    });
  });
});

