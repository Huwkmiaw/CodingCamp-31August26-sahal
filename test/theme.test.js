/**
 * Property-Based Tests: ThemeController Module
 * Feature: personal-dashboard-todo
 * Property 17: Theme toggle is a round-trip
 * Validates: Requirements 7.3, 7.4
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
// ThemeController interacts with:
//   - document.documentElement.getAttribute('data-theme')
//   - document.documentElement.setAttribute('data-theme', value)
//   - document.getElementById(TOGGLE_BTN_ID)  → may return null safely
// ---------------------------------------------------------------------------
let _dataTheme = 'light';

global.document = {
  documentElement: {
    getAttribute(attr) {
      if (attr === 'data-theme') return _dataTheme;
      return null;
    },
    setAttribute(attr, value) {
      if (attr === 'data-theme') _dataTheme = value;
    },
  },
  // Return null so ThemeController skips button DOM updates — that's fine for
  // the toggle/storage round-trip we are testing.
  getElementById() {
    return null;
  },
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
// Inline ThemeController module (mirrors js/app.js exactly)
// ---------------------------------------------------------------------------
const ThemeController = (() => {
  const STORAGE_KEY = 'theme';
  const TOGGLE_BTN_ID = 'theme-toggle';
  const ICONS = { light: '🌙', dark: '☀️' };

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);

    const btn = document.getElementById(TOGGLE_BTN_ID);
    if (btn) {
      btn.textContent = ICONS[theme] || ICONS.light;
      btn.setAttribute(
        'aria-label',
        theme === 'dark' ? 'Ganti ke tema terang' : 'Ganti ke tema gelap'
      );
    }
  }

  function toggle() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    Storage.set(STORAGE_KEY, next);
  }

  function init() {
    const currentTheme =
      document.documentElement.getAttribute('data-theme') ||
      Storage.get(STORAGE_KEY, 'light');

    applyTheme(currentTheme);

    const btn = document.getElementById(TOGGLE_BTN_ID);
    if (btn) {
      btn.addEventListener('click', toggle);
    }
  }

  return { init, toggle, applyTheme };
})();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Set up the DOM and Storage state to a given initial theme.
 * @param {'light'|'dark'} theme
 */
function setInitialTheme(theme) {
  localStorage.clear();
  Storage.set('theme', theme);
  document.documentElement.setAttribute('data-theme', theme);
}

// ---------------------------------------------------------------------------
// Property 17 — Theme toggle is a round-trip
// Feature: personal-dashboard-todo, Property 17: Theme toggle is a round-trip
// ---------------------------------------------------------------------------

console.log('Running Property 17: Theme toggle is a round-trip...\n');

const VALID_THEMES = ['light', 'dark'];

let passed = 0;
let failed = 0;

// ---------------------------------------------------------------------------
// Property 17a: toggle() twice returns DOM to initial theme
//
// For any initial theme in ["light", "dark"], calling toggle() twice SHALL
// result in the same data-theme attribute as the initial state.
// ---------------------------------------------------------------------------
console.log('Property 17a: double-toggle restores original DOM theme...');
try {
  fc.assert(
    // Feature: personal-dashboard-todo, Property 17: Theme toggle is a round-trip
    fc.property(
      fc.constantFrom(...VALID_THEMES),
      (initialTheme) => {
        // Arrange
        setInitialTheme(initialTheme);

        // Act
        ThemeController.toggle(); // first toggle
        ThemeController.toggle(); // second toggle

        // Assert: DOM attribute is back to initial
        const finalTheme = document.documentElement.getAttribute('data-theme');
        return finalTheme === initialTheme;
      }
    ),
    { numRuns: 100 }
  );
  console.log('  ✓ double-toggle restores original data-theme on <html>');
  passed++;
} catch (e) {
  console.error('  ✗ FAILED:', e.message);
  failed++;
}

// ---------------------------------------------------------------------------
// Property 17b: toggle() twice returns Storage to initial theme
//
// After two toggles, Storage.get('theme') SHALL equal the original theme.
// ---------------------------------------------------------------------------
console.log('Property 17b: double-toggle restores original Storage value...');
try {
  fc.assert(
    // Feature: personal-dashboard-todo, Property 17: Theme toggle is a round-trip
    fc.property(
      fc.constantFrom(...VALID_THEMES),
      (initialTheme) => {
        // Arrange
        setInitialTheme(initialTheme);

        // Act
        ThemeController.toggle(); // first toggle
        ThemeController.toggle(); // second toggle

        // Assert: Storage reflects the original theme
        const storedTheme = Storage.get('theme', 'light');
        return storedTheme === initialTheme;
      }
    ),
    { numRuns: 100 }
  );
  console.log('  ✓ double-toggle restores original value in Storage');
  passed++;
} catch (e) {
  console.error('  ✗ FAILED:', e.message);
  failed++;
}

// ---------------------------------------------------------------------------
// Property 17c: intermediate Storage state is the opposite theme
//
// After the FIRST toggle, Storage SHALL reflect the intermediate (flipped)
// theme — not yet the original.
// ---------------------------------------------------------------------------
console.log('Property 17c: Storage reflects intermediate theme after first toggle...');
try {
  fc.assert(
    // Feature: personal-dashboard-todo, Property 17: Theme toggle is a round-trip
    fc.property(
      fc.constantFrom(...VALID_THEMES),
      (initialTheme) => {
        // Arrange
        setInitialTheme(initialTheme);
        const expectedIntermediate = initialTheme === 'dark' ? 'light' : 'dark';

        // Act: only ONE toggle
        ThemeController.toggle();

        // Assert: Storage holds the intermediate value
        const storedAfterFirst = Storage.get('theme', 'light');
        return storedAfterFirst === expectedIntermediate;
      }
    ),
    { numRuns: 100 }
  );
  console.log('  ✓ first toggle stores intermediate (flipped) theme in Storage');
  passed++;
} catch (e) {
  console.error('  ✗ FAILED:', e.message);
  failed++;
}

// ---------------------------------------------------------------------------
// Property 17d: toggle always produces a value within the valid theme set
//
// No matter how many toggles are applied, the resulting DOM theme is always
// one of ["light", "dark"].
// ---------------------------------------------------------------------------
console.log('Property 17d: any number of toggles stays within valid theme set...');
try {
  fc.assert(
    // Feature: personal-dashboard-todo, Property 17: Theme toggle is a round-trip
    fc.property(
      fc.constantFrom(...VALID_THEMES),
      fc.integer({ min: 1, max: 20 }),
      (initialTheme, toggleCount) => {
        // Arrange
        setInitialTheme(initialTheme);

        // Act: apply N toggles
        for (let i = 0; i < toggleCount; i++) {
          ThemeController.toggle();
        }

        // Assert: DOM theme is still one of the two valid values
        const finalTheme = document.documentElement.getAttribute('data-theme');
        return VALID_THEMES.includes(finalTheme);
      }
    ),
    { numRuns: 100 }
  );
  console.log('  ✓ N toggles always yield a valid theme value');
  passed++;
} catch (e) {
  console.error('  ✗ FAILED:', e.message);
  failed++;
}

// ---------------------------------------------------------------------------
// Property 17e: odd number of toggles produces the opposite theme
//
// For any odd N, N toggles from an initial theme must yield the opposite theme.
// ---------------------------------------------------------------------------
console.log('Property 17e: odd number of toggles yields the opposite theme...');
try {
  fc.assert(
    // Feature: personal-dashboard-todo, Property 17: Theme toggle is a round-trip
    fc.property(
      fc.constantFrom(...VALID_THEMES),
      fc.integer({ min: 0, max: 9 }).map(n => 2 * n + 1), // odd numbers 1,3,5…19
      (initialTheme, oddCount) => {
        // Arrange
        setInitialTheme(initialTheme);
        const expectedFinal = initialTheme === 'dark' ? 'light' : 'dark';

        // Act
        for (let i = 0; i < oddCount; i++) {
          ThemeController.toggle();
        }

        // Assert
        const finalTheme = document.documentElement.getAttribute('data-theme');
        return finalTheme === expectedFinal;
      }
    ),
    { numRuns: 100 }
  );
  console.log('  ✓ odd N toggles produces the opposite theme');
  passed++;
} catch (e) {
  console.error('  ✗ FAILED:', e.message);
  failed++;
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
