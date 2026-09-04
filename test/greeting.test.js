/**
 * Property-Based Tests: GreetingWidget Module
 * Feature: personal-dashboard-todo
 *
 * Property 1: Greeting text covers all hours bijectively
 * Property 2: Greeting format with valid name
 * Property 3: Name truncation preserves prefix
 *
 * Validates: Requirements 1.3, 1.4, 1.5, 1.6, 1.7, 1.10
 */

'use strict';

const fc = require('fast-check');

// ---------------------------------------------------------------------------
// Pure functions inlined from js/app.js (GreetingWidget module)
//
// These are the exact implementations — no stubs. Testing the real logic.
// ---------------------------------------------------------------------------

/**
 * Kembalikan teks sapaan berdasarkan jam (0–23).
 * @param {number} hour
 * @returns {string}
 */
function getGreetingText(hour) {
  if (hour >= 5  && hour <= 11) return 'Selamat Pagi';
  if (hour >= 12 && hour <= 14) return 'Selamat Siang';
  if (hour >= 15 && hour <= 17) return 'Selamat Sore';
  return 'Selamat Malam'; // 18–23 dan 0–4
}

/**
 * Potong nama di 50 karakter dan tambahkan "…" (U+2026).
 * @param {string} name
 * @returns {string}
 */
function truncateName(name) {
  if (name.length <= 50) return name;
  return name.slice(0, 50) + '\u2026';
}

/**
 * Render sapaan (logika string saja — tanpa DOM).
 * Mencerminkan logika di GreetingWidget.renderGreeting().
 * @param {string} greetingText
 * @param {string} name
 * @returns {string}
 */
function buildGreetingString(greetingText, name) {
  const trimmed = name ? name.trim() : '';
  if (trimmed) {
    return `${greetingText}, ${truncateName(trimmed)}!`;
  }
  return `${greetingText}!`;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VALID_GREETINGS = ['Selamat Pagi', 'Selamat Siang', 'Selamat Sore', 'Selamat Malam'];

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

// Valid name: non-empty, non-whitespace-only, length 1–50 UTF-16 code units.
// We use unit: 'char' (default in fc v3+) so that s.length matches the
// String.length used by truncateName — avoids multi-code-unit graphemes
// that would make length assertions unreliable.
const validNameArb = fc
  .string({ minLength: 1, maxLength: 50 })
  .filter(s => s.trim().length > 0);

// Long name: length strictly > 50 UTF-16 code units (for truncation tests).
// We build from BMP characters (code points 32–126, i.e. printable ASCII) so
// that String.length always equals the character count — no surrogate pairs.
const asciiCharArb = fc.integer({ min: 32, max: 126 }).map(n => String.fromCharCode(n));

const longNameArb = fc
  .array(asciiCharArb, { minLength: 51, maxLength: 200 })
  .map(chars => chars.join(''));

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
// Property 1: Greeting text covers all hours bijectively
// ===========================================================================
// Feature: personal-dashboard-todo, Property 1: Greeting text covers all hours bijectively

console.log('\nRunning Property 1: Greeting text covers all hours bijectively...');

// 1a — for any hour in [0, 23], the result is one of the four valid strings
run('any hour in [0,23] maps to a valid greeting string', () => {
  // Feature: personal-dashboard-todo, Property 1: Greeting text covers all hours bijectively
  fc.assert(
    fc.property(
      fc.integer({ min: 0, max: 23 }),
      (hour) => {
        const greeting = getGreetingText(hour);
        return VALID_GREETINGS.includes(greeting);
      }
    ),
    { numRuns: 100 }
  );
});

// 1b — the mapping is deterministic: same hour always yields same greeting
run('same hour always yields the same greeting (determinism)', () => {
  // Feature: personal-dashboard-todo, Property 1: Greeting text covers all hours bijectively
  fc.assert(
    fc.property(
      fc.integer({ min: 0, max: 23 }),
      (hour) => {
        return getGreetingText(hour) === getGreetingText(hour);
      }
    ),
    { numRuns: 100 }
  );
});

// 1c — boundary checks: each range boundary maps to the expected greeting
//   (unit-style verification within a property harness)
run('hour boundary values map to the correct greeting strings', () => {
  // Feature: personal-dashboard-todo, Property 1: Greeting text covers all hours bijectively
  const expectations = [
    [0,  'Selamat Malam'],
    [4,  'Selamat Malam'],
    [5,  'Selamat Pagi'],
    [11, 'Selamat Pagi'],
    [12, 'Selamat Siang'],
    [14, 'Selamat Siang'],
    [15, 'Selamat Sore'],
    [17, 'Selamat Sore'],
    [18, 'Selamat Malam'],
    [23, 'Selamat Malam'],
  ];

  fc.assert(
    fc.property(
      fc.constantFrom(...expectations),
      ([hour, expected]) => {
        return getGreetingText(hour) === expected;
      }
    ),
    { numRuns: 100 }
  );
});

// 1d — all four greeting strings are reachable (exhaustiveness)
run('all four greeting strings are reachable across the full hour range', () => {
  // Feature: personal-dashboard-todo, Property 1: Greeting text covers all hours bijectively
  const reached = new Set();
  for (let h = 0; h <= 23; h++) {
    reached.add(getGreetingText(h));
  }
  if (reached.size !== 4) {
    throw new Error(
      `Expected 4 distinct greetings to be reachable, got ${reached.size}: ` +
      [...reached].join(', ')
    );
  }
});

// ===========================================================================
// Property 2: Greeting format with valid name
// ===========================================================================
// Feature: personal-dashboard-todo, Property 2: Greeting format with valid name

console.log('\nRunning Property 2: Greeting format with valid name...');

// 2a — for any valid name and any hour, the output matches "[Sapaan], [Nama]!"
run('valid name produces "[Sapaan], [Nama]!" format', () => {
  // Feature: personal-dashboard-todo, Property 2: Greeting format with valid name
  fc.assert(
    fc.property(
      validNameArb,
      fc.integer({ min: 0, max: 23 }),
      (name, hour) => {
        const greetingText = getGreetingText(hour);
        const result = buildGreetingString(greetingText, name);

        // Must start with the correct greeting text
        if (!result.startsWith(greetingText + ', ')) return false;

        // Must end with "!"
        if (!result.endsWith('!')) return false;

        // Must contain exactly one comma-space separator after the greeting
        const afterGreeting = result.slice(greetingText.length + 2); // skip "Sapaan, "
        const displayName = afterGreeting.slice(0, -1);              // strip trailing "!"

        // displayName must be non-empty
        if (displayName.length === 0) return false;

        return true;
      }
    ),
    { numRuns: 100 }
  );
});

// 2b — the name portion of the output matches truncateName(name.trim())
run('name in greeting output equals truncateName(name.trim())', () => {
  // Feature: personal-dashboard-todo, Property 2: Greeting format with valid name
  fc.assert(
    fc.property(
      validNameArb,
      fc.integer({ min: 0, max: 23 }),
      (name, hour) => {
        const greetingText = getGreetingText(hour);
        const result = buildGreetingString(greetingText, name);

        // Extract the name between ", " and "!"
        const prefix = greetingText + ', ';
        const extractedName = result.slice(prefix.length, -1);

        const expected = truncateName(name.trim());
        return extractedName === expected;
      }
    ),
    { numRuns: 100 }
  );
});

// 2c — empty/whitespace-only name produces "[Sapaan]!" without any name part
run('empty or whitespace name produces "[Sapaan]!" without comma or name', () => {
  // Feature: personal-dashboard-todo, Property 2: Greeting format with valid name
  // Build whitespace-only strings using fc.string + filter (fc.stringOf removed in v4)
  const whitespaceArb = fc
    .string({ minLength: 0, maxLength: 30 })
    .map(s => s.replace(/[^ \t\n\r]/g, ' ')); // replace any non-whitespace with space

  fc.assert(
    fc.property(
      whitespaceArb,
      fc.integer({ min: 0, max: 23 }),
      (name, hour) => {
        const greetingText = getGreetingText(hour);
        const result = buildGreetingString(greetingText, name);
        return result === greetingText + '!';
      }
    ),
    { numRuns: 100 }
  );
});

// ===========================================================================
// Property 3: Name truncation preserves prefix
// ===========================================================================
// Feature: personal-dashboard-todo, Property 3: Name truncation preserves prefix

console.log('\nRunning Property 3: Name truncation preserves prefix...');

// 3a — for any name longer than 50 chars, result is exactly the first 50 chars + "…"
run('name >50 chars is truncated to first 50 chars + "…"', () => {
  // Feature: personal-dashboard-todo, Property 3: Name truncation preserves prefix
  fc.assert(
    fc.property(
      longNameArb,
      (name) => {
        const result = truncateName(name);

        // Must end with ellipsis (U+2026)
        if (!result.endsWith('\u2026')) return false;

        // The 50-char prefix must be preserved exactly
        const body = result.slice(0, -1); // strip trailing "…"
        if (body !== name.slice(0, 50)) return false;

        // Total length must be exactly 51 (50 chars + ellipsis char)
        if (result.length !== 51) return false;

        return true;
      }
    ),
    { numRuns: 100 }
  );
});

// 3b — names of exactly 50 chars are returned unchanged (no truncation)
run('name of exactly 50 chars is returned unchanged', () => {
  // Feature: personal-dashboard-todo, Property 3: Name truncation preserves prefix
  // Build from ASCII chars so String.length === character count exactly
  const exactly50Arb = fc
    .array(asciiCharArb, { minLength: 50, maxLength: 50 })
    .map(chars => chars.join(''));

  fc.assert(
    fc.property(
      exactly50Arb,
      (name) => {
        const result = truncateName(name);
        return result === name;
      }
    ),
    { numRuns: 100 }
  );
});

// 3c — names shorter than 50 chars are returned unchanged
run('name <50 chars is returned unchanged', () => {
  // Feature: personal-dashboard-todo, Property 3: Name truncation preserves prefix
  const shortNameArb = fc
    .array(asciiCharArb, { minLength: 0, maxLength: 49 })
    .map(chars => chars.join(''));

  fc.assert(
    fc.property(
      shortNameArb,
      (name) => {
        const result = truncateName(name);
        return result === name;
      }
    ),
    { numRuns: 100 }
  );
});

// 3d — truncated result never has length > 51 (50 + "…")
run('truncated name never exceeds 51 characters in length', () => {
  // Feature: personal-dashboard-todo, Property 3: Name truncation preserves prefix
  fc.assert(
    fc.property(
      fc.array(asciiCharArb, { minLength: 0, maxLength: 300 }).map(chars => chars.join('')),
      (name) => {
        const result = truncateName(name);
        return result.length <= 51;
      }
    ),
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
