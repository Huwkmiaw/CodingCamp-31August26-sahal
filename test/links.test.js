/**
 * Property-Based Tests: LinkManager Module
 * Feature: personal-dashboard-todo
 *
 * Property 14: URL normalization adds https:// prefix when missing
 * Property 15: Link collection rejects addition when full
 * Property 16: Link validation rejects empty or whitespace-only fields
 *
 * Validates: Requirements 6.3, 6.4, 6.5
 */

'use strict';

const fc = require('fast-check');

// ---------------------------------------------------------------------------
// Pure functions inlined from js/app.js (LinkManager module)
// These are exact copies of the real implementations — no stubs.
// ---------------------------------------------------------------------------

const MAX_LINKS = 20;

/**
 * generateId: timestamp-based unique ID (mirrors app.js helper)
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/**
 * normalizeUrl: mirrors LinkManager.normalizeUrl
 * @param {string} url
 * @returns {string}
 */
function normalizeUrl(url) {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return 'https://' + url;
}

/**
 * validateLink: mirrors LinkManager.validateLink
 * @param {string} label
 * @param {string} url
 * @returns {{ valid: boolean, errors?: { label?: string, url?: string } }}
 */
function validateLink(label, url) {
  const errors = {};
  const trimmedLabel = label ? label.trim() : '';
  const trimmedUrl   = url   ? url.trim()   : '';

  if (!trimmedLabel) errors.label = 'Label tidak boleh kosong';
  if (!trimmedUrl)   errors.url   = 'URL tidak boleh kosong';

  if (Object.keys(errors).length > 0) return { valid: false, errors };
  return { valid: true };
}

// ---------------------------------------------------------------------------
// In-memory LinkManager simulation (no DOM, no Storage)
// ---------------------------------------------------------------------------

function createLinkState(initialLinks) {
  let links = initialLinks ? initialLinks.map(l => ({ ...l })) : [];

  function addLink(label, url) {
    if (links.length >= MAX_LINKS) {
      return { success: false, error: `Jumlah tautan maksimal ${MAX_LINKS} entri` };
    }
    const result = validateLink(label, url);
    if (!result.valid) {
      const msg = result.errors.label || result.errors.url || 'Input tidak valid';
      return { success: false, error: msg };
    }
    links.push({
      id:    generateId(),
      label: label.trim(),
      url:   normalizeUrl(url.trim()),
    });
    return { success: true };
  }

  function getLinks() { return links; }

  return { addLink, getLinks };
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

// Non-empty, non-whitespace-only strings
const validLabelArb = fc
  .string({ minLength: 1, maxLength: 50 })
  .filter(s => s.trim().length > 0);

const validUrlBodyArb = fc
  .string({ minLength: 1, maxLength: 100 })
  .filter(s => s.trim().length > 0 && !s.startsWith('http://') && !s.startsWith('https://'));

// Empty / whitespace-only (fc.stringOf tidak tersedia di fast-check v4)
const emptyOrWhitespaceArb = fc
  .array(fc.constantFrom(' ', '\t', '\n'), { minLength: 0, maxLength: 10 })
  .map(chars => chars.join(''));


// URLs already starting with http:// or https://
const httpUrlArb = fc
  .string({ minLength: 1, maxLength: 80 })
  .filter(s => s.trim().length > 0)
  .map(s => 'http://' + s.trim());

const httpsUrlArb = fc
  .string({ minLength: 1, maxLength: 80 })
  .filter(s => s.trim().length > 0)
  .map(s => 'https://' + s.trim());

// Exactly 20 links (full capacity)
const fullLinksArb = fc.constant(
  Array.from({ length: MAX_LINKS }, (_, i) => ({
    id:    `link-${i}`,
    label: `Link ${i}`,
    url:   `https://example-${i}.com`,
  }))
);

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
// Property 14: URL normalization adds https:// prefix when missing
// Validates: Requirements 6.4
// ---------------------------------------------------------------------------
console.log('\nProperty 14: URL normalization adds https:// prefix when missing');

run('URL without http/https → result starts with "https://"', () => {
  fc.assert(
    fc.property(validUrlBodyArb, (url) => {
      const result = normalizeUrl(url);
      return result.startsWith('https://');
    }),
    { numRuns: 100 }
  );
});

run('URL without http/https → result equals "https://" + original', () => {
  fc.assert(
    fc.property(validUrlBodyArb, (url) => {
      const result = normalizeUrl(url);
      return result === 'https://' + url;
    }),
    { numRuns: 100 }
  );
});

run('URL already starting with "https://" → returned unchanged', () => {
  fc.assert(
    fc.property(httpsUrlArb, (url) => {
      return normalizeUrl(url) === url;
    }),
    { numRuns: 100 }
  );
});

run('URL already starting with "http://" → returned unchanged', () => {
  fc.assert(
    fc.property(httpUrlArb, (url) => {
      return normalizeUrl(url) === url;
    }),
    { numRuns: 100 }
  );
});

run('normalizeUrl is idempotent: normalizeUrl(normalizeUrl(url)) === normalizeUrl(url)', () => {
  fc.assert(
    fc.property(validUrlBodyArb, (url) => {
      const once = normalizeUrl(url);
      const twice = normalizeUrl(once);
      return once === twice;
    }),
    { numRuns: 100 }
  );
});

// ---------------------------------------------------------------------------
// Property 15: Link collection rejects addition when full (≥ 20 entries)
// Validates: Requirements 6.5
// ---------------------------------------------------------------------------
console.log('\nProperty 15: Link collection rejects addition when full');

run('addLink when links.length === 20 → returns error', () => {
  fc.assert(
    fc.property(fullLinksArb, validLabelArb, validUrlBodyArb, (initial, label, url) => {
      const state = createLinkState(initial);
      const result = state.addLink(label, url);
      return result.success === false;
    }),
    { numRuns: 100 }
  );
});

run('addLink when links.length === 20 → links.length remains 20', () => {
  fc.assert(
    fc.property(fullLinksArb, validLabelArb, validUrlBodyArb, (initial, label, url) => {
      const state = createLinkState(initial);
      state.addLink(label, url);
      return state.getLinks().length === MAX_LINKS;
    }),
    { numRuns: 100 }
  );
});

run('addLink when links.length < 20 with valid input → links.length grows by 1', () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 0, max: MAX_LINKS - 1 }),
      validLabelArb,
      validUrlBodyArb,
      (initialCount, label, url) => {
        const initialLinks = Array.from({ length: initialCount }, (_, i) => ({
          id:    `link-${i}`,
          label: `Link ${i}`,
          url:   `https://example-${i}.com`,
        }));
        const state = createLinkState(initialLinks);
        const before = state.getLinks().length;
        const result = state.addLink(label, url);
        return result.success === true && state.getLinks().length === before + 1;
      }
    ),
    { numRuns: 100 }
  );
});

// ---------------------------------------------------------------------------
// Property 16: Link validation rejects empty or whitespace-only fields
// Validates: Requirements 6.3
// ---------------------------------------------------------------------------
console.log('\nProperty 16: Link validation rejects empty or whitespace-only fields');

run('empty/whitespace label → validateLink returns { valid: false }', () => {
  fc.assert(
    fc.property(emptyOrWhitespaceArb, validUrlBodyArb, (label, url) => {
      const result = validateLink(label, url);
      return result.valid === false;
    }),
    { numRuns: 100 }
  );
});

run('empty/whitespace url → validateLink returns { valid: false }', () => {
  fc.assert(
    fc.property(validLabelArb, emptyOrWhitespaceArb, (label, url) => {
      const result = validateLink(label, url);
      return result.valid === false;
    }),
    { numRuns: 100 }
  );
});

run('both empty/whitespace → validateLink returns { valid: false }', () => {
  fc.assert(
    fc.property(emptyOrWhitespaceArb, emptyOrWhitespaceArb, (label, url) => {
      const result = validateLink(label, url);
      return result.valid === false;
    }),
    { numRuns: 100 }
  );
});

run('valid label AND valid url → validateLink returns { valid: true }', () => {
  fc.assert(
    fc.property(validLabelArb, validUrlBodyArb, (label, url) => {
      const result = validateLink(label, url);
      return result.valid === true;
    }),
    { numRuns: 100 }
  );
});

run('empty label → errors object has label field', () => {
  fc.assert(
    fc.property(emptyOrWhitespaceArb, validUrlBodyArb, (label, url) => {
      const result = validateLink(label, url);
      return result.valid === false && result.errors && typeof result.errors.label === 'string';
    }),
    { numRuns: 100 }
  );
});

run('empty url → errors object has url field', () => {
  fc.assert(
    fc.property(validLabelArb, emptyOrWhitespaceArb, (label, url) => {
      const result = validateLink(label, url);
      return result.valid === false && result.errors && typeof result.errors.url === 'string';
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
