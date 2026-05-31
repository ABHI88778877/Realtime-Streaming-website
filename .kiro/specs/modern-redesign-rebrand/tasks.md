# Implementation Plan: modern-redesign-rebrand

## Overview

This plan turns the design into a sequence of incremental code edits that follow the design's edit ordering: CSS tokens → CSS components → HTML markup → JS rename → server strings → README → verification. The change is purely presentation-and-branding: every DOM `id`/class and all playback/networking behavior is preserved. Token-driven CSS is replaced first so most visual change flows from the `:root` table, then components are flattened to reference those tokens, then the `StreamFlow → Lumen` rename is applied across markup, scripts, server, and docs. Verification sub-tasks implement the design's correctness properties as automatable static/diff checks.

## Tasks

- [x] 1. Replace the CSS design-token table (`styles.css` `:root`)
  - [x] 1.1 Replace the `:root` custom-property table with the light, minimalist token set
    - Declare every token from the design table exactly once: surfaces (`--bg-app`, `--bg-surface`, `--bg-subtle`, `--bg-muted`, `--border`), single accent (`--accent`, `--accent-hover`, `--accent-soft`), text (`--text-primary`, `--text-secondary`, `--text-tertiary`), radii (`--radius-sm/-md/-lg/-xl`), neutral shadows (`--shadow-sm/-md/-lg`), motion (`--transition-fast/-normal/-slow`), and player-chrome tokens (`--on-video`, `--on-video-dim`, `--scrim`)
    - Set `--bg-app` to `#FFFFFF` (relative luminance ≥ 0.90)
    - Remove `--accent-secondary`, `--accent-tertiary`, `--gradient-accent`, `--gradient-glow`, and the legacy hex literals `#00F5D4`, `#7B2CBF`, `#F72585`
    - _Requirements: 1.1, 1.2, 1.5, 2.1, 2.3_

- [x] 2. Restyle components to flat, token-driven rules (`styles.css`)
  - [x] 2.1 Neutralize background layers and remove looping animations and extra loader rings
    - Set `.bg-gradient` to flat `background: var(--bg-app)`; set `.bg-grid` and `.bg-glow` to `display: none`; remove the `pulse` animation usage on `.bg-glow`
    - Collapse the spinner to a single accent ring: style one `.loader-ring` with `border-top-color: var(--accent)` and hide the 2nd/3rd `.loader-ring` (`display: none`)
    - _Requirements: 3.1, 3.2, 3.3_
  - [x] 2.2 Restyle header, logo, and landing screen to flat accent tokens
    - `.logo-text` flat `color: var(--text-primary)` (remove gradient text-fill); `.logo-icon` `color: var(--accent)`; `.stat-value` neutral ink with `.healthy/.warning/.critical` remapped to `--accent/--warning/--error`
    - `.title` flat ink (remove gradient clip); `.url-input-wrapper` border + focus-within accent ring via `--accent-soft`; delete `.url-input-bg` rule; `.play-btn` solid `--accent`, hover `--accent-hover`, no `translateY` lift or colored glow; `.format-tag` neutral; `.proxy-slider` checked → `--accent`
    - Replace every hard-coded color/shadow/motion value with a `var(--token)` reference
    - _Requirements: 1.3, 1.4, 2.2, 2.5, 3.4_
  - [x] 2.3 Restyle video chrome controls to on-video + accent tokens
    - `.controls` `background: var(--scrim)`; `.ctrl-btn` `color: var(--on-video)` with flat translucent hover; `.progress-played`/`.progress-thumb`/`.progress-buffer::after` solid `var(--accent)` (replace `--gradient-accent`), `.progress-buffer` translucent white, thumb shadow → `--shadow-sm`
    - `.big-play-btn` neutral disc, accent hover, no scale/glow; volume thumb/fill → `--accent`
    - `.speed-menu`/`.track-menu` light popovers (`--bg-surface`, `--border`, `--shadow-md`), `.active` options → `--accent`; `.download-toast` light surface with `--accent` fill bar
    - _Requirements: 2.2, 2.5, 3.4, 3.5, 11.2, 11.3_
  - [x] 2.4 Restyle modal and secondary buttons to neutral surfaces
    - `.shortcuts-content` (`--bg-surface`, `--border`, `--shadow-lg`); `.shortcut kbd` neutral fill; `.close-shortcuts` solid `--accent` with `--accent-hover` (no lift/glow); `.back-btn`/`.retry-btn` neutral with accent hover border; `.error-overlay svg` `color: var(--error)`
    - _Requirements: 1.4, 3.4, 3.5_
  - [x]* 2.5 Write static palette and reduced-motion verification check
    - **Property 4: Single-accent palette** and **Property 5: Reduced motion/noise**
    - Node/grep check: `styles.css` has zero occurrences of `--accent-secondary`, `--accent-tertiary`, `--gradient-accent`, `--gradient-glow`, `#00F5D4`, `#7B2CBF`, `#F72585`; assert no `pulse` animation on `.bg-glow`; assert exactly one visible `.loader-ring`
    - **Validates: Requirements 1.2, 1.4, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5**
  - [x]* 2.6 Write contrast/legibility check for token pairings
    - **Property 7: Contrast/legibility**
    - Pure-JS contrast-ratio computation over `--text-*` on `--bg-*` pairs (≥ 4.5:1 normal / 3:1 large) and `--on-video*` over the `--scrim`
    - **Validates: Requirements 11.1, 11.2, 11.3**

- [x] 3. Checkpoint - styling complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Apply markup branding and minimalist edits (`index.html`)
  - [x] 4.1 Rename title and logo wordmark and flatten the logo SVG
    - `<title>` → `Lumen — Video Player`; `.logo-text` content → `Lumen` (exact 5-char string, no surrounding brand text)
    - Remove `<defs><linearGradient id="logoGrad">…</linearGradient></defs>`; change the logo path `fill="url(#logoGrad)"` → `fill="currentColor"` (icon inherits `--accent`)
    - _Requirements: 2.4, 4.1, 4.2, 4.3_
  - [x] 4.2 Remove background-noise and url-input-bg divs while preserving the DOM contract
    - Remove the `.bg-gradient`, `.bg-grid`, `.bg-glow`, and `.url-input-bg` `<div>`s
    - Leave every element `id`, control button, the `<video>` element, menus, and the shortcuts modal byte-for-byte identical; assign each contract `id` to exactly one element (no duplicates)
    - _Requirements: 3.1, 8.1, 8.4, 8.5_
  - [x]* 4.3 Write DOM-contract invariance check
    - **Property 1: DOM contract invariance**
    - Extract every `id`/selector string passed to `getElementById`/`querySelector`/`querySelectorAll` in `player.js`; assert each resolves in `index.html`/`styles.css`, no duplicate ids, and `querySelectorAll` element counts and `data-speed` values are unchanged
    - **Validates: Requirements 5.4, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6**

- [x] 5. Rename code identifiers in the player script (`player.js`)
  - [x] 5.1 Rename `StreamFlowPlayer` → `LumenPlayer` and `window.streamFlow` → `window.lumen`
    - Semantic-rename the class declaration (line 6) and the single `new`/instantiation site (line 1610); update only the header comment "StreamFlow Video Player" → "Lumen Video Player"
    - Leave every other token byte-for-byte identical: all `getElementById`/selector strings, string literals, variable/function names, function bodies, event bindings, timers, and fetch/media-API calls unchanged
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 9.4_
  - [x]* 5.2 Write behavior-invariance check for `player.js`
    - **Property 2: Behavior invariance**
    - Diff against the pre-rename file and assert the only differences are the class identifier, the global-instance identifier, and the header comment; no function body, event binding, timer, fetch, or media-API call changed
    - **Validates: Requirements 6.4, 9.1, 9.2, 9.3, 9.4**

- [x] 6. Rename proxy-server branding strings (`server.js`)
  - [x] 6.1 Update the file-header comment and startup banner to "Lumen" with aligned borders
    - Header comment "StreamFlow Proxy Server" → "Lumen Proxy Server"; banner line "🎬 StreamFlow Proxy Server" → "🎬 Lumen Proxy Server"
    - Re-pad/trim trailing spaces so every right-edge "║" stays in the same column across all bordered lines; keep port `4000`, the `/proxy` route, and all request/response logic identical
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 7. Rebrand the documentation (`README.md`)
  - [x] 7.1 Rename product, class references, reword UX prose, and update badge colors
    - H1 + all prose "StreamFlow" → "Lumen"; code references `StreamFlowPlayer` → `LumenPlayer`
    - Reword "cinematic"/"animated gradient"/"grid background"/"glow background" descriptions to a "clean, minimalist interface"; update badge colors encoding `00F5D4`/`7B2CBF` to the new accent `2D6AE3`
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 8. Final verification
  - [x]* 8.1 Run the complete-rename grep across all artifacts
    - **Property 3: Complete rename**
    - Case-insensitive search for `streamflow` (including a single optional space) across `index.html`, `styles.css`, `player.js`, `server.js`, `README.md` returns exactly zero matches; confirm "Lumen" appears on the title, logo wordmark, server banner, and README H1
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 6.1, 6.2, 6.3, 7.1, 7.2**
  - [x]* 8.2 Run the source-level reference-integrity check
    - **Property 6: No broken references**
    - Assert `player.js` has zero `StreamFlowPlayer`/`streamFlow` occurrences, exactly one `class LumenPlayer` declaration, and exactly one `window.lumen = new LumenPlayer()` assignment, so no legacy `ReferenceError` can occur and `window.streamFlow` stays undefined
    - **Validates: Requirements 5.3, 10.1, 10.2, 10.3, 10.4, 10.5**

- [x] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional verification sub-tasks and can be skipped for a faster MVP; core implementation tasks are never optional.
- Each task references specific requirement clauses for traceability, and each verification sub-task names the design correctness property it checks.
- Checkpoints ensure incremental validation at the styling boundary and at completion.
- Manual confirmation (not a coding task, performed by the operator): run `node server.js`, open `http://localhost:4000`, load a sample MP4, and exercise play/pause, seek (click + drag + number keys), skip ±10s, volume/mute, speed presets + custom, PiP, fullscreen, subtitle load, download start/cancel, the `?url=` deep link, and the shortcuts modal; confirm the browser console shows zero errors, `window.lumen instanceof LumenPlayer` is `true`, and `window.streamFlow` is `undefined` (runtime portion of Property 6, and visual checks for Properties 5 and 7).
- No dependencies are added; verification scripts use only Node built-ins to keep the project dependency-free.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "4.1", "5.1", "6.1", "7.1"] },
    { "id": 1, "tasks": ["2.1", "4.2", "5.2", "8.1", "8.2"] },
    { "id": 2, "tasks": ["2.2"] },
    { "id": 3, "tasks": ["2.3"] },
    { "id": 4, "tasks": ["2.4"] },
    { "id": 5, "tasks": ["2.5", "2.6", "4.3"] }
  ]
}
```
