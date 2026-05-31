# Design Document: modern-redesign-rebrand

## Overview

A presentation-and-branding redesign of the existing single-page video player. It (1) replaces the dark "cinematic" theme — animated gradient/grid/glow backgrounds and the three-color teal/purple/pink accent system — with a modern, minimalist look built on a small token set, restrained accent, more whitespace, and flatter controls; and (2) renames the product from **StreamFlow** to **Lumen** consistently across markup, styles, scripts, the Node proxy, the README, and the logo SVG. **No playback, buffering, networking, or DOM-wiring behavior changes** — all element IDs and the public DOM contract are preserved.

The chosen name is treated as a single canonical token, `PRODUCT_NAME = "Lumen"`, applied uniformly. The only renamed code identifiers are the player class (`StreamFlowPlayer → LumenPlayer`) and the global instance (`window.streamFlow → window.lumen`); every DOM `id`/`class` consumed by `getElementById`/`querySelector` stays byte-for-byte identical so logic keeps working.

This is a low-level design: it specifies the concrete CSS token table, per-component restyle deltas, the markup edits, and the rename strategy with exact match/replace targets and ordering. Notation is the project's real languages (CSS / HTML / JavaScript), since the change is fundamentally about those concrete artifacts.

## Architecture

This is a static, no-build single-page app. The "architecture" here is the set of artifacts touched and the order of edits — a token-driven CSS layer feeds every visual component, markup carries branding strings and a stable DOM contract, and the scripts hold a single renameable class/instance. The redesign flows from tokens outward so most visual change is centralized.

```mermaid
sequenceDiagram
    participant Dev as Implementer
    participant CSS as styles.css
    participant HTML as index.html
    participant JS as player.js
    participant SRV as server.js
    participant DOC as README.md

    Dev->>CSS: 1. Replace :root token table (palette, radii, shadows, motion)
    Dev->>CSS: 2. Neutralize bg layers + restyle components to flat tokens
    Dev->>HTML: 3. Rename title/logo-text/SVG; keep all ids & classes
    Dev->>JS: 4. Rename class + global instance only (no id/selector edits)
    Dev->>SRV: 5. Rename comment + startup banner strings
    Dev->>DOC: 6. Rename product, prose, code refs, badge colors
    Dev->>Dev: 7. Verify: grep StreamFlow/streamFlow == 0; open page; smoke-test controls
```

## Data Models

The only "data model" in this presentation change is the design-token table (the CSS custom properties) plus the canonical name constants. They are defined once and consumed everywhere.

### Model: Canonical Name Constants (design-time)

There is no runtime config object in the current app, and introducing one would be scope creep for a static page. Instead the canonical name is a **design-time constant** applied by find-and-replace. The design documents it explicitly so the rename is unambiguous and verifiable.

```text
PRODUCT_NAME      = "Lumen"      // user-facing brand string
LEGACY_NAME       = "StreamFlow" // brand string being replaced
CLASS_NAME        = "LumenPlayer"     // was StreamFlowPlayer
GLOBAL_INSTANCE   = "lumen"           // was streamFlow (window.<GLOBAL_INSTANCE>)
```

Rule: any human-readable occurrence of `LEGACY_NAME` becomes `PRODUCT_NAME`; the class identifier becomes `CLASS_NAME`; the global instance identifier becomes `GLOBAL_INSTANCE`. **No element `id` or CSS class selector is renamed.**

**Validation Rules:**
- `PRODUCT_NAME` is non-empty and applied identically to every user-facing surface.
- `CLASS_NAME` / `GLOBAL_INSTANCE` are valid JS identifiers and used only at their declaration + single use site.

### Model: Design Tokens (`:root` in styles.css)

The redesign is driven entirely by replacing the CSS custom-property table. Components below reference these tokens, so most restyling happens by changing the table plus a handful of per-rule deltas.

### New token table (light, minimalist default)

```css
:root {
  /* Brand / accent — single restrained accent, no multi-hue gradient */
  --accent: #2D6AE3;            /* one calm blue accent (was teal/purple/pink trio) */
  --accent-hover: #1F55C0;
  --accent-soft: rgba(45, 106, 227, 0.12);  /* tints/focus rings instead of glows */

  /* Surfaces — light, high-whitespace */
  --bg-app: #FFFFFF;            /* page background (was #0A0A0F) */
  --bg-surface: #FFFFFF;        /* cards/inputs */
  --bg-subtle: #F5F6F8;         /* secondary fills, hover */
  --bg-muted: #ECEEF1;          /* borders-as-fill, track backgrounds */
  --border: #E2E5EA;            /* hairline borders */

  /* Text */
  --text-primary: #16181D;
  --text-secondary: #5B6270;
  --text-tertiary: #8A909C;

  /* Semantic (muted, single-purpose) */
  --success: #1F9D6B;
  --warning: #C98A00;
  --error:   #D64545;

  /* Player chrome — controls sit over black video, need light-on-dark */
  --on-video: #FFFFFF;
  --on-video-dim: rgba(255, 255, 255, 0.72);
  --scrim: linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 100%); /* lighter than before */

  /* Radii — slightly softer, consistent */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;

  /* Elevation — soft, neutral, no colored glow */
  --shadow-sm: 0 1px 2px rgba(16, 24, 40, 0.06);
  --shadow-md: 0 4px 16px rgba(16, 24, 40, 0.08);
  --shadow-lg: 0 12px 32px rgba(16, 24, 40, 0.10);

  /* Motion — calmer, fewer/shorter animations */
  --transition-fast: 0.12s ease;
  --transition-normal: 0.18s ease;
  --transition-slow: 0.24s ease;
}
```

### Token migration map (old → new)

| Old token / literal | New token | Notes |
| --- | --- | --- |
| `--accent-primary #00F5D4` | `--accent` | single accent replaces teal |
| `--accent-secondary #7B2CBF` | (removed) → `--accent` | purple folded into single accent |
| `--accent-tertiary #F72585` | (removed) → `--accent` | pink folded into single accent |
| `--gradient-accent` | (removed) → solid `--accent` | flat fills replace gradient fills |
| `--gradient-glow` | (removed) | glow layer deleted |
| `--bg-deep/-primary/-secondary/-tertiary/-elevated` | `--bg-app/-surface/-subtle/-muted` | dark → light surfaces |
| colored box-shadows e.g. `rgba(0,245,212,0.3)` | `--shadow-*` / `--accent-soft` | neutral elevation + soft focus ring |

> A dark variant is intentionally **not** scoped in v1 to keep the change minimal; the token table is structured so a future `@media (prefers-color-scheme: dark)` override could remap surfaces/text without touching component rules.

## Components and Interfaces

Each entry lists the target selector(s) in `styles.css` and the concrete delta. Behavior, layout structure, and selectors are unchanged unless noted; only visual properties change. The "interface" each component exposes — its element `id`s and state classes — is held constant so `player.js` keeps working.

### Function: removeBackgroundNoise()

```text
Targets: .bg-gradient, .bg-grid, .bg-glow  (in styles.css)
         #bg-gradient/#bg-grid/#bg-glow markup divs (in index.html)
```

**Preconditions:** Three fixed-position background layers exist and the `pulse` keyframe animates `.bg-glow`.

**Change:**
- Reduce to a single flat surface: set `.bg-gradient` to plain `background: var(--bg-app);` (remove stacked radial gradients).
- `.bg-grid`: remove the dual linear-gradient grid image (set to `display: none`) OR keep an ultra-faint single grid at `rgba(16,24,40,0.02)` — default is remove for minimalism.
- `.bg-glow`: remove the element's visual output (`display: none`) and delete the `@keyframes pulse` usage on it.

**Postconditions:** No animated/gradient/grid background remains; page background is a single calm surface. The three `<div>`s MAY stay in markup (harmless, `display:none`) to minimize HTML churn, or be removed — design recommends removing them from `index.html` for cleanliness.

**Loop invariants:** N/A.

### Function: restyleHeaderAndLogo()

```text
Targets: .header, .logo, .logo-icon, .logo-text, .stat-value (styles.css)
         .logo-text content + logo SVG (index.html)
```

**Change:**
- `.header`: keep layout; change `border-bottom` to `1px solid var(--border)`.
- `.logo-text`: remove gradient text-fill (`-webkit-background-clip:text` + transparent fill); set flat `color: var(--text-primary); font-weight: 600;`. Content becomes `PRODUCT_NAME`.
- `.logo-icon`: `color: var(--accent);`.
- Logo SVG: replace the `linearGradient#logoGrad` (teal→purple stops) with a single `fill="var(--accent)"` (or `fill="currentColor"`) and drop the `<defs>` gradient. Keep the play-triangle path geometry.
- `.stat-value`: `color: var(--accent)` → `color: var(--text-primary)`; keep mono font. Buffer-health state colors (`.healthy/.warning/.critical`) remap to `--accent/--warning/--error`.

**Postconditions:** Header is a flat light bar; logo wordmark reads "Lumen" in solid ink; no gradient text.

### Function: restyleLandingScreen()

```text
Targets: .title, .subtitle, .url-input-wrapper, .url-input-bg, .url-input,
         .play-btn, .proxy-*, .format-tag (styles.css)
```

**Change:**
- `.title`: remove gradient clip; flat `color: var(--text-primary)`; keep responsive `clamp()` size, slightly reduce weight to 600 for a cleaner feel.
- `.url-input-wrapper`: `background: var(--bg-surface)`; `border: 1px solid var(--border)`; focus-within → `border-color: var(--accent); box-shadow: 0 0 0 4px var(--accent-soft);` (replace teal glow + heavy drop shadow).
- `.url-input-bg`: remove (delete rule and the `<div class="url-input-bg">`), since the animated gradient tint is gone.
- `.play-btn`: `background: var(--accent); color:#fff;` hover → `background: var(--accent-hover);` remove `translateY(-2px)` lift + colored glow (use `--shadow-sm` at most). Keep label "Stream".
- `.format-tag`: `background: var(--bg-subtle); border:1px solid var(--border); color: var(--text-secondary);`.
- `.proxy-slider` checked state → `--accent`.

### Function: restyleVideoChrome()

```text
Targets: .player-container, .controls, .progress-*, .ctrl-btn, .big-play-btn,
         .volume-*, .speed-*, .track-*, .download-toast, .loading-overlay, .loader* (styles.css)
```

**Change (controls render over black video → use --on-video tokens):**
- `.player-container`: replace colored/oversized shadow with `--shadow-lg`; keep `border-radius: var(--radius-lg)`.
- `.controls`: `background: var(--scrim)` (lighter gradient); keep show/hide transitions.
- `.ctrl-btn`: `color: var(--on-video);` hover → `background: rgba(255,255,255,0.12); color: var(--on-video);` (drop teal hover color).
- `.progress-played`: solid `background: var(--accent)` (was `--gradient-accent`). `.progress-buffer`: `rgba(255,255,255,0.35)`. `.progress-thumb`: `background: var(--accent)`, remove colored glow shadow → `--shadow-sm`. `.progress-buffer::after` accent tick → `var(--accent)`.
- `.big-play-btn`: neutral translucent disc; hover → `background: var(--accent); color:#fff;` remove `scale(1.1)` + glow (or reduce to subtle `--shadow-md`).
- `.volume-slider` thumb / `.volume-fill`: `--accent`.
- `.speed-menu`, `.track-menu`: `background: var(--bg-surface); color: var(--text-primary); border:1px solid var(--border); box-shadow: var(--shadow-md);` (light popovers). `.speed-option.active` / `.track-option.active` → `--accent`. Custom/Go buttons → `--accent` / `--accent-hover`.
- `.download-toast`: light surface (`--bg-surface`, `--text-primary`, `--shadow-md`); fill bar `--accent`.
- `.loader-ring`: collapse 3 multicolor rings to a single accent ring (`border-top-color: var(--accent)`); set the 2nd/3rd rings to `display:none` (keep markup) for a calmer spinner.

**Postconditions:** All player chrome uses one accent + neutral surfaces; no multi-hue gradients or colored glows; motion reduced.

**Loop invariants:** N/A.

### Function: restyleModalAndButtons()

```text
Targets: .shortcuts-modal, .shortcuts-content, .shortcut kbd, .close-shortcuts,
         .back-btn, .retry-btn, .error-overlay (styles.css)
```

**Change:**
- `.shortcuts-content`: `background: var(--bg-surface); border:1px solid var(--border); box-shadow: var(--shadow-lg);` keep `scaleIn`.
- `.shortcut kbd`: `background: var(--bg-subtle); border:1px solid var(--border); color: var(--text-primary);`.
- `.close-shortcuts`: solid `--accent`; remove lift + colored glow on hover → `--accent-hover`.
- `.back-btn` / `.retry-btn`: neutral `--bg-subtle` + `--border`; hover border → `--accent`.
- `.error-overlay svg`: `color: var(--error)` (kept, single semantic red).

## Markup Edits (index.html)

```text
1. <title>StreamFlow — Video Player</title>
   → <title>Lumen — Video Player</title>

2. <span class="logo-text">StreamFlow</span>
   → <span class="logo-text">Lumen</span>

3. Logo SVG: remove <defs><linearGradient id="logoGrad">…</linearGradient></defs>
   and change path fill="url(#logoGrad)" → fill="currentColor" (icon inherits --accent).

4. Remove background-noise divs (recommended):
   <div class="bg-gradient"></div><div class="bg-grid"></div><div class="bg-glow"></div>
   → remove all three (or keep .bg-gradient only as flat surface). If kept, CSS sets them flat/none.

5. Remove <div class="url-input-bg"></div> (its animated tint rule is deleted).

6. Optional: drop the two extra <div class="loader-ring"></div> siblings (keep one) to match single-ring spinner. (CSS display:none also suffices — prefer not editing markup if it risks churn.)
```

All other markup — every `id`, every control button, the `<video>` element, menus, modal grid — is unchanged.

## Identifier Rename Strategy (player.js, server.js)

### Function: renameClassAndInstance()

```javascript
// player.js — exactly three identifier sites (plus the file-header comment string):
// a) class declaration
class StreamFlowPlayer { … }      // → class LumenPlayer { … }
// b) instantiation + global handle
window.streamFlow = new StreamFlowPlayer();  // → window.lumen = new LumenPlayer();
// c) header comment "StreamFlow Video Player" → "Lumen Video Player"
```

**Preconditions:** `StreamFlowPlayer` is referenced only at its declaration and its single `new` call; `window.streamFlow` is the only global handle; neither is referenced from HTML inline handlers (verified — `index.html` has no inline JS using them).

**Method:** Prefer an editor **semantic rename** on the class symbol (declaration → updates the `new` site) and on the instance property; fall back to scoped find-replace of the two identifiers. The class rename is safe because no `getElementById`/selector strings contain the word (they use ids like `videoPlayer`, not the class name).

**Postconditions:** `grep -i streamflow player.js` returns 0 matches; player still constructs on `DOMContentLoaded`.

**Loop invariants:** N/A.

### Function: renameServerStrings()

```text
server.js human-readable strings only (no logic):
 - header comment "StreamFlow Proxy Server" → "Lumen Proxy Server"
 - startup banner line "🎬 StreamFlow Proxy Server" → "🎬 Lumen Proxy Server"
   (verify the ASCII box border still aligns after the shorter name; pad/trim
    trailing spaces so the ║ right edge stays aligned)
```

**Postconditions:** Banner prints "Lumen"; port `4000`, routes (`/proxy`), and all proxy logic unchanged.

## README Edits (README.md)

```text
- H1 title and all prose "StreamFlow" → "Lumen".
- Code reference `StreamFlowPlayer` → `LumenPlayer` (Overview + Project Structure).
- "cinematic"/"animated gradient/grid/glow" feature descriptions → reword to
  "clean, minimalist interface" to match the redesign (UX & Interface section).
- Badge accent colors that encode old palette
  (…-00F5D4 / …-7B2CBF) → update to new accent hex (2D6AE3) for consistency.
- Project-structure comment for player.js (`StreamFlowPlayer class …`) → `LumenPlayer class …`.
```

## Example Application (representative diffs)

```css
/* styles.css — token table (excerpt) */
:root {
  --accent: #2D6AE3;
  --bg-app: #FFFFFF;
  --text-primary: #16181D;
  /* …removed: --accent-secondary, --accent-tertiary, --gradient-accent, --gradient-glow */
}

.logo-text {                /* was gradient-clipped text */
  font-weight: 600;
  color: var(--text-primary);
}

.play-btn {                 /* was var(--gradient-accent) + colored glow on hover */
  background: var(--accent);
  color: #fff;
}
.play-btn:hover { background: var(--accent-hover); }  /* no translateY lift, no glow */

.bg-glow { display: none; }  /* animated pulse removed */
```

```html
<!-- index.html -->
<title>Lumen — Video Player</title>
<span class="logo-text">Lumen</span>
<path d="M8 6L26 16L8 26V6Z" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
```

```javascript
// player.js
class LumenPlayer { /* identical body, all getElementById ids unchanged */ }
document.addEventListener('DOMContentLoaded', () => { window.lumen = new LumenPlayer(); });
```

## Correctness Properties

These are the invariants the redesign must preserve. They double as the acceptance/verification checklist.

### Property 1: DOM contract invariance
For every `id` and CSS class referenced by `player.js` (`videoPlayer`, `loadBtn`, `progressContainer`, `speedMenu`, `audioMenu`, `subtitleMenu`, `bufferStat`, … and classes like `active`, `hidden`, `playing`, `show-controls`, `hide-cursor`), the identifier string in `index.html`/`styles.css` is identical before and after. ⇒ all event wiring and state-class toggling still resolves.

**Validates: Requirements 5.4, 8.1, 8.2, 8.3, 8.4**

### Property 2: Behavior invariance
No function body, event binding, timer, fetch, or media-API call in `player.js`/`server.js` changes. Playback, buffering, network-speed, seeking, speed control, PiP, fullscreen, volume, tracks, subtitle load, download, keyboard shortcuts, and `?url=` sharing behave exactly as before.

**Validates: Requirements 6.4, 9.1, 9.2, 9.3, 9.4**

### Property 3: Complete rename
A case-insensitive search for `streamflow` across `index.html`, `styles.css`, `player.js`, `server.js`, `README.md` returns **zero** matches; user-facing surfaces (title, logo, banner, README H1) read "Lumen".

**Validates: Requirements 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 6.1, 6.2, 6.3, 7.1, 7.2**

### Property 4: Single-accent palette
No remaining rule references `--accent-secondary`, `--accent-tertiary`, `--gradient-accent`, or `--gradient-glow`; the multi-hue logo gradient is removed. Accent appears via `--accent`/`--accent-hover`/`--accent-soft` only.

**Validates: Requirements 1.1, 1.3, 2.1, 2.2, 2.3, 2.4**

### Property 5: Reduced motion/noise
`.bg-glow` no longer animates (no `pulse` on it), the grid/multi-radial gradient background is gone, and the loader shows a single ring.

**Validates: Requirements 1.2, 1.4, 3.1, 3.2, 3.3, 3.4, 3.5**

### Property 6: No broken references
Page loads with no console errors; `window.lumen instanceof LumenPlayer` is true; no `ReferenceError` for `StreamFlowPlayer`/`streamFlow`.

**Validates: Requirements 5.3, 7.3, 7.4, 10.1, 10.2, 10.3, 10.4**

### Property 7: Contrast/legibility
Body text on light surfaces and control text on the video scrim remain legible (text/background pairs chosen for sufficient contrast).

**Validates: Requirements 11.1, 11.2, 11.3**

## Error Handling

This is a presentation/branding change with no new runtime code paths, so error handling centers on avoiding regressions rather than new failure modes.

- **Stale identifier reference:** If a rename misses a site (e.g., the `new` call) the page throws `ReferenceError` on load. Mitigation: prefer semantic rename of the class symbol; verify with the console check and Property 6.
- **Accidentally renamed `id`/class:** If a find-replace is too broad and touches a DOM `id`/class, controls silently stop responding. Mitigation: restrict rename to the two JS identifiers + human-readable strings only; never replace inside `getElementById`/selector strings; verify Property 1.
- **Broken server banner alignment:** Shorter name can misalign the ASCII box. Mitigation: re-pad trailing spaces so the `║` right edge stays aligned; non-functional but verified visually.
- **Contrast regression on light theme:** Light surfaces can reduce legibility of previously light-on-dark text. Mitigation: use `--text-*` tokens on light surfaces and `--on-video*` tokens only over the video; verify Property 7.

## Testing Strategy

### Static verification
- Repo-wide case-insensitive grep for `streamflow` → expect 0 (Property 3).
- Grep CSS for stray old tokens/hex (`--accent-secondary|--accent-tertiary|--gradient-accent|--gradient-glow|00F5D4|7B2CBF|F72585`) → expect 0 in active rules (Property 4).
- Diff `id`/class names referenced in `player.js` against `index.html`/`styles.css` → identical sets (Property 1).

### Manual smoke test
Run `node server.js`, open `http://localhost:4000`, load a sample MP4, and exercise: play/pause, seek (click + drag + number keys), skip ±10s, volume/mute, speed presets + custom, PiP, fullscreen, subtitle file load, download start/cancel, `?url=` deep link, shortcuts modal. Each must behave as before (Property 2).

### Console / runtime check
No errors or `ReferenceError`; confirm `window.lumen` exists, is a `LumenPlayer`, and `window.streamFlow` is `undefined` (Property 6).

### Visual check
Confirm flat light theme, single accent, no animated background, single-ring loader, and the "Lumen" wordmark; eyeball text contrast on light surfaces and over the video scrim (Properties 5, 7).

## Dependencies

None added. Still dependency-free (plain HTML/CSS/vanilla JS + Node built-ins). Google Fonts (Outfit + JetBrains Mono) are retained; an optional minor refinement is to keep Outfit for UI and JetBrains Mono for numeric readouts (unchanged) — no new font is required for the minimalist look.
