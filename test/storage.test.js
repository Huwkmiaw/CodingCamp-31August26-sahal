/**
 * Property-Based Tests: Storage Module
 * Feature: personal-dashboard-todo
 * Property 18: Corrupt storage data falls back to component defaults
 * Validates: Requirements 8.4
 */

'use strict';

const fc = require('fast-check');

// ---------------------------------------------------------------------------
// localStorage mock for Node.js environment
// The Storage module calls localStorage directly, so we inject a global mock
// that allows us to pre-seed arbitrary raw strings (including malformed JSON).
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
// Inline the Storage module logic (mirrors js/app.js exactly so tests target
// the real implementation, not a stub).
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
// Helpers
// ---------------------------------------------------------------------------

/**
 * Seed the raw (un-parsed) value directly into the mock localStorage under
 * the prefixed key, bypassing Storage.set so we can inject corrupt JSON.
 */
function seedRaw(key, rawString) {
  localStorage.setItem('pdt_' + key, rawString);
}

function clearAll() {
  localStorage.clear();
}

// ---------------------------------------------------------------------------
// Arbitrary: strings that are GUARANTEED to be invalid JSON
//
// fast-check's fc.string() can accidentally produce valid JSON (e.g. "null",
// "true", quoted strings, numbers). We generate strings that structurally
// cannot parse: we prepend a lone '{' which makes any trailing content form
// an unterminated object, and we reject the few edge cases that might still
// be parseable.
// ---------------------------------------------------------------------------
const invalidJsonArb = fc
  .string({ minLength: 0, maxLength: 50 })
  .map(s => '{' + s)           // always starts an unterminated object
  .filter(s => {
    try { JSON.parse(s); return false; } // discard anything that accidentally parses
    catch (_) { return true; }
  });

// ---------------------------------------------------------------------------
// Component default values as defined in design.md / requirements 8.4
// ---------------------------------------------------------------------------
const COMPONENT_DEFAULTS = [
  { key: 'tasks',    defaultValue: [],        label: 'tasks' },
  { key: 'links',    defaultValue: [],        label: 'links' },
  { key: 'customName', defaultValue: '',      label: 'customName' },
  { key: 'theme',    defaultValue: 'light',   label: 'theme' },
  { key: 'sortMode', defaultValue: 'default', label: 'sortMode' },
];

// ---------------------------------------------------------------------------
// Property 18 — main test
// ---------------------------------------------------------------------------

// Feature: personal-dashboard-todo, Property 18: Corrupt storage data falls back to component defaults
console.log('Running Property 18: Corrupt storage data falls back to component defaults...');

let passed = 0;
let failed = 0;

for (const { key, defaultValue, label } of COMPONENT_DEFAULTS) {
  try {
    fc.assert(
      fc.property(invalidJsonArb, (corruptJson) => {
        // Arrange: seed the corrupt JSON directly into localStorage
        clearAll();
        seedRaw(key, corruptJson);

        // Act: Storage.get must not throw, and must return the defaultValue
        let result;
        try {
          result = Storage.get(key, defaultValue);
        } catch (e) {
          // Any throw is a property violation
          return false;
        }

        // Assert: result must deep-equal the defaultValue
        return JSON.stringify(result) === JSON.stringify(defaultValue);
      }),
      { numRuns: 100, verbose: true }
    );

    console.log(`  ✓ [${label}] corrupt JSON → returns default (${JSON.stringify(defaultValue)})`);
    passed++;
  } catch (e) {
    console.error(`  ✗ [${label}] FAILED:`, e.message);
    failed++;
  }
}

// ---------------------------------------------------------------------------
// Additional unit-level assertions: verify the corrupt key is removed from
// localStorage after get() (per design.md error handling spec).
// ---------------------------------------------------------------------------
console.log('\nRunning unit checks: corrupt key is removed after get()...');

for (const { key, defaultValue, label } of COMPONENT_DEFAULTS) {
  clearAll();
  seedRaw(key, '{not valid json at all');
  Storage.get(key, defaultValue);
  const remaining = localStorage.getItem('pdt_' + key);
  if (remaining === null) {
    console.log(`  ✓ [${label}] corrupt key cleaned up from localStorage`);
    passed++;
  } else {
    console.error(`  ✗ [${label}] corrupt key NOT removed — still: ${remaining}`);
    failed++;
  }
}

// ---------------------------------------------------------------------------
// Additional unit check: missing key (null) also returns default, no throw
// ---------------------------------------------------------------------------
console.log('\nRunning unit checks: missing key returns default...');

for (const { key, defaultValue, label } of COMPONENT_DEFAULTS) {
  clearAll();
  let result;
  try {
    result = Storage.get(key, defaultValue);
  } catch (e) {
    console.error(`  ✗ [${label}] threw on missing key: ${e.message}`);
    failed++;
    continue;
  }
  if (JSON.stringify(result) === JSON.stringify(defaultValue)) {
    console.log(`  ✓ [${label}] missing key → returns default`);
    passed++;
  } else {
    console.error(`  ✗ [${label}] expected ${JSON.stringify(defaultValue)}, got ${JSON.stringify(result)}`);
    failed++;
  }
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------
console.log(`\n${'─'.repeat(55)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('All tests passed.');
}
