#!/usr/bin/env node
/*
 * check-palette-motion.js
 *
 * Static verification for the modern-redesign-rebrand spec.
 * Validates two design correctness properties against styles.css:
 *   - Property 4: Single-accent palette  (no legacy multi-hue tokens/literals)
 *   - Property 5: Reduced motion/noise   (.bg-glow has no looping pulse; one visible .loader-ring)
 *
 * Validates: Requirements 1.2, 1.4, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5
 *
 * Dependency-free: uses only Node.js built-in modules (fs, path).
 * Exits 0 and prints a PASS summary when all assertions hold; exits non-zero
 * with a descriptive message identifying the failing assertion otherwise.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const STYLES_PATH = path.join(__dirname, '..', 'styles.css');

/** Collected failures; each is a human-readable description. */
const failures = [];
/** Collected passing assertion descriptions for the summary. */
const passes = [];

function fail(message) {
  failures.push(message);
}

function pass(message) {
  passes.push(message);
}

/**
 * Extract top-level-ish CSS rule blocks as { selector, body } pairs.
 * Uses a simple non-nested matcher which is sufficient for the flat rules
 * we target (.bg-glow, .loader-ring:nth-child(...)). Nested @media/@keyframes
 * inner rules are still surfaced as their own innermost blocks.
 */
function extractRules(css) {
  const rules = [];
  const ruleRe = /([^{}]+)\{([^{}]*)\}/g;
  let match;
  while ((match = ruleRe.exec(css)) !== null) {
    const selector = match[1].trim();
    const body = match[2].trim();
    if (selector.length > 0) {
      rules.push({ selector, body });
    }
  }
  return rules;
}

/** Normalize whitespace in a declaration body for robust substring checks. */
function normalize(text) {
  return text.replace(/\s+/g, ' ').trim().toLowerCase();
}

/**
 * Find a rule whose comma-separated selector list contains an entry that,
 * after normalizing whitespace, equals `selectorExact` (case-insensitive).
 */
function findRuleBySelector(rules, selectorExact) {
  const target = normalize(selectorExact);
  return rules.find((rule) =>
    rule.selector
      .split(',')
      .map((sel) => normalize(sel))
      .includes(target)
  );
}

function main() {
  // --- Load the stylesheet ---------------------------------------------------
  let css;
  try {
    css = fs.readFileSync(STYLES_PATH, 'utf8');
  } catch (err) {
    console.error(`FAIL: could not read styles.css at ${STYLES_PATH}: ${err.message}`);
    process.exit(1);
    return;
  }

  const rules = extractRules(css);

  // --- Assertion 1: no legacy palette tokens / removed surface tokens --------
  // Legacy multi-hue tokens and gradient tokens (Property 4 / Req 2.3).
  const legacyTokens = [
    '--accent-secondary',
    '--accent-tertiary',
    '--gradient-accent',
    '--gradient-glow',
  ];
  // Removed dark-theme surface/accent tokens (Req 1.3, 2.1).
  const removedSurfaceTokens = [
    '--accent-primary',
    '--bg-deep',
    '--bg-tertiary',
    '--bg-elevated',
    '--bg-secondary',
  ];
  // Legacy hex literals — matched case-insensitively (Property 4 / Req 2.3).
  const legacyHexLiterals = ['#00F5D4', '#7B2CBF', '#F72585'];

  const cssLower = css.toLowerCase();

  for (const token of [...legacyTokens, ...removedSurfaceTokens]) {
    // Token names are case-insensitive in practice; compare lowercased.
    const needle = token.toLowerCase();
    let count = 0;
    let idx = cssLower.indexOf(needle);
    while (idx !== -1) {
      count += 1;
      idx = cssLower.indexOf(needle, idx + needle.length);
    }
    if (count > 0) {
      fail(`Assertion 1 (legacy palette): found ${count} occurrence(s) of legacy token "${token}" in styles.css (expected 0).`);
    } else {
      pass(`No occurrences of legacy token "${token}".`);
    }
  }

  for (const hex of legacyHexLiterals) {
    const needle = hex.toLowerCase();
    let count = 0;
    let idx = cssLower.indexOf(needle);
    while (idx !== -1) {
      count += 1;
      idx = cssLower.indexOf(needle, idx + needle.length);
    }
    if (count > 0) {
      fail(`Assertion 1 (legacy palette): found ${count} occurrence(s) of legacy hex literal "${hex}" (case-insensitive) in styles.css (expected 0).`);
    } else {
      pass(`No occurrences of legacy hex literal "${hex}" (case-insensitive).`);
    }
  }

  // --- Assertion 2: no looping `pulse` animation applied to .bg-glow ---------
  const bgGlowRule = findRuleBySelector(rules, '.bg-glow');
  if (!bgGlowRule) {
    fail('Assertion 2 (.bg-glow motion): no standalone ".bg-glow" rule found in styles.css.');
  } else {
    const body = normalize(bgGlowRule.body);
    const isHidden = /display:\s*none/.test(body);
    // Detect an animation declaration (shorthand or animation-name) referencing "pulse".
    const animatesPulse = /animation[^;]*pulse/.test(body);
    if (!isHidden) {
      fail('Assertion 2 (.bg-glow motion): ".bg-glow" rule is not set to "display: none".');
    }
    if (animatesPulse) {
      fail('Assertion 2 (.bg-glow motion): ".bg-glow" rule still applies an "animation" referencing "pulse".');
    }
    if (isHidden && !animatesPulse) {
      pass('".bg-glow" is hidden (display: none) and applies no "pulse" animation.');
    }
  }

  // --- Assertion 3: exactly one visible .loader-ring -------------------------
  // The 2nd and 3rd rings must be hidden (display: none), leaving one visible.
  const hiddenRingsRule = rules.find((rule) => {
    const sel = normalize(rule.selector);
    return (
      sel.includes('.loader-ring:nth-child(2)') &&
      sel.includes('.loader-ring:nth-child(3)')
    );
  });

  if (!hiddenRingsRule) {
    fail('Assertion 3 (single loader ring): no rule targeting ".loader-ring:nth-child(2), .loader-ring:nth-child(3)" found.');
  } else {
    const body = normalize(hiddenRingsRule.body);
    if (/display:\s*none/.test(body)) {
      pass('Exactly one visible ".loader-ring": 2nd and 3rd rings are set to "display: none".');
    } else {
      fail('Assertion 3 (single loader ring): the rule for the 2nd/3rd ".loader-ring" elements does not set "display: none".');
    }
  }

  // --- Report ----------------------------------------------------------------
  if (failures.length > 0) {
    console.error('verify/check-palette-motion.js — FAILED\n');
    for (const f of failures) {
      console.error(`  ✗ ${f}`);
    }
    console.error(`\n${failures.length} assertion(s) failed.`);
    process.exit(1);
    return;
  }

  console.log('verify/check-palette-motion.js — PASS');
  console.log('Property 4 (single-accent palette) and Property 5 (reduced motion/noise) hold.\n');
  for (const p of passes) {
    console.log(`  ✓ ${p}`);
  }
  console.log(`\nAll ${passes.length} assertions passed.`);
  process.exit(0);
}

main();
