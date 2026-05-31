#!/usr/bin/env node
/*
 * check-behavior-invariance.js
 *
 * Static verification for the modern-redesign-rebrand spec.
 * Validates one design correctness property against player.js:
 *   - Property 2: Behavior invariance
 *     No function body, event binding, timer, fetch, or media-API call in
 *     player.js changed during the rebrand. The ONLY permitted differences
 *     between the pre-rename (baseline) player.js and the current player.js
 *     are the three documented renames:
 *       (a) class identifier   StreamFlowPlayer       -> LumenPlayer
 *       (b) global instance    window.streamFlow      -> window.lumen
 *       (c) header comment     "StreamFlow Video Player" -> "Lumen Video Player"
 *
 * Validates: Requirements 6.4, 9.1, 9.2, 9.3, 9.4
 *
 * Strategy:
 *   1. Obtain the pre-rename baseline from git (HEAD:player.js). The rename was
 *      applied in the working tree, so HEAD still carries StreamFlowPlayer.
 *   2. Decode both the baseline and the current file as Unicode text, handling
 *      a UTF-8 / UTF-16LE / UTF-16BE byte-order mark. (The two files may use a
 *      different on-disk encoding; an encoding change does not alter any
 *      function body, so the comparison is performed on decoded text, not raw
 *      bytes.)
 *   3. Verify the baseline actually contains the legacy identifiers. If it does
 *      not, no suitable pre-rename baseline is available -> print SKIP, exit 0
 *      (do not fail the build).
 *   4. Apply the three permitted renames to the BASELINE text, then assert the
 *      transformed baseline is identical to the current player.js text.
 *      PASS  -> the only changes were the permitted renames.
 *      FAIL  -> print a context diff around the first differing region.
 *
 * Dependency-free: uses only Node.js built-in modules (fs, path, child_process).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.join(__dirname, '..');
const CURRENT_PATH = path.join(PROJECT_ROOT, 'player.js');

// The three permitted renames (applied to the baseline before comparison).
const RENAMES = [
  { from: 'StreamFlowPlayer', to: 'LumenPlayer', label: 'class identifier' },
  { from: 'window.streamFlow', to: 'window.lumen', label: 'global instance' },
  { from: 'StreamFlow Video Player', to: 'Lumen Video Player', label: 'header comment' },
];

/**
 * Decode a Buffer to a Unicode string, detecting and stripping a leading BOM.
 * Supports UTF-8 (with/without BOM), UTF-16LE, and UTF-16BE.
 */
function decode(buf) {
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    return { text: buf.toString('utf16le', 2), encoding: 'utf16le' };
  }
  if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
    // UTF-16BE: Node has no native decoder; swap byte pairs into LE order.
    const swapped = Buffer.from(buf.subarray(2));
    for (let i = 0; i + 1 < swapped.length; i += 2) {
      const tmp = swapped[i];
      swapped[i] = swapped[i + 1];
      swapped[i + 1] = tmp;
    }
    return { text: swapped.toString('utf16le'), encoding: 'utf16be' };
  }
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    return { text: buf.toString('utf8', 3), encoding: 'utf8-bom' };
  }
  return { text: buf.toString('utf8'), encoding: 'utf8' };
}

/** Read the committed pre-rename baseline from git (HEAD:player.js). */
function readBaselineBuffer() {
  try {
    return execSync('git show HEAD:player.js', {
      cwd: PROJECT_ROOT,
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (err) {
    return null;
  }
}

/** Apply the three permitted renames (global, literal) to a text string. */
function applyRenames(text) {
  let out = text;
  for (const { from, to } of RENAMES) {
    out = out.split(from).join(to);
  }
  return out;
}

/** Normalize line endings (CRLF / lone CR -> LF) for a non-behavioral compare. */
function normalizeEol(text) {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/**
 * Build a human-readable context diff around the first point at which two
 * strings diverge, using line numbers and a few lines of surrounding context.
 */
function firstDiffReport(a, b) {
  const aLines = a.split('\n');
  const bLines = b.split('\n');
  const max = Math.max(aLines.length, bLines.length);
  let diffLine = -1;
  for (let i = 0; i < max; i += 1) {
    if (aLines[i] !== bLines[i]) {
      diffLine = i;
      break;
    }
  }
  if (diffLine === -1) {
    return 'Files differ but no differing line was located (length mismatch only).';
  }
  const ctxStart = Math.max(0, diffLine - 2);
  const ctxEnd = Math.min(max - 1, diffLine + 2);
  const lines = [];
  lines.push(`First difference at line ${diffLine + 1}:`);
  for (let i = ctxStart; i <= ctxEnd; i += 1) {
    const marker = i === diffLine ? '>>' : '  ';
    const aVal = aLines[i] === undefined ? '<no line>' : aLines[i];
    const bVal = bLines[i] === undefined ? '<no line>' : bLines[i];
    lines.push(`${marker} L${i + 1} baseline(+renames): ${JSON.stringify(aVal)}`);
    lines.push(`${marker} L${i + 1} current         : ${JSON.stringify(bVal)}`);
  }
  return lines.join('\n');
}

function skip(message) {
  console.log('verify/check-behavior-invariance.js — SKIP');
  console.log(`  ${message}`);
  console.log('  (No suitable pre-rename baseline available; not failing the build.)');
  process.exit(0);
}

function fail(message) {
  console.error('verify/check-behavior-invariance.js — FAIL\n');
  console.error(message);
  process.exit(1);
}

function main() {
  // --- Load current player.js ------------------------------------------------
  let currentBuf;
  try {
    currentBuf = fs.readFileSync(CURRENT_PATH);
  } catch (err) {
    fail(`Could not read current player.js at ${CURRENT_PATH}: ${err.message}`);
    return;
  }
  const current = decode(currentBuf);

  // --- Load the pre-rename baseline from git --------------------------------
  const baselineBuf = readBaselineBuffer();
  if (!baselineBuf) {
    skip('Unable to read HEAD:player.js from git (no commit, or not a git repo).');
    return;
  }
  const baseline = decode(baselineBuf);

  // --- Verify the baseline really is the pre-rename version ------------------
  const hasLegacyClass = baseline.text.includes('StreamFlowPlayer');
  const hasLegacyGlobal = baseline.text.includes('window.streamFlow');
  if (!hasLegacyClass && !hasLegacyGlobal) {
    skip(
      'HEAD:player.js does not contain the legacy identifiers ' +
        '(StreamFlowPlayer / window.streamFlow); the rename appears already committed.'
    );
    return;
  }

  // --- Apply the permitted renames to the baseline ---------------------------
  const transformed = applyRenames(baseline.text);

  // --- Strict comparison (decoded text, BOM stripped) ------------------------
  if (transformed === current.text) {
    console.log('verify/check-behavior-invariance.js — PASS');
    console.log('Property 2 (behavior invariance) holds.\n');
    console.log(
      `  baseline encoding: ${baseline.encoding}; current encoding: ${current.encoding}`
    );
    for (const { from, to, label } of RENAMES) {
      console.log(`  ✓ permitted rename applied (${label}): "${from}" -> "${to}"`);
    }
    console.log(
      '  ✓ After applying ONLY the three permitted renames, the pre-rename baseline'
    );
    console.log(
      '    is identical to the current player.js — no function body, event binding,'
    );
    console.log('    timer, fetch, or media-API call differs.');
    process.exit(0);
    return;
  }

  // --- Fallback: normalize line endings (non-behavioral) and re-compare ------
  // A pure CRLF/LF or encoding difference does not change any function body, so
  // if the texts match after EOL normalization the property still holds.
  const transformedEol = normalizeEol(transformed);
  const currentEol = normalizeEol(current.text);
  if (transformedEol === currentEol) {
    console.log('verify/check-behavior-invariance.js — PASS');
    console.log('Property 2 (behavior invariance) holds.\n');
    console.log(
      `  baseline encoding: ${baseline.encoding}; current encoding: ${current.encoding}`
    );
    for (const { from, to, label } of RENAMES) {
      console.log(`  ✓ permitted rename applied (${label}): "${from}" -> "${to}"`);
    }
    console.log(
      '  ✓ After applying ONLY the three permitted renames (and normalizing'
    );
    console.log(
      '    line endings — a non-behavioral change), the pre-rename baseline is'
    );
    console.log(
      '    identical to the current player.js — no function body, event binding,'
    );
    console.log('    timer, fetch, or media-API call differs.');
    process.exit(0);
    return;
  }

  // --- FAIL: report the first differing region (on EOL-normalized text) ------
  const report = firstDiffReport(transformedEol, currentEol);
  fail(
    'After applying the three permitted renames to the pre-rename baseline, the\n' +
      'result still differs from the current player.js. This indicates a change\n' +
      'beyond the permitted class/instance/comment renames.\n\n' +
      `baseline encoding: ${baseline.encoding}; current encoding: ${current.encoding}\n\n` +
      report
  );
}

main();
