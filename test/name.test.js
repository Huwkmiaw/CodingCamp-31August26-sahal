/**
 * Property-Based Tests: NameSettingController Module
 * Feature: personal-dashboard-todo
 *
 * Property 4: Name validation rejects invalid inputs
 * Property 5: Name save is idempotent (last-write-wins)
 *
 * Validates: Requirements 2.2, 2.4, 2.5, 2.6
 */

'use strict';

const fc = require('fast-check');

// ---------------------------------------------------------------------------
// localStorage mock for Node.js environment
// ---------------------------------------------------------------------------
const _store = {};

global.localStorage = {
  getItem(key) {
    return Object.prototype.hasOwnProperty.call(_store, key) ? _store[key] : null;
  },
  setItem(key, value) {
    _store[key] = String(value);
  },
  removeItem(key) {
    delete _store[key];
  },
  clear() {
    Object.keys(_store).forEach(k => delete _store[k]);
  },
};

// ---------------------------------------------------------------------------
// Minimal DOM mock for Node.js environment
//
// NameSettingController interacts with:
//   - document.getElementById(INPUT_ID)    → may return null safely
//   - document.getElementById(SAVE_BTN_ID) → may return null safely
//   - document.getElementById(ERROR_ID)    → may return null safely
//   - document.dispatchEvent(new CustomEvent(...))
//   - document.addEventListener(...)       → used by GreetingWidget, not tested here
// We return null from getElementById so all DOM-side effects are skipped,
// and we capture dispatched events via a simple spy.
// ---------------------------------------------------------------------------
const _dispatchedEvents = [];

global.document = {
  getElementById() {
    return null;
  },
  dispatchEvent(event) {
    _dispatchedEvents.push(event);
  },
  addEventListener() {},
};

// CustomEvent shim for Node.js (used by handleSave to broadcast nameUpdated).
global.CustomEvent = class CustomEvent {
  constructor(type, options) {
    this.type = type;
    this.detail = options && options.detail !== undefined ? options.detail : null;
  }
};

// ---------------------------------------------------------------------------
// Inline Storage module (mirrors js/app.js exactly)
// ---------------------------------------------------------------------------
const Storage = (() => {
  const PREFIX = 'pdt_';

  const available = (() => {
    try {
      const testKey = PREFIX + '__test__';
      localStorage.setItem(testKey, '1');
      localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  })();

  function get(key, defaultValue) {
    if (!available) return defaultValue;
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (raw === null) return defaultValue;
      return JSON.parse(raw);
    } catch (e) {
      try { localStorage.removeItem(PREFIX + key); } catch (_) {}
      return defaultValue;
    }
  }

  function set(key, value) {
    if (!available) return;
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch (e) {
      console.warn('LocalStorage quota exceeded for key:', PREFIX + key);
    }
  }

  function remove(key) {
    if (!available) return;
    try {
      localStorage.removeItem(PREFIX + key);
    } catch (e) {}
  }

  function isAvailable() {
    return available;
  }

  return { get, set, remove, isAvailable };
})();

// ---------------------------------------------------------------------------
// Inline NameSettingController pure functions (mirrors js/app.js exactly)
//
// We inline only the pure/testable functions: validateName and handleSave
// (the save/dispatch logic). init() is DOM-bound and not tested here.
// ---------------------------------------------------------------------------

/**
 * Validates a name input value.
 * @param {string} value - Raw input value
 * @returns {{ valid: boolean, error?: string }}
 */
function validateName(value) {
  const trimmed = value ? value.trim() : '';
  if (!trimmed) {
    return { valid: false, error: 'Nama tidak boleh kosong' };
  }
  if (trimmed.length > 50) {
    return { valid: false, error: 'Nama maksimal 50 karakter' };
  }
  return { valid: true };
}

/**
 * Handles saving a name: validate → save to Storage → dispatch nameUpdated event.
 * Mirrors NameSettingController.handleSave() from js/app.js.
 * @param {string} inputValue - Raw input value
 * @returns {{ saved: boolean, savedName?: string }} — for test observability
 */
function handleSave(inputValue) {
  const result = validateName(inputValue);
  if (!result.valid) {
    return { saved: false };
  }

  const trimmedName = inputValue.trim();
  Storage.set('customName', trimmedName);

  document.dispatchEvent(new CustomEvent('nameUpdated', { detail: trimmedName }));
  return { saved: true, savedName: trimmedName };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clearStorage() {
  localStorage.clear();
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

// Valid name: non-empty, non-whitespace-only, trimmed length 1–50 chars.
const validNameArb = fc
  .string({ minLength: 1, maxLength: 50 })
  .filter(s => s.trim().length > 0 && s.trim().length <= 50);

// Empty string
const emptyStringArb = fc.constant('');

// Whitespace-only string (length 1–30, all whitespace characters)
const whitespaceOnlyArb = fc
  .array(fc.constantFrom(' ', '\t', '\n', '\r'), { minLength: 1, maxLength: 30 })
  .map(chars => chars.join(''));

// Name exceeding 50 chars (trimmed length > 50).
// We use printable ASCII so String.length == character count (no surrogates).
const asciiCharArb = fc.integer({ min: 32, max: 126 }).map(n => String.fromCharCode(n));

const tooLongNameArb = fc
  .array(asciiCharArb, { minLength: 51, maxLength: 200 })
  .map(chars => chars.join(''))
  .filter(s => s.trim().length > 50);

// A sequence of 2–10 valid names (for Property 5 last-write-wins test).
const nameSequenceArb = fc.array(validNameArb, { minLength: 2, maxLength: 10 });

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
    console.error('   ', e.message);
    failed++;
  }
}

// ===========================================================================
// Property 4: Name validation rejects invalid inputs
// ===========================================================================
// Feature: personal-dashboard-todo, Property 4: Name validation rejects invalid inputs

console.log('\nRunning Property 4: Name validation rejects invalid inputs...');

// 4a — empty string → { valid: false }
run('empty string returns { valid: false }', () => {
  // Feature: personal-dashboard-todo, Property 4: Name validation rejects invalid inputs
  fc.assert(
    fc.property(emptyStringArb, (input) => {
      const result = validateName(input);
      return result.valid === false && typeof result.error === 'string' && result.error.length > 0;
    }),
    { numRuns: 1 }
  );
});

// 4b — whitespace-only string → { valid: false }
run('whitespace-only string returns { valid: false }', () => {
  // Feature: personal-dashboard-todo, Property 4: Name validation rejects invalid inputs
  fc.assert(
    fc.property(whitespaceOnlyArb, (input) => {
      const result = validateName(input);
      return result.valid === false && typeof result.error === 'string' && result.error.length > 0;
    }),
    { numRuns: 100 }
  );
});

// 4c — string with trimmed length > 50 chars → { valid: false }
run('string with trimmed length >50 chars returns { valid: false }', () => {
  // Feature: personal-dashboard-todo, Property 4: Name validation rejects invalid inputs
  fc.assert(
    fc.property(tooLongNameArb, (input) => {
      const result = validateName(input);
      return result.valid === false && typeof result.error === 'string' && result.error.length > 0;
    }),
    { numRuns: 100 }
  );
});

// 4d — valid name (non-empty, non-whitespace-only, trimmed length ≤ 50) → { valid: true }
run('valid name (non-empty, ≤50 chars) returns { valid: true }', () => {
  // Feature: personal-dashboard-todo, Property 4: Name validation rejects invalid inputs
  fc.assert(
    fc.property(validNameArb, (input) => {
      const result = validateName(input);
      return result.valid === true;
    }),
    { numRuns: 100 }
  );
});

// 4e — valid input produces no error field (or error is undefined)
run('valid name result has no error field', () => {
  // Feature: personal-dashboard-todo, Property 4: Name validation rejects invalid inputs
  fc.assert(
    fc.property(validNameArb, (input) => {
      const result = validateName(input);
      return result.error === undefined;
    }),
    { numRuns: 100 }
  );
});

// 4f — invalid inputs do NOT trigger a Storage write
run('invalid input does not write to Storage', () => {
  // Feature: personal-dashboard-todo, Property 4: Name validation rejects invalid inputs
  // Union of all invalid input types
  const invalidArb = fc.oneof(emptyStringArb, whitespaceOnlyArb, tooLongNameArb);

  fc.assert(
    fc.property(invalidArb, (input) => {
      clearStorage();
      handleSave(input);
      // customName should not have been written
      const stored = Storage.get('customName', '__sentinel__');
      return stored === '__sentinel__';
    }),
    { numRuns: 100 }
  );
});

// 4g — boundary: name of exactly 50 printable ASCII chars is valid
run('name of exactly 50 printable ASCII chars is valid', () => {
  // Feature: personal-dashboard-todo, Property 4: Name validation rejects invalid inputs
  const exactly50Arb = fc
    .array(asciiCharArb, { minLength: 50, maxLength: 50 })
    .map(chars => chars.join(''));

  fc.assert(
    fc.property(exactly50Arb, (input) => {
      const result = validateName(input);
      return result.valid === true;
    }),
    { numRuns: 100 }
  );
});

// 4h — boundary: name whose TRIMMED length is exactly 51 printable ASCII chars is rejected
//
// validateName trims first, then checks length. A raw string of 51 non-whitespace
// ASCII chars has trimmed length 51 > 50, so it must be rejected.
run('name with trimmed length of exactly 51 printable ASCII chars is rejected', () => {
  // Feature: personal-dashboard-todo, Property 4: Name validation rejects invalid inputs
  // Use only printable ASCII non-space chars so trim() does not reduce the length.
  const nonSpaceAsciiCharArb = fc.integer({ min: 33, max: 126 }).map(n => String.fromCharCode(n));

  const exactly51TrimmedArb = fc
    .array(nonSpaceAsciiCharArb, { minLength: 51, maxLength: 51 })
    .map(chars => chars.join(''));

  fc.assert(
    fc.property(exactly51TrimmedArb, (input) => {
      // Precondition: trimmed length really is 51 (sanity check)
      if (input.trim().length !== 51) return true; // skip if generator misbehaves
      const result = validateName(input);
      return result.valid === false;
    }),
    { numRuns: 100 }
  );
});

// ===========================================================================
// Property 5: Name save is idempotent (last-write-wins)
// ===========================================================================
// Feature: personal-dashboard-todo, Property 5: Name save is idempotent (last-write-wins)

console.log('\nRunning Property 5: Name save is idempotent (last-write-wins)...');

// 5a — after a sequence of valid saves, Storage holds only the last value
run('after N saves, Storage holds the last saved name', () => {
  // Feature: personal-dashboard-todo, Property 5: Name save is idempotent (last-write-wins)
  fc.assert(
    fc.property(nameSequenceArb, (names) => {
      clearStorage();

      // Save each name in sequence
      for (const name of names) {
        handleSave(name);
      }

      const lastSaved = names[names.length - 1].trim();
      const storedValue = Storage.get('customName', '__sentinel__');

      return storedValue === lastSaved;
    }),
    { numRuns: 100 }
  );
});

// 5b — saving the same name twice yields the same stored result (idempotency)
run('saving the same name twice yields the same stored result', () => {
  // Feature: personal-dashboard-todo, Property 5: Name save is idempotent (last-write-wins)
  fc.assert(
    fc.property(validNameArb, (name) => {
      clearStorage();

      handleSave(name);
      const afterFirst = Storage.get('customName', '__sentinel__');

      handleSave(name);
      const afterSecond = Storage.get('customName', '__sentinel__');

      return afterFirst === afterSecond;
    }),
    { numRuns: 100 }
  );
});

// 5c — a later valid save overwrites an earlier valid save
run('later save overwrites earlier save', () => {
  // Feature: personal-dashboard-todo, Property 5: Name save is idempotent (last-write-wins)
  fc.assert(
    fc.property(
      validNameArb,
      validNameArb,
      (firstName, secondName) => {
        clearStorage();

        handleSave(firstName);
        handleSave(secondName);

        const stored = Storage.get('customName', '__sentinel__');
        // The stored value must equal the trimmed second name
        return stored === secondName.trim();
      }
    ),
    { numRuns: 100 }
  );
});

// 5d — an invalid save between two valid saves does not overwrite the first valid save
run('invalid save between two valid saves does not overwrite the earlier valid save', () => {
  // Feature: personal-dashboard-todo, Property 5: Name save is idempotent (last-write-wins)
  const invalidArb = fc.oneof(emptyStringArb, whitespaceOnlyArb, tooLongNameArb);

  fc.assert(
    fc.property(validNameArb, invalidArb, (validName, invalidName) => {
      clearStorage();

      handleSave(validName);          // first valid save
      const afterValid = Storage.get('customName', '__sentinel__');

      handleSave(invalidName);        // invalid — should be ignored
      const afterInvalid = Storage.get('customName', '__sentinel__');

      // Storage must still hold the first valid name
      return afterInvalid === afterValid;
    }),
    { numRuns: 100 }
  );
});

// 5e — handleSave trims leading/trailing whitespace before storing
run('handleSave stores the trimmed name (not raw input with surrounding spaces)', () => {
  // Feature: personal-dashboard-todo, Property 5: Name save is idempotent (last-write-wins)
  // Build a valid name wrapped in leading/trailing spaces
  const paddedNameArb = fc
    .tuple(
      fc.array(fc.constantFrom(' ', '\t'), { minLength: 1, maxLength: 5 }).map(c => c.join('')),
      validNameArb,
      fc.array(fc.constantFrom(' ', '\t'), { minLength: 1, maxLength: 5 }).map(c => c.join(''))
    )
    .map(([before, name, after]) => before + name + after)
    .filter(s => s.trim().length > 0 && s.trim().length <= 50);

  fc.assert(
    fc.property(paddedNameArb, (paddedInput) => {
      clearStorage();
      handleSave(paddedInput);
      const stored = Storage.get('customName', '__sentinel__');
      return stored === paddedInput.trim();
    }),
    { numRuns: 100 }
  );
});

// ===========================================================================
// Results
// ===========================================================================

console.log(`\n${'─'.repeat(55)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('All tests passed.');
}
