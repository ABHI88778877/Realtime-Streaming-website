#!/usr/bin/env node
/*
 * verify/check-complete-rename.js
 * ------------------------------------------------------------------
 * Property 3: Complete rename
 * Validates: Requirements 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 6.1, 6.2, 6.3, 7.1, 7.2
 *
 * Dependency-free static verification (Node built-in modules only: fs, path).
 *
 * Goal
 * ----
 * The modern-redesign-rebrand change renames the product from "StreamFlow" to
 * "Lumen" across every artifact. This script proves the rename is complete and
 * the new brand is present on the four user-facing surfaces:
 *
 *   1. Read index.html, styles.css, player.js, server.js, README.md.
 *   2. Run a case-insensitive search for "streamflow" allowing a single
 *      optional space (regex /stream\s?flow/i, so both "streamflow" and
 *      "stream flow" match) against each file's contents.
 *   3. Assert the TOTAL match count across all five files is exactly ZERO.
 *      Any match is reported with file name, line number, and matching line.
 *   4. Assert positive brand presence — "Lumen" appears in:
 *        - the index.html <title>
 *        - the index.html logo wordmark (class="logo-text")
 *        - the server.js startup banner
 *        - the README.md top-level H1 (# ...)
 *      Each is reported as found / not-found.
 *
 * Exit code 0 with a PASS summary when there are zero legacy matches and all
 * four brand-presence checks pass; non-zero otherwise. The script NEVER edits
 * the source to force a pass.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const FILES = [
  { name: 'index.html', path: path.join(ROOT, 'index.html') },
  { name: 'styles.css', path: path.join(ROOT, 'styles.css') },
  { name: 'player.js', path: path.join(ROOT, 'player.js') },
  { name: 'server.js', path: path.join(ROOT, 'server.js') },
  { name: 'README.md', path: path.join(ROOT, 'README.md') },
];

// Case-insensitive "streamflow" with a single optional space ("stream flow").
const LEGACY_RE = /stream\s?flow/i;
const LEGACY_RE_GLOBAL = /stream\s?flow/gi;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function read(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch (err) {
    console.error(`ERROR: could not read ${file}: ${err.message}`);
    process.exit(2);
  }
  return '';
}

/** Return every legacy match in `text` as { line, col, text } records. */
function findLegacyMatches(text) {
  const matches = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    let m;
    const re = new RegExp(LEGACY_RE_GLOBAL.source, 'gi');
    while ((m = re.exec(line)) !== null) {
      matches.push({ line: i + 1, col: m.index + 1, match: m[0], text: line.trim() });
      if (m.index === re.lastIndex) re.lastIndex += 1; // avoid zero-width loop
    }
  }
  return matches;
}

/** Find the first line (1-based) matching `re`, or null. */
function firstLineMatching(text, re) {
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    if (re.test(lines[i])) return { line: i + 1, text: lines[i].trim() };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const contents = {};
  for (const f of FILES) contents[f.name] = read(f.path);

  // --- 1. Legacy "streamflow" scan -----------------------------------------
  const legacyByFile = [];
  let totalLegacy = 0;
  for (const f of FILES) {
    const matches = findLegacyMatches(contents[f.name]);
    totalLegacy += matches.length;
    legacyByFile.push({ name: f.name, matches });
  }

  // --- 2. Positive brand-presence checks -----------------------------------
  const html = contents['index.html'];
  const server = contents['server.js'];
  const readme = contents['README.md'];

  const brandChecks = [];

  // a) <title> contains "Lumen"
  const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
  const titleText = titleMatch ? titleMatch[1] : null;
  brandChecks.push({
    surface: 'index.html <title>',
    found: titleText !== null && titleText.includes('Lumen'),
    detail: titleText !== null ? `<title>${titleText.trim()}</title>` : 'no <title> element found',
  });

  // b) logo wordmark: element with class="logo-text" contains "Lumen"
  const logoRe = /<([a-zA-Z0-9]+)[^>]*\bclass\s*=\s*["'][^"']*\blogo-text\b[^"']*["'][^>]*>([\s\S]*?)<\/\1>/i;
  const logoMatch = html.match(logoRe);
  const logoText = logoMatch ? logoMatch[2].replace(/<[^>]*>/g, '').trim() : null;
  brandChecks.push({
    surface: 'index.html logo wordmark (.logo-text)',
    found: logoText !== null && logoText.includes('Lumen'),
    detail: logoText !== null ? `.logo-text = "${logoText}"` : 'no element with class="logo-text" found',
  });

  // c) server.js startup banner contains "Lumen"
  //    The banner is printed via console.log; require "Lumen" to appear in a
  //    console.log/console.info call.
  const bannerHasLumen = /console\.(?:log|info)\s*\([\s\S]*?Lumen[\s\S]*?\)/.test(server);
  const bannerLine = firstLineMatching(server, /Lumen/);
  brandChecks.push({
    surface: 'server.js startup banner',
    found: bannerHasLumen,
    detail: bannerLine ? `line ${bannerLine.line}: ${bannerLine.text}` : 'no "Lumen" string found in server.js',
  });

  // d) README.md top-level H1 (# ...) contains "Lumen"
  const h1 = firstLineMatching(readme, /^\s*#\s+.*\bLumen\b/);
  const anyH1 = firstLineMatching(readme, /^\s*#\s+/);
  brandChecks.push({
    surface: 'README.md top-level H1',
    found: h1 !== null,
    detail: h1
      ? `line ${h1.line}: ${h1.text}`
      : anyH1
        ? `H1 found but lacks "Lumen" -> line ${anyH1.line}: ${anyH1.text}`
        : 'no top-level H1 (# ...) found',
  });

  report({ legacyByFile, totalLegacy, brandChecks });
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

function report(ctx) {
  const { legacyByFile, totalLegacy, brandChecks } = ctx;

  console.log('Lumen complete-rename check (Property 3)');
  console.log('========================================');
  for (const f of FILES) console.log(`  ${f.name.padEnd(12)} : ${f.path}`);
  console.log('');

  // Legacy scan report
  console.log('Legacy "streamflow" scan (case-insensitive, /stream\\s?flow/i):');
  for (const f of legacyByFile) {
    if (f.matches.length === 0) {
      console.log(`  [OK]   ${f.name.padEnd(12)} -> 0 match(es)`);
    } else {
      console.log(`  [FAIL] ${f.name.padEnd(12)} -> ${f.matches.length} match(es)`);
      for (const m of f.matches) {
        console.log(`           ${f.name}:${m.line}:${m.col}  "${m.match}"  | ${m.text}`);
      }
    }
  }
  console.log(`  TOTAL legacy matches across all 5 files: ${totalLegacy} (expected 0)`);
  console.log('');

  // Brand-presence report
  console.log('Positive brand presence ("Lumen") on user-facing surfaces:');
  let brandFailures = 0;
  for (const c of brandChecks) {
    if (c.found) {
      console.log(`  [FOUND]     ${c.surface} -> ${c.detail}`);
    } else {
      brandFailures += 1;
      console.log(`  [NOT FOUND] ${c.surface} -> ${c.detail}`);
    }
  }
  console.log('');

  const ok = totalLegacy === 0 && brandFailures === 0;
  if (ok) {
    console.log('SUMMARY: PASS — zero legacy "streamflow" occurrences and "Lumen" present on all 4 user-facing surfaces.');
    console.log('Property 3 (Complete rename) holds.');
    process.exit(0);
  } else {
    const reasons = [];
    if (totalLegacy > 0) reasons.push(`${totalLegacy} legacy "streamflow" occurrence(s)`);
    if (brandFailures > 0) reasons.push(`${brandFailures} missing brand surface(s)`);
    console.error(`SUMMARY: FAIL — ${reasons.join(' and ')}.`);
    process.exit(1);
  }
}

main();
