#!/usr/bin/env node
/*
 * verify/check-dom-contract.js
 * ------------------------------------------------------------------
 * Property 1: DOM contract invariance
 * Validates: Requirements 5.4, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
 *
 * Dependency-free static verification (Node built-in modules only: fs, path).
 *
 * Goal
 * ----
 * The modern-redesign-rebrand change is purely presentation + naming. Every
 * element `id` and CSS class that player.js looks up MUST still resolve after
 * the redesign, with no duplicate ids and the same querySelectorAll element
 * counts / data-speed values. This script proves that statically:
 *
 *   1. Extract every selector string passed to getElementById / querySelector /
 *      querySelectorAll in player.js (document-scoped AND element-scoped calls
 *      such as `toast.querySelector(...)` and `this.video.querySelectorAll(...)`).
 *   2. Read index.html (ids, class attributes, data-speed values) and styles.css
 *      (class names used in rules).
 *   3. Assert each extracted reference resolves:
 *        - getElementById('foo')            -> id="foo" exists in index.html (Req 8.1)
 *        - querySelector(All) "#id"         -> that id exists in index.html
 *        - querySelector(All) ".class"      -> class appears in index.html OR
 *          styles.css OR is created dynamically by player.js itself (Req 8.2).
 *          Some classes (e.g. `active`, `playing`) are toggled at runtime and
 *          only live in CSS; some (e.g. `download-toast-text`) are created by
 *          player.js via innerHTML and live only in the script.
 *        - tag selectors (e.g. `track`)     -> reported as INFO (always valid).
 *   4. Assert there are NO duplicate id values in index.html (Req 8.5).
 *   5. For querySelectorAll, report the matched element count in index.html and
 *      (for `.speed-option`) the set of data-speed values, so the count and
 *      data-speed values can be confirmed unchanged (Req 8.6).
 *
 * Exit code 0 with a PASS summary when every reference resolves and there are no
 * duplicate ids; non-zero listing each unresolved reference / duplicate id
 * otherwise. The script NEVER edits the source to force a pass — any genuine
 * unresolved reference is a real DOM-contract break and is reported with the
 * exact selector and the player.js line(s) where it is referenced.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PLAYER_PATH = path.join(ROOT, 'player.js');
const HTML_PATH = path.join(ROOT, 'index.html');
const CSS_PATH = path.join(ROOT, 'styles.css');

// ---------------------------------------------------------------------------
// Small helpers
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

/** Line number (1-based) of a character offset within `text`. */
function lineAt(text, offset) {
  let line = 1;
  for (let i = 0; i < offset && i < text.length; i += 1) {
    if (text[i] === '\n') line += 1;
  }
  return line;
}

// ---------------------------------------------------------------------------
// 1. Extract selector calls from player.js
// ---------------------------------------------------------------------------

/**
 * Match `.getElementById(...)`, `.querySelector(...)`, `.querySelectorAll(...)`
 * where the first argument is a single-, double-, or back-quoted string literal.
 * The leading `.` means we capture both `document.xxx(...)` and element-scoped
 * `el.xxx(...)` calls. Back-quoted template literals (e.g.
 * `.seek-indicator.${...}`) are captured too; their `${...}` interpolations are
 * neutralized during classification.
 */
function extractSelectorCalls(js) {
  const calls = [];
  const re = /\.(querySelectorAll|querySelector|getElementById)\s*\(\s*(['"`])([\s\S]*?)\2/g;
  let m;
  while ((m = re.exec(js)) !== null) {
    calls.push({
      method: m[1],
      raw: m[3],
      isTemplate: m[2] === '`',
      line: lineAt(js, m.index),
    });
  }
  return calls;
}

/**
 * Classify a querySelector(All) selector string into the id / class tokens it
 * references. `${...}` template interpolations are blanked out so they do not
 * generate bogus tokens; `hasDynamic` records that a dynamic part was present.
 */
function classifySelector(raw) {
  const hasDynamic = /\$\{/.test(raw);
  const cleaned = raw.replace(/\$\{[^}]*\}/g, ' ').trim();

  const ids = [];
  const classes = [];
  let m;

  const idRe = /#([A-Za-z_][\w-]*)/g;
  while ((m = idRe.exec(cleaned)) !== null) ids.push(m[1]);

  const classRe = /\.([A-Za-z_][\w-]*)/g;
  while ((m = classRe.exec(cleaned)) !== null) classes.push(m[1]);

  const isTagOnly =
    ids.length === 0 &&
    classes.length === 0 &&
    /^[a-zA-Z][\w-]*$/.test(cleaned);

  return { ids, classes, isTagOnly, hasDynamic, tag: isTagOnly ? cleaned : null };
}

// ---------------------------------------------------------------------------
// 2. Parse index.html (ids, classes, data-speed)
// ---------------------------------------------------------------------------

function parseHtml(html) {
  // ids (with duplicate tracking)
  const idCounts = new Map();
  const idRe = /\bid\s*=\s*["']([^"']+)["']/g;
  let m;
  while ((m = idRe.exec(html)) !== null) {
    const id = m[1].trim();
    idCounts.set(id, (idCounts.get(id) || 0) + 1);
  }

  // class tokens
  const classSet = new Set();
  const classAttrRe = /\bclass\s*=\s*["']([^"']*)["']/g;
  while ((m = classAttrRe.exec(html)) !== null) {
    m[1].split(/\s+/).forEach((c) => {
      if (c) classSet.add(c);
    });
  }

  // .speed-option count + data-speed values (Req 8.6).
  // Match each element carrying the speed-option class together with its
  // data-speed attribute (class precedes data-speed in the markup).
  let speedOptionCount = 0;
  const speedOptionRe = /\bclass\s*=\s*["'][^"']*\bspeed-option\b[^"']*["']/g;
  while ((m = speedOptionRe.exec(html)) !== null) speedOptionCount += 1;

  const dataSpeedValues = [];
  const dataSpeedRe = /\bclass\s*=\s*["'][^"']*\bspeed-option\b[^"']*["'][^>]*?\bdata-speed\s*=\s*["']([^"']+)["']/g;
  while ((m = dataSpeedRe.exec(html)) !== null) dataSpeedValues.push(m[1]);

  return { idCounts, classSet, speedOptionCount, dataSpeedValues };
}

// ---------------------------------------------------------------------------
// 3. Parse styles.css class names + player.js dynamically-created classes
// ---------------------------------------------------------------------------

function parseCssClasses(css) {
  // Strip comments so commented-out rules do not register as resolutions.
  const noComments = css.replace(/\/\*[\s\S]*?\*\//g, ' ');
  const classSet = new Set();
  const re = /\.([A-Za-z_][\w-]*)/g;
  let m;
  while ((m = re.exec(noComments)) !== null) classSet.add(m[1]);
  return classSet;
}

/**
 * Classes that player.js creates/manages itself (via innerHTML `class="..."`,
 * `className = '...'`, and classList add/remove/toggle). These are legitimate
 * resolution sources for element-scoped queries against dynamically-created
 * subtrees (e.g. `.download-toast-text`, created and queried inside player.js).
 */
function parseJsCreatedClasses(js) {
  const classSet = new Set();
  let m;

  // class="..." attributes inside template/innerHTML strings
  const classAttrRe = /\bclass\s*=\s*["']([^"']+)["']/g;
  while ((m = classAttrRe.exec(js)) !== null) {
    m[1].split(/\s+/).forEach((c) => c && classSet.add(c));
  }

  // element.className = 'a b c'
  const classNameRe = /\.className\s*=\s*(['"`])([^'"`]+)\1/g;
  while ((m = classNameRe.exec(js)) !== null) {
    m[2].split(/\s+/).forEach((c) => c && classSet.add(c));
  }

  // classList.add/remove/toggle('a', 'b', ...)
  const classListRe = /classList\.(?:add|remove|toggle)\s*\(([^)]*)\)/g;
  while ((m = classListRe.exec(js)) !== null) {
    const argRe = /(['"`])([^'"`]+)\1/g;
    let a;
    while ((a = argRe.exec(m[1])) !== null) {
      a[2].split(/\s+/).forEach((c) => c && classSet.add(c));
    }
  }

  return classSet;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const js = read(PLAYER_PATH);
  const html = read(HTML_PATH);
  const css = read(CSS_PATH);

  const calls = extractSelectorCalls(js);
  const { idCounts, classSet: htmlClasses, speedOptionCount, dataSpeedValues } = parseHtml(html);
  const cssClasses = parseCssClasses(css);
  const jsCreatedClasses = parseJsCreatedClasses(js);

  const htmlIds = new Set(idCounts.keys());

  const failures = [];
  const passes = [];
  const infos = [];

  // --- Group identical references so each unique selector reports once -------
  const grouped = new Map(); // key: method|raw -> { method, raw, isTemplate, lines:[] }
  for (const c of calls) {
    const key = `${c.method}|${c.raw}`;
    if (!grouped.has(key)) {
      grouped.set(key, { method: c.method, raw: c.raw, isTemplate: c.isTemplate, lines: [] });
    }
    grouped.get(key).lines.push(c.line);
  }

  // --- Resolve each reference ------------------------------------------------
  const querySelectorAllReports = [];

  for (const ref of grouped.values()) {
    const where = `player.js:${ref.lines.join(',')}`;

    if (ref.method === 'getElementById') {
      const id = ref.raw.trim();
      if (htmlIds.has(id)) {
        passes.push(`getElementById('${id}') -> #${id} found in index.html (${where})`);
      } else {
        failures.push(`UNRESOLVED getElementById('${id}') — no element with id="${id}" in index.html (${where})`);
      }
      continue;
    }

    // querySelector / querySelectorAll
    const { ids, classes, isTagOnly, hasDynamic, tag } = classifySelector(ref.raw);

    if (ids.length === 0 && classes.length === 0) {
      if (isTagOnly) {
        let note = `${ref.method}('${ref.raw}') -> tag selector <${tag}> (always valid; elements may be added dynamically)`;
        if (ref.method === 'querySelectorAll') {
          const tagCount = countTagInHtml(html, tag);
          note += ` — ${tagCount} <${tag}> element(s) in index.html`;
        }
        infos.push(`${note} (${where})`);
      } else {
        infos.push(`${ref.method}('${ref.raw}') -> dynamic/complex selector, no static id/class token to resolve (${where})`);
      }
      continue;
    }

    for (const id of ids) {
      if (htmlIds.has(id)) {
        passes.push(`${ref.method} "#${id}" -> id found in index.html (${where})`);
      } else {
        failures.push(`UNRESOLVED ${ref.method} selector "#${id}" — no element with id="${id}" in index.html (${where})`);
      }
    }

    for (const cls of classes) {
      const inHtml = htmlClasses.has(cls);
      const inCss = cssClasses.has(cls);
      const inJs = jsCreatedClasses.has(cls);
      if (inHtml || inCss || inJs) {
        const src = [
          inHtml ? 'index.html' : null,
          inCss ? 'styles.css' : null,
          inJs ? 'player.js(dynamic)' : null,
        ].filter(Boolean).join(' + ');
        const dyn = hasDynamic ? ' [template literal]' : '';
        passes.push(`${ref.method} ".${cls}"${dyn} -> resolved in ${src} (${where})`);
      } else {
        failures.push(`UNRESOLVED ${ref.method} selector ".${cls}" — class not found in index.html, styles.css, or player.js-created markup (${where})`);
      }
    }

    // querySelectorAll element-count / data-speed reporting (Req 8.6)
    if (ref.method === 'querySelectorAll' && classes.length > 0) {
      for (const cls of classes) {
        if (cls === 'speed-option') {
          querySelectorAllReports.push({
            selector: `.${cls}`,
            count: speedOptionCount,
            dataSpeed: dataSpeedValues.slice(),
          });
        } else {
          const count = countClassInHtml(html, cls);
          querySelectorAllReports.push({ selector: `.${cls}`, count, dataSpeed: null });
        }
      }
    }
  }

  // --- Duplicate id check (Req 8.5) ------------------------------------------
  const duplicateIds = [];
  for (const [id, n] of idCounts.entries()) {
    if (n > 1) duplicateIds.push({ id, count: n });
  }
  if (duplicateIds.length === 0) {
    passes.push(`No duplicate id values in index.html (${idCounts.size} unique id(s)).`);
  } else {
    for (const d of duplicateIds) {
      failures.push(`DUPLICATE id="${d.id}" appears ${d.count} times in index.html (must be exactly 1).`);
    }
  }

  report({
    calls,
    grouped,
    passes,
    failures,
    infos,
    querySelectorAllReports,
    idCount: idCounts.size,
  });
}

/** Count elements in index.html whose class list contains `cls`. */
function countClassInHtml(html, cls) {
  const re = new RegExp(`\\bclass\\s*=\\s*["'][^"']*\\b${escapeRe(cls)}\\b[^"']*["']`, 'g');
  let count = 0;
  while (re.exec(html) !== null) count += 1;
  return count;
}

/** Count occurrences of an opening tag `<tag` in index.html. */
function countTagInHtml(html, tag) {
  const re = new RegExp(`<${escapeRe(tag)}(?=[\\s/>])`, 'gi');
  let count = 0;
  while (re.exec(html) !== null) count += 1;
  return count;
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

function report(ctx) {
  const { calls, grouped, passes, failures, infos, querySelectorAllReports, idCount } = ctx;

  console.log('Lumen DOM-contract invariance check (Property 1)');
  console.log('================================================');
  console.log(`player.js  : ${PLAYER_PATH}`);
  console.log(`index.html : ${HTML_PATH}`);
  console.log(`styles.css : ${CSS_PATH}`);
  console.log('');
  console.log(`Extracted ${calls.length} selector call(s) (${grouped.size} unique) from player.js.`);
  console.log(`index.html exposes ${idCount} unique id(s).`);
  console.log('');

  if (querySelectorAllReports.length) {
    console.log('querySelectorAll element counts in index.html (Req 8.6):');
    for (const r of querySelectorAllReports) {
      let line = `  ${r.selector.padEnd(16)} -> ${r.count} element(s)`;
      console.log(line);
      if (r.dataSpeed) {
        console.log(`    data-speed values (${r.dataSpeed.length}): [${r.dataSpeed.join(', ')}]`);
      }
    }
    console.log('');
  }

  if (infos.length) {
    console.log('Informational (tag / dynamic selectors):');
    for (const i of infos) console.log(`  [INFO] ${i}`);
    console.log('');
  }

  if (failures.length === 0) {
    console.log(`SUMMARY: PASS — all ${passes.length} resolvable reference(s) resolve and there are no duplicate ids.`);
    console.log('Property 1 (DOM contract invariance) holds: every id/selector player.js uses still resolves.');
    process.exit(0);
  } else {
    console.error('Resolved references:');
    for (const p of passes) console.error(`  [PASS] ${p}`);
    console.error('');
    console.error(`SUMMARY: FAIL — ${failures.length} DOM-contract problem(s) detected:`);
    for (const f of failures) console.error(`  [FAIL] ${f}`);
    process.exit(1);
  }
}

main();
