/**
 * Property-Based Tests: TodoManager & SortController Modules
 * Feature: personal-dashboard-todo
 *
 * Property 8:  Task text validation rejects invalid inputs
 * Property 9:  Task addition grows list and preserves all existing tasks
 * Property 10: Completed toggle is a round-trip (involution)
 * Property 11: Task deletion removes exactly the target task
 * Property 12: Sort does not mutate the original data order
 * Property 13: Sort order correctness for all modes
 *
 * Validates: Requirements 4.2, 4.3, 4.4, 4.7, 4.8, 4.9, 4.10, 4.11, 4.12,
 *            5.1, 5.2, 5.5
 */

'use strict';

const fc = require('fast-check');

// ---------------------------------------------------------------------------
// Pure functions inlined from js/app.js (TodoManager & SortController)
// These are exact copies of the real implementations — no stubs.
// ---------------------------------------------------------------------------

/**
 * generateId: timestamp-based unique ID (mirrors app.js helper)
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/**
 * validateText: mirrors TodoManager.validateText
 * @param {string} text
 * @param {number} maxLen
 * @returns {{ valid: boolean, error?: string }}
 */
function validateText(text, maxLen) {
  const trimmed = text ? text.trim() : '';
  if (!trimmed) {
    return { valid: false, error: 'Teks tugas tidak boleh kosong' };
  }
  if (trimmed.length > maxLen) {
    return { valid: false, error: `Teks tugas maksimal ${maxLen} karakter` };
  }
  return { valid: true };
}

/**
 * applySort: mirrors SortController.applySort — no side effects, pure function.
 * @param {Task[]} tasks
 * @param {string} mode
 * @returns {Task[]}
 */
function applySort(tasks, mode) {
  const sorted = [...tasks];

  if (mode === 'default') {
    sorted.sort((a, b) => a.addedAt - b.addedAt);
  } else if (mode === 'incomplete') {
    sorted.sort((a, b) => {
      const diff = (a.completed ? 1 : 0) - (b.completed ? 1 : 0);
      if (diff !== 0) return diff;
      return a.addedAt - b.addedAt;
    });
  } else if (mode === 'complete') {
    sorted.sort((a, b) => {
      const diff = (a.completed ? 0 : 1) - (b.completed ? 0 : 1);
      if (diff !== 0) return diff;
      return a.addedAt - b.addedAt;
    });
  } else {
    sorted.sort((a, b) => a.addedAt - b.addedAt);
  }

  return sorted;
}

// ---------------------------------------------------------------------------
// In-memory TodoManager simulation (no DOM, no Storage)
// Mirrors the stateful behaviour of TodoManager from app.js.
// ---------------------------------------------------------------------------

function createTodoState() {
  let tasks = [];

  function addTask(text) {
    const result = validateText(text, 200);
    if (!result.valid) return result;
    const trimmed = text.trim();
    tasks.push({
      id:        generateId(),
      text:      trimmed,
      completed: false,
      addedAt:   Date.now(),
    });
    return { valid: true };
  }

  function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (task) task.completed = !task.completed;
  }

  function deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
  }

  function getTasks() {
    return tasks;
  }

  function setTasks(arr) {
    tasks = arr.map(t => ({ ...t }));
  }

  return { addTask, toggleTask, deleteTask, getTasks, setTasks };
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const MAX_LEN = 200;

// Valid task text: non-empty, non-whitespace-only, length 1–200 chars.
const validTextArb = fc
  .string({ minLength: 1, maxLength: MAX_LEN })
  .filter(s => s.trim().length > 0);

// Empty / whitespace-only strings (fc.stringOf tidak tersedia di fast-check v4)
const emptyOrWhitespaceArb = fc
  .array(fc.constantFrom(' ', '\t', '\n'), { minLength: 0, maxLength: 10 })
  .map(chars => chars.join(''));

// String longer than MAX_LEN
const tooLongArb = fc
  .string({ minLength: MAX_LEN + 1, maxLength: MAX_LEN + 100 })
  .filter(s => s.trim().length > MAX_LEN);

// A simple task object arbitrary (for array seeding)
const taskArb = fc.record({
  id:        fc.string({ minLength: 5, maxLength: 15 }),
  text:      validTextArb,
  completed: fc.boolean(),
  addedAt:   fc.integer({ min: 0, max: 9_999_999_999_999 }),
});

// Array of 0–10 unique-id tasks
const tasksArb = fc
  .array(taskArb, { minLength: 0, maxLength: 10 })
  .map(arr => {
    // Ensure unique ids by re-assigning
    return arr.map((t, i) => ({ ...t, id: `task-${i}-${t.id}` }));
  });

// At least one task (for toggle/delete tests)
const nonEmptyTasksArb = fc
  .array(taskArb, { minLength: 1, maxLength: 10 })
  .map(arr => arr.map((t, i) => ({ ...t, id: `task-${i}-${t.id}` })));

// Sort modes
const sortModeArb = fc.constantFrom('default', 'incomplete', 'complete');

// ---------------------------------------------------------------------------
// Test runner helpers
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function run(label, fn) {
  try {
    fn();
    console.log(`  ✓ ${label}`);
    passed++;
  } catch (e) {
    console.error(`  ✗ ${label}`);
    console.error('   ', e.message || e);
    failed++;
  }
}

// ---------------------------------------------------------------------------
// Property 8: Task text validation rejects invalid inputs
// Validates: Requirements 4.2, 4.3, 4.4, 4.7, 4.8
// ---------------------------------------------------------------------------
console.log('\nProperty 8: Task text validation rejects invalid inputs');

run('empty string → { valid: false }', () => {
  fc.assert(
    fc.property(emptyOrWhitespaceArb, (text) => {
      const result = validateText(text, MAX_LEN);
      return result.valid === false;
    }),
    { numRuns: 100 }
  );
});

run('text longer than 200 chars (after trim) → { valid: false }', () => {
  fc.assert(
    fc.property(tooLongArb, (text) => {
      const result = validateText(text, MAX_LEN);
      return result.valid === false;
    }),
    { numRuns: 100 }
  );
});

run('valid text → { valid: true }', () => {
  fc.assert(
    fc.property(validTextArb, (text) => {
      const result = validateText(text, MAX_LEN);
      return result.valid === true;
    }),
    { numRuns: 100 }
  );
});

run('invalid input → result has error message string', () => {
  fc.assert(
    fc.property(emptyOrWhitespaceArb, (text) => {
      const result = validateText(text, MAX_LEN);
      return result.valid === false && typeof result.error === 'string' && result.error.length > 0;
    }),
    { numRuns: 100 }
  );
});

// ---------------------------------------------------------------------------
// Property 9: Task addition grows list and preserves all existing tasks
// Validates: Requirements 4.2, 4.12
// ---------------------------------------------------------------------------
console.log('\nProperty 9: Task addition grows list and preserves all existing tasks');

run('addTask → length grows by exactly 1', () => {
  fc.assert(
    fc.property(tasksArb, validTextArb, (initialTasks, text) => {
      const state = createTodoState();
      state.setTasks(initialTasks);
      const before = state.getTasks().length;
      state.addTask(text);
      return state.getTasks().length === before + 1;
    }),
    { numRuns: 100 }
  );
});

run('addTask → all previous task ids still present', () => {
  fc.assert(
    fc.property(tasksArb, validTextArb, (initialTasks, text) => {
      const state = createTodoState();
      state.setTasks(initialTasks);
      const oldIds = new Set(state.getTasks().map(t => t.id));
      state.addTask(text);
      const newIds = new Set(state.getTasks().map(t => t.id));
      return [...oldIds].every(id => newIds.has(id));
    }),
    { numRuns: 100 }
  );
});

run('addTask → new task has completed === false', () => {
  fc.assert(
    fc.property(tasksArb, validTextArb, (initialTasks, text) => {
      const state = createTodoState();
      state.setTasks(initialTasks);
      state.addTask(text);
      const tasks = state.getTasks();
      const newest = tasks[tasks.length - 1];
      return newest.completed === false;
    }),
    { numRuns: 100 }
  );
});

run('addTask with invalid text → list length unchanged', () => {
  fc.assert(
    fc.property(tasksArb, emptyOrWhitespaceArb, (initialTasks, text) => {
      const state = createTodoState();
      state.setTasks(initialTasks);
      const before = state.getTasks().length;
      state.addTask(text);
      return state.getTasks().length === before;
    }),
    { numRuns: 100 }
  );
});

// ---------------------------------------------------------------------------
// Property 10: Completed toggle is a round-trip (involution)
// Validates: Requirements 4.9, 4.10
// ---------------------------------------------------------------------------
console.log('\nProperty 10: Completed toggle is a round-trip (involution)');

run('toggle twice → completed back to original value', () => {
  fc.assert(
    fc.property(nonEmptyTasksArb, (initialTasks) => {
      const state = createTodoState();
      state.setTasks(initialTasks);
      const target = state.getTasks()[0];
      const originalCompleted = target.completed;
      state.toggleTask(target.id);
      state.toggleTask(target.id);
      const restored = state.getTasks().find(t => t.id === target.id);
      return restored && restored.completed === originalCompleted;
    }),
    { numRuns: 100 }
  );
});

run('toggle once → completed flipped', () => {
  fc.assert(
    fc.property(nonEmptyTasksArb, (initialTasks) => {
      const state = createTodoState();
      state.setTasks(initialTasks);
      const target = state.getTasks()[0];
      const before = target.completed;
      state.toggleTask(target.id);
      const after = state.getTasks().find(t => t.id === target.id);
      return after && after.completed === !before;
    }),
    { numRuns: 100 }
  );
});

run('toggle does not affect other tasks', () => {
  fc.assert(
    fc.property(nonEmptyTasksArb, (initialTasks) => {
      if (initialTasks.length < 2) return true; // skip trivial case
      const state = createTodoState();
      state.setTasks(initialTasks);
      const tasks = state.getTasks();
      const targetId = tasks[0].id;
      const othersBefore = tasks.slice(1).map(t => ({ id: t.id, completed: t.completed }));
      state.toggleTask(targetId);
      const othersAfter = state.getTasks().filter(t => t.id !== targetId);
      return othersBefore.every((o, i) => othersAfter[i] && othersAfter[i].completed === o.completed);
    }),
    { numRuns: 100 }
  );
});

// ---------------------------------------------------------------------------
// Property 11: Task deletion removes exactly the target task
// Validates: Requirements 4.11
// ---------------------------------------------------------------------------
console.log('\nProperty 11: Task deletion removes exactly the target task');

run('deleteTask → target task no longer present', () => {
  fc.assert(
    fc.property(nonEmptyTasksArb, (initialTasks) => {
      const state = createTodoState();
      state.setTasks(initialTasks);
      const targetId = state.getTasks()[0].id;
      state.deleteTask(targetId);
      return !state.getTasks().some(t => t.id === targetId);
    }),
    { numRuns: 100 }
  );
});

run('deleteTask → length reduced by exactly 1', () => {
  fc.assert(
    fc.property(nonEmptyTasksArb, (initialTasks) => {
      const state = createTodoState();
      state.setTasks(initialTasks);
      const before = state.getTasks().length;
      const targetId = state.getTasks()[0].id;
      state.deleteTask(targetId);
      return state.getTasks().length === before - 1;
    }),
    { numRuns: 100 }
  );
});

run('deleteTask → all other tasks remain unchanged', () => {
  fc.assert(
    fc.property(nonEmptyTasksArb, (initialTasks) => {
      const state = createTodoState();
      state.setTasks(initialTasks);
      const targetId = state.getTasks()[0].id;
      const othersBefore = state.getTasks().filter(t => t.id !== targetId).map(t => t.id);
      state.deleteTask(targetId);
      const remainingIds = state.getTasks().map(t => t.id);
      return othersBefore.every(id => remainingIds.includes(id));
    }),
    { numRuns: 100 }
  );
});

// ---------------------------------------------------------------------------
// Property 12: Sort does not mutate the original data order
// Validates: Requirements 5.2, 5.5
// ---------------------------------------------------------------------------
console.log('\nProperty 12: Sort does not mutate the original data order');

run('applySort returns a new array reference (not the same object)', () => {
  fc.assert(
    fc.property(tasksArb, sortModeArb, (tasks, mode) => {
      const result = applySort(tasks, mode);
      return result !== tasks;
    }),
    { numRuns: 100 }
  );
});

run('original array order unchanged after applySort', () => {
  fc.assert(
    fc.property(tasksArb, sortModeArb, (tasks, mode) => {
      const originalOrder = tasks.map(t => t.id);
      applySort(tasks, mode);
      const afterOrder = tasks.map(t => t.id);
      return originalOrder.every((id, i) => afterOrder[i] === id);
    }),
    { numRuns: 100 }
  );
});

run('sorted result contains exactly the same tasks (same ids, same count)', () => {
  fc.assert(
    fc.property(tasksArb, sortModeArb, (tasks, mode) => {
      const result = applySort(tasks, mode);
      const originalIds = new Set(tasks.map(t => t.id));
      const resultIds = new Set(result.map(t => t.id));
      return (
        result.length === tasks.length &&
        [...originalIds].every(id => resultIds.has(id))
      );
    }),
    { numRuns: 100 }
  );
});

// ---------------------------------------------------------------------------
// Property 13: Sort order correctness for all modes
// Validates: Requirements 5.1, 5.2
// ---------------------------------------------------------------------------
console.log('\nProperty 13: Sort order correctness for all modes');

run('mode "incomplete" → all completed=false before completed=true', () => {
  fc.assert(
    fc.property(tasksArb, (tasks) => {
      const result = applySort(tasks, 'incomplete');
      let seenCompleted = false;
      for (const t of result) {
        if (t.completed) seenCompleted = true;
        if (!t.completed && seenCompleted) return false; // incomplete after complete — wrong!
      }
      return true;
    }),
    { numRuns: 100 }
  );
});

run('mode "complete" → all completed=true before completed=false', () => {
  fc.assert(
    fc.property(tasksArb, (tasks) => {
      const result = applySort(tasks, 'complete');
      let seenIncomplete = false;
      for (const t of result) {
        if (!t.completed) seenIncomplete = true;
        if (t.completed && seenIncomplete) return false; // complete after incomplete — wrong!
      }
      return true;
    }),
    { numRuns: 100 }
  );
});

run('mode "default" → all tasks sorted ascending by addedAt', () => {
  fc.assert(
    fc.property(tasksArb, (tasks) => {
      const result = applySort(tasks, 'default');
      for (let i = 1; i < result.length; i++) {
        if (result[i].addedAt < result[i - 1].addedAt) return false;
      }
      return true;
    }),
    { numRuns: 100 }
  );
});

run('mode "incomplete" → within each group, ascending addedAt preserved', () => {
  fc.assert(
    fc.property(tasksArb, (tasks) => {
      const result = applySort(tasks, 'incomplete');
      // Check incomplete group
      const incomplete = result.filter(t => !t.completed);
      for (let i = 1; i < incomplete.length; i++) {
        if (incomplete[i].addedAt < incomplete[i - 1].addedAt) return false;
      }
      // Check complete group
      const complete = result.filter(t => t.completed);
      for (let i = 1; i < complete.length; i++) {
        if (complete[i].addedAt < complete[i - 1].addedAt) return false;
      }
      return true;
    }),
    { numRuns: 100 }
  );
});

run('mode "complete" → within each group, ascending addedAt preserved', () => {
  fc.assert(
    fc.property(tasksArb, (tasks) => {
      const result = applySort(tasks, 'complete');
      const complete = result.filter(t => t.completed);
      for (let i = 1; i < complete.length; i++) {
        if (complete[i].addedAt < complete[i - 1].addedAt) return false;
      }
      const incomplete = result.filter(t => !t.completed);
      for (let i = 1; i < incomplete.length; i++) {
        if (incomplete[i].addedAt < incomplete[i - 1].addedAt) return false;
      }
      return true;
    }),
    { numRuns: 100 }
  );
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
