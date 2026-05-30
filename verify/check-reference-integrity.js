#!/usr/bin/env node
/*
 * check-reference-integrity.js
 *
 * Source-level reference-integrity verification for the
 * modern-redesign-rebrand spec. Validates one design correctness property
 * against player.js:
 *   - Property 6: No broken references
 *     After the StreamFlow -> Lumen rename, no legacy identifier remains in
 *     player.js, so no legacy ReferenceError can occur at runtime and the
 *     legacy global window.streamFlow stays undefined. The new class and
 *     global-instance assignment each appear exactly once.
 *
 * Validates: Requirements 5.3, 10.1, 10.2, 10.3, 10.4, 10.5
 *
 * Four assertions over the text of player.js:
 *   1. ZERO occurrences of the legacy class identifier `StreamFlowPlayer`.
 *   2. ZERO occurrences of the legacy global identifier `streamFlow`
 *      (case-sensitive; this also covers `window.streamFlow`).
 *   3. Exactly ONE occurrence of the class declaration `class LumenPlayer`.
 *   4. Exactly ONE occurrence of the global-instance assignment
 *      `window.lumen = new LumenPlayer(` (flexible whitespace).
 *
 * This script DOES NOT modify player.js; it only reads it.
 *
 * Exit code 0 with a PASS summary when all four assertions hold; non-zero
 * listing the failing assertion(s) otherwise.
 *
 * Dependency-free: uses only Node.js built-in modules (fs, path).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const PLAYER_PATH = path.join(PROJECT_ROOT, 'player.js');

/**
 * Decode a Buffer to a Unicode string, detecting and stripping a leading BOM.
 * Supports UTF-8 (with/without BOM), UTF-16LE, and UTF-16BE so the assertions
 * operate on decoded text regardless of the file's on-disk encoding.
 */
function decode(buf) {
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    return buf.toString('utf16le', 2);
  }
  if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
    const swapped = Buffer.from(buf.subarray(2));
    for (let i = 0; i + 1 < swapped.length; i += 2) {
      const tmp = swapped[i];
      swapped[i] = swapped[i + 1];
      swapped[i + 1] = tmp;
    }
    return swapped.toString('utf16le');
  }
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    return buf.toString('utf8', 3);
  }
  return buf.toString('utf8');
}

/** Count case-sensitive occurrences of a literal substring in `text`. */
function countSubstring(text, needle) {
  if (needle.length === 0) return 0;
  let count = 0;
  let idx = text.indexOf(needle);
  while (idx !== -1) {
    count += 1;
    idx = text.indexOf(needle, idx + needle.length);
  }
  return count;
}

/** Count non-overlapping matches of a global regex in `text`. */
function countRegex(text, regex) {
  const m = text.match(regex);
  return m ? m.length : 0;
}

function main() {
  let buf;
  try {
    buf = fs.readFileSync(PLAYER_PATH);
  } catch (err) {
    console.error('verify/check-reference-integrity.js — FAIL');
    console.error(`  Could not read player.js at ${PLAYER_PATH}: ${err.message}`);
    process.exit(1);
    return;
  }
  const text = decode(buf);

  // --- Compute the four metrics ---------------------------------------------
  const legacyClassCount = countSubstring(text, 'StreamFlowPlayer');
  const legacyGlobalCount = countSubstring(text, 'streamFlow'); // case-sensitive
  const classDeclCount = countRegex(text, /class\s+LumenPlayer\b/g);
  const globalAssignCount = countRegex(text, /window\.lumen\s*=\s*new\s+LumenPlayer\s*\(/g);

  // --- Evaluate the four assertions -----------------------------------------
  const assertions = [
    {
      label: 'No legacy class identifier `StreamFlowPlayer`',
      pass: legacyClassCount === 0,
      detail: `expected 0, found ${legacyClassCount}`,
    },
    {
      label: 'No legacy global identifier `streamFlow` (case-sensitive)',
      pass: legacyGlobalCount === 0,
      detail: `expected 0, found ${legacyGlobalCount}`,
    },
    {
      label: 'Exactly one `class LumenPlayer` declaration',
      pass: classDeclCount === 1,
      detail: `expected 1, found ${classDeclCount}`,
    },
    {
      label: 'Exactly one `window.lumen = new LumenPlayer()` assignment',
      pass: globalAssignCount === 1,
      detail: `expected 1, found ${globalAssignCount}`,
    },
  ];

  const failures = assertions.filter((a) => !a.pass);

  if (failures.length === 0) {
    console.log('verify/check-reference-integrity.js — PASS');
    console.log('Property 6 (no broken references) holds for player.js.\n');
    for (const a of assertions) {
      console.log(`  \u2713 ${a.label} (${a.detail})`);
    }
    console.log(
      '\n  \u2713 No legacy ReferenceError can occur; window.streamFlow stays undefined.'
    );
    process.exit(0);
    return;
  }

  console.error('verify/check-reference-integrity.js — FAIL\n');
  console.error(
    'Source-level reference integrity for player.js is broken. This likely means'
  );
  console.error('the StreamFlow -> Lumen rename (task 5.1) is incomplete.\n');
  for (const a of assertions) {
    const mark = a.pass ? '\u2713' : '\u2717';
    console.error(`  ${mark} ${a.label} (${a.detail})`);
  }
  console.error(`\n  ${failures.length} assertion(s) failed.`);
  process.exit(1);
}

main();
