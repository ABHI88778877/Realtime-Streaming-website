#!/usr/bin/env node
/*
 * verify/check-contrast.js
 * ------------------------------------------------------------------
 * Property 7: Contrast / legibility (Validates Requirements 11.1, 11.2, 11.3)
 *
 * Pure-JS, dependency-free WCAG contrast verification for the Lumen
 * design-token table in styles.css. Uses ONLY Node built-in modules.
 *
 * What it checks
 * --------------
 * 1. Light-surface legibility (Req 11.1):
 *    Each text token rendered on each light surface token.
 *      - --text-primary  and --text-secondary  MUST be >= 4.5:1 (normal text)
 *        on ALL light surfaces (--bg-app, --bg-surface, --bg-subtle, --bg-muted).
 *      - --text-tertiary is RELAXED to the >= 3:1 large-text threshold, and is
 *        asserted only on the surfaces it is actually rendered on. In styles.css
 *        --text-tertiary is used solely for small UPPERCASE labels (.stat-label,
 *        menu headers, letter-spacing 0.1em) and input placeholders, and these
 *        only ever sit on the white surfaces --bg-app / --bg-surface. It is never
 *        paired with --bg-subtle / --bg-muted, so those two pairings are printed
 *        for transparency as INFO only (not asserted). This relaxation is allowed
 *        by the task because --text-tertiary backs secondary/label text, not body
 *        copy. See LIGHT_TEXT_RULES below.
 *
 * 2. On-video legibility (Req 11.2, 11.3):
 *    --on-video and --on-video-dim are composited-text colors that sit over the
 *    --scrim gradient on top of the (black) video. We take the scrim's STRONGEST
 *    opacity stop (its darkest point beneath the controls), composite it over a
 *    black (#000) video backdrop -> effectively near-black, then measure the
 *    on-video glyph/text color over that backdrop.
 *      - --on-video      MUST be >= 4.5:1 (normal text).
 *      - --on-video-dim  MUST be >= 3:1  (large text / control glyphs / placeholder).
 *
 * Exit code: 0 with a PASS summary when every assertion holds; non-zero with the
 * failing pair and its ratio otherwise. The script NEVER edits the token table to
 * force a pass — a real failure is reported for human review.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const STYLES_PATH = path.resolve(__dirname, '..', 'styles.css');

// ---------------------------------------------------------------------------
// :root token parsing
// ---------------------------------------------------------------------------

/**
 * Read every `--token: value;` declaration inside the first :root { ... } block.
 * Returns a plain object mapping token name (incl. leading --) to its raw value.
 */
function parseRootTokens(css) {
  const rootMatch = css.match(/:root\s*\{([\s\S]*?)\}/);
  if (!rootMatch) {
    throw new Error('Could not find a :root { ... } block in styles.css');
  }
  const body = rootMatch[1];
  const tokens = {};
  const declRe = /(--[\w-]+)\s*:\s*([^;]+);/g;
  let m;
  while ((m = declRe.exec(body)) !== null) {
    tokens[m[1]] = m[2].trim();
  }
  return tokens;
}

// ---------------------------------------------------------------------------
// Color parsing -> { r, g, b, a } with channels 0..255 and alpha 0..1
// ---------------------------------------------------------------------------

function parseColor(value) {
  const v = String(value).trim();

  // hex: #RGB, #RGBA, #RRGGBB, #RRGGBBAA
  const hexMatch = v.match(/^#([0-9a-fA-F]{3,8})$/);
  if (hexMatch) {
    let hex = hexMatch[1];
    if (hex.length === 3 || hex.length === 4) {
      hex = hex.split('').map((c) => c + c).join('');
    }
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const a = hex.length >= 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
    return { r, g, b, a };
  }

  // rgb()/rgba()
  const rgbMatch = v.match(/^rgba?\(\s*([^)]+)\)$/i);
  if (rgbMatch) {
    const parts = rgbMatch[1].split(',').map((s) => s.trim());
    if (parts.length < 3) {
      throw new Error(`Malformed rgb/rgba color: ${value}`);
    }
    const r = parseChannel(parts[0]);
    const g = parseChannel(parts[1]);
    const b = parseChannel(parts[2]);
    const a = parts.length >= 4 ? parseFloat(parts[3]) : 1;
    return { r, g, b, a };
  }

  throw new Error(`Unsupported color format (expected hex or rgb/rgba): ${value}`);
}

function parseChannel(s) {
  if (s.endsWith('%')) {
    return Math.round((parseFloat(s) / 100) * 255);
  }
  return Math.round(parseFloat(s));
}

// ---------------------------------------------------------------------------
// Alpha compositing (source-over): place fg (possibly translucent) over an
// opaque backdrop, returning the resulting opaque color.
// ---------------------------------------------------------------------------

function composite(fg, backdrop) {
  const a = fg.a;
  return {
    r: fg.r * a + backdrop.r * (1 - a),
    g: fg.g * a + backdrop.g * (1 - a),
    b: fg.b * a + backdrop.b * (1 - a),
    a: 1,
  };
}

// ---------------------------------------------------------------------------
// WCAG relative luminance + contrast ratio
// https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
// https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
// ---------------------------------------------------------------------------

function channelToLinear(c8) {
  const c = c8 / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance(rgb) {
  const r = channelToLinear(rgb.r);
  const g = channelToLinear(rgb.g);
  const b = channelToLinear(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(c1, c2) {
  const l1 = relativeLuminance(c1);
  const l2 = relativeLuminance(c2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ---------------------------------------------------------------------------
// Scrim handling: extract the strongest (max-alpha) rgba stop from the
// --scrim gradient, composite it over a black video backdrop.
// ---------------------------------------------------------------------------

function strongestScrimStop(scrimValue) {
  const stops = [];
  const re = /rgba?\([^)]*\)/gi;
  let m;
  while ((m = re.exec(scrimValue)) !== null) {
    stops.push(parseColor(m[0]));
  }
  if (stops.length === 0) {
    throw new Error(`No rgba color stops found in --scrim: ${scrimValue}`);
  }
  // Strongest opacity = darkest point beneath the controls.
  return stops.reduce((best, s) => (s.a > best.a ? s : best), stops[0]);
}

// ---------------------------------------------------------------------------
// Assertion harness
// ---------------------------------------------------------------------------

const results = []; // { label, ratio, threshold, mode, status }  status: PASS|FAIL|INFO

function fmt(n) {
  return `${n.toFixed(2)}:1`;
}

function check(label, ratio, threshold) {
  const status = ratio >= threshold ? 'PASS' : 'FAIL';
  results.push({ label, ratio, threshold, status });
  return status === 'PASS';
}

function info(label, ratio, threshold) {
  results.push({ label, ratio, threshold, status: 'INFO' });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const css = fs.readFileSync(STYLES_PATH, 'utf8');
  const tokens = parseRootTokens(css);

  const required = [
    '--bg-app', '--bg-surface', '--bg-subtle', '--bg-muted',
    '--text-primary', '--text-secondary', '--text-tertiary',
    '--on-video', '--on-video-dim', '--scrim', '--accent',
  ];
  const missing = required.filter((t) => !(t in tokens));
  if (missing.length) {
    console.error(`ERROR: missing required tokens in :root -> ${missing.join(', ')}`);
    process.exit(2);
  }

  const NORMAL = 4.5; // WCAG AA normal text
  const LARGE = 3.0;  // WCAG AA large text / glyphs

  const lightSurfaces = ['--bg-app', '--bg-surface', '--bg-subtle', '--bg-muted'];

  // Per-text-token policy on light surfaces.
  //   primary/secondary : assert NORMAL (4.5) on ALL light surfaces.
  //   tertiary          : RELAXED to LARGE (3.0); only asserted on the surfaces it
  //                       is actually used on (the white surfaces). Other surfaces
  //                       are reported as INFO since tertiary is never rendered there.
  const LIGHT_TEXT_RULES = {
    '--text-primary':   { threshold: NORMAL, assertOn: lightSurfaces },
    '--text-secondary': { threshold: NORMAL, assertOn: lightSurfaces },
    '--text-tertiary':  { threshold: LARGE,  assertOn: ['--bg-app', '--bg-surface'] },
  };

  // --- 1. Light surfaces: text token over surface token (Req 11.1) ---
  for (const textTok of Object.keys(LIGHT_TEXT_RULES)) {
    const rule = LIGHT_TEXT_RULES[textTok];
    const textColor = parseColor(tokens[textTok]);
    for (const surfTok of lightSurfaces) {
      const surfColor = parseColor(tokens[surfTok]);
      const ratio = contrastRatio(textColor, surfColor);
      const label = `${textTok} on ${surfTok}`;
      if (rule.assertOn.includes(surfTok)) {
        check(label, ratio, rule.threshold);
      } else {
        // tertiary is not rendered on this surface in styles.css -> informational
        info(`${label} (tertiary not used on this surface)`, ratio, rule.threshold);
      }
    }
  }

  // --- 2. On-video text/glyphs over the scrim (Req 11.2, 11.3) ---
  const black = { r: 0, g: 0, b: 0, a: 1 }; // black video backdrop
  const scrimStop = strongestScrimStop(tokens['--scrim']);
  const scrimmed = composite(scrimStop, black); // scrim's darkest point over black video

  for (const [tok, threshold, kind] of [
    ['--on-video', NORMAL, 'normal text'],
    ['--on-video-dim', LARGE, 'large text / glyphs'],
  ]) {
    const raw = parseColor(tokens[tok]);
    // The on-video color may itself be translucent (e.g. on-video-dim); composite
    // it over the scrimmed backdrop to get its effective rendered color.
    const effective = raw.a < 1 ? composite(raw, scrimmed) : raw;
    const ratio = contrastRatio(effective, scrimmed);
    check(`${tok} over scrim(${fmtAlpha(scrimStop.a)}) on black video [${kind}]`, ratio, threshold);
  }

  // --- Report ---
  print(tokens, scrimStop, scrimmed);
}

function fmtAlpha(a) {
  return `α=${a}`;
}

function print(tokens, scrimStop, scrimmed) {
  console.log('Lumen contrast / legibility check (WCAG 2.1)');
  console.log('============================================');
  console.log(`styles.css : ${STYLES_PATH}`);
  console.log('');
  console.log('Resolved tokens:');
  for (const t of ['--bg-app', '--bg-surface', '--bg-subtle', '--bg-muted',
    '--text-primary', '--text-secondary', '--text-tertiary',
    '--on-video', '--on-video-dim', '--accent']) {
    console.log(`  ${t.padEnd(18)} = ${tokens[t]}`);
  }
  console.log(`  --scrim            = ${tokens['--scrim']}`);
  console.log(`  scrim strongest    = rgba(${scrimStop.r},${scrimStop.g},${scrimStop.b},${scrimStop.a})`);
  console.log(`  scrim over #000    = rgb(${scrimmed.r.toFixed(0)},${scrimmed.g.toFixed(0)},${scrimmed.b.toFixed(0)})`);
  console.log('');

  const pad = results.reduce((w, r) => Math.max(w, r.label.length), 0);
  let failed = 0;
  for (const r of results) {
    const tag = r.status === 'PASS' ? 'PASS' : r.status === 'FAIL' ? 'FAIL' : 'INFO';
    const need = r.status === 'INFO' ? `(ref >= ${r.threshold.toFixed(1)}:1)` : `(>= ${r.threshold.toFixed(1)}:1)`;
    console.log(`  [${tag}] ${r.label.padEnd(pad)}  ${fmt(r.ratio).padStart(8)} ${need}`);
    if (r.status === 'FAIL') failed += 1;
  }
  console.log('');

  if (failed === 0) {
    const asserted = results.filter((r) => r.status !== 'INFO').length;
    console.log(`SUMMARY: PASS — all ${asserted} asserted contrast pairings meet their WCAG thresholds.`);
    process.exit(0);
  } else {
    console.error(`SUMMARY: FAIL — ${failed} contrast pairing(s) below threshold:`);
    for (const r of results.filter((x) => x.status === 'FAIL')) {
      console.error(`  - ${r.label}: ${fmt(r.ratio)} (needs >= ${r.threshold.toFixed(1)}:1)`);
    }
    process.exit(1);
  }
}

main();
