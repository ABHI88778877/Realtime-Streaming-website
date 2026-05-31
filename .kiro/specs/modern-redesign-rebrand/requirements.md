# Requirements Document

## Introduction

This feature is a presentation-and-branding redesign of the existing single-page video player. It has three goals: (1) replace the dark "cinematic" theme — animated gradient/grid/glow backgrounds and the three-color teal/purple/pink accent system — with a modern, minimalist light theme driven by a centralized CSS design-token table, a single restrained accent, more whitespace, and flatter controls; (2) rename the product from "StreamFlow" to "Lumen" consistently across markup, styles, scripts, the Node proxy, and the README; and (3) preserve all existing playback, buffering, networking, and DOM-wiring behavior so the redesign is purely cosmetic and naming-related.

The redesign touches five artifacts (`index.html`, `styles.css`, `player.js`, `server.js`, `README.md`) plus the logo SVG. The canonical product name is treated as a single token, `PRODUCT_NAME = "Lumen"`. The only renamed code identifiers are the player class (`StreamFlowPlayer → LumenPlayer`) and the global instance (`window.streamFlow → window.lumen`). Every DOM `id` and CSS class consumed by the player script remains byte-for-byte identical so all logic keeps working.

## Glossary

- **Lumen**: The new canonical product name applied to every user-facing surface. Equal to `PRODUCT_NAME`.
- **StreamFlow**: The legacy product name being replaced. Equal to `LEGACY_NAME`.
- **Brand_String**: Any human-readable occurrence of the product name in markup text, the document title, the logo wordmark, the server startup banner, or documentation prose.
- **Stylesheet**: The `styles.css` artifact containing the design-token table and all component styling rules.
- **Markup**: The `index.html` artifact containing the page structure, branding strings, and the DOM contract.
- **Player_Script**: The `player.js` artifact containing the player class and global instance.
- **Proxy_Server**: The `server.js` artifact containing the Node static server and streaming proxy.
- **Documentation**: The `README.md` artifact.
- **Design_Token**: A CSS custom property declared in the `:root` selector of the Stylesheet (for example `--accent`, `--bg-app`, `--text-primary`).
- **Accent**: The single restrained accent color, exposed through the tokens `--accent`, `--accent-hover`, and `--accent-soft`.
- **DOM_Contract**: The complete set of element `id` values and CSS class names that the Player_Script references through `getElementById`, `querySelector`, `querySelectorAll`, and `classList` operations.
- **Player_Class**: The JavaScript class that implements the player, renamed from `StreamFlowPlayer` to `LumenPlayer`.
- **Global_Instance**: The global handle for the player instance, renamed from `window.streamFlow` to `window.lumen`.
- **Legacy_Palette_Token**: Any of the removed multi-hue tokens or literals: `--accent-secondary`, `--accent-tertiary`, `--gradient-accent`, `--gradient-glow`, `#00F5D4`, `#7B2CBF`, `#F72585`.

## Requirements

### Requirement 1: Centralized light design-token table

**User Story:** As a user, I want the interface to use a modern minimalist light theme, so that the player feels clean, calm, and uncluttered.

#### Acceptance Criteria

1. THE Stylesheet SHALL declare, in the `:root` selector, every design token in the table: the surface tokens (`--bg-app`, `--bg-surface`, `--bg-subtle`, `--bg-muted`, `--border`), the single-accent tokens (`--accent`, `--accent-hover`, `--accent-soft`), the text tokens (`--text-primary`, `--text-secondary`, `--text-tertiary`), the radius tokens (`--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl`), the neutral elevation tokens (`--shadow-sm`, `--shadow-md`, `--shadow-lg`), and the motion tokens (`--transition-fast`, `--transition-normal`, `--transition-slow`), each with a non-empty value.
2. THE Stylesheet SHALL set the page background token `--bg-app` to a color whose WCAG relative luminance is at least 0.90 on a 0.0–1.0 scale.
3. WHERE a component rule applies a surface, text, accent, radius, shadow, or motion value, THE Stylesheet SHALL set that value via a `var(--token)` reference and SHALL NOT use a hard-coded color literal (hex, `rgb`/`rgba`, `hsl`/`hsla`, or named color) for that value, nor reference any Legacy_Palette_Token.
4. WHERE text renders on a light surface token (`--bg-app`, `--bg-surface`, `--bg-subtle`, or `--bg-muted`), THE Stylesheet SHALL set its color via the `--text-primary`, `--text-secondary`, or `--text-tertiary` token according to the text's role.
5. THE Stylesheet SHALL declare each design token exactly once in the `:root` selector, with no duplicate declarations.

### Requirement 2: Single restrained accent palette

**User Story:** As a user, I want a single calm accent color instead of a multi-hue gradient scheme, so that the interface looks restrained and modern.

#### Acceptance Criteria

1. THE Stylesheet SHALL define the Accent through exactly three tokens (`--accent`, `--accent-hover`, `--accent-soft`) declared in `:root`, each with a non-empty value.
2. WHERE a rule applies an accent color, THE Stylesheet SHALL set it via a `var(--accent)`, `var(--accent-hover)`, or `var(--accent-soft)` reference.
3. THE Stylesheet SHALL contain zero occurrences of any Legacy_Palette_Token (`--accent-secondary`, `--accent-tertiary`, `--gradient-accent`, `--gradient-glow`, `#00F5D4`, `#7B2CBF`, `#F72585`) in any declaration or value.
4. THE Markup SHALL render the logo icon filled with a single solid accent color and SHALL NOT contain a `<linearGradient>` (or other multi-stop gradient) definition referenced by the logo.
5. WHERE an interactive control indicates an active, selected, focused, or progress state, THE Stylesheet SHALL render that state using an Accent token (`--accent`, `--accent-hover`, or `--accent-soft`).

### Requirement 3: Flat controls with reduced motion and visual noise

**User Story:** As a user, I want flatter controls and fewer animations, so that the interface feels quiet and focused rather than busy.

#### Acceptance Criteria

1. THE Stylesheet SHALL render the page background as a single solid surface color, and the `.bg-gradient`, `.bg-grid`, and `.bg-glow` layers SHALL NOT display any visible gradient, grid pattern, or glow.
2. THE Stylesheet SHALL NOT apply the `pulse` animation, or any other continuously looping animation, to the `.bg-glow` background layer.
3. THE Stylesheet SHALL render the loading spinner with exactly one visible `.loader-ring` styled with an accent color, and SHALL hide the remaining two `.loader-ring` elements (the 2nd and 3rd children) from view.
4. WHERE a control exposes a hover or active state, THE Stylesheet SHALL render that state with a flat background fill, a translate offset of 0 (no positional lift), and either no `box-shadow` or a `box-shadow` using only the neutral shadow tokens, and SHALL NOT apply any accent-colored or glow `box-shadow`.
5. WHEN a popover, menu, modal, or toast is displayed, THE Stylesheet SHALL render its surface using the `--bg-surface` background token, the `--border` border token, and the neutral shadow tokens, and SHALL NOT apply accent-colored backgrounds, borders, or shadows.

### Requirement 4: User-facing product rename to Lumen

**User Story:** As a user, I want the product to be named "Lumen" everywhere I can see it, so that the branding is consistent.

#### Acceptance Criteria

1. WHEN the Markup is loaded in a browser, THE Markup SHALL render the document title as a string that contains the exact Brand_String "Lumen" (case-sensitive) and contains zero occurrences of "streamflow" (matched case-insensitively, including a single optional space as in "stream flow").
2. THE Markup SHALL render the logo wordmark text as exactly the 5-character string "Lumen" (case-sensitive) with no additional surrounding brand text.
3. WHERE a Brand_String appears on a user-facing surface (defined as exactly these four surfaces: the document title, the logo wordmark, the Proxy_Server startup banner, and the Documentation top-level heading), THE System SHALL display the exact string "Lumen" (case-sensitive) and SHALL display zero occurrences of "streamflow" (matched case-insensitively, including a single optional space).
4. WHEN a case-insensitive search for "streamflow" (including a single optional space as in "stream flow") is run across the Markup, the Stylesheet, the Player_Script, the Proxy_Server, and the Documentation, THE System SHALL yield exactly zero matches.
5. WHEN the Proxy_Server starts, THE Proxy_Server SHALL emit a startup banner that contains the exact Brand_String "Lumen" (case-sensitive) and contains zero occurrences of "streamflow" (matched case-insensitively).
6. WHEN the Documentation is rendered, THE Documentation SHALL display the exact Brand_String "Lumen" (case-sensitive) in its top-level heading at least once and SHALL contain zero occurrences of "streamflow" (matched case-insensitively, including a single optional space).

### Requirement 5: Code identifier rename

**User Story:** As a developer, I want the player class and global instance renamed to match the new brand, so that the code reflects the "Lumen" identity.

#### Acceptance Criteria

1. THE Player_Script SHALL declare the Player_Class with the identifier `LumenPlayer`, and SHALL reference `LumenPlayer` at every class declaration and instantiation site, such that zero occurrences of the former class identifier `StreamFlowPlayer` remain in the Player_Script.
2. THE Player_Script SHALL assign the player instance to the Global_Instance `window.lumen`, such that zero occurrences of the former global identifier `window.streamFlow` remain in the Player_Script.
3. THE Player_Script SHALL restrict all changes to the Player_Class identifier, the Global_Instance identifier, and human-readable comment text, and SHALL leave every other token (including string literals, variable names, function names, and whitespace) byte-for-byte identical to the pre-rename Player_Script.
4. THE Player_Script SHALL preserve, unchanged byte-for-byte, every `id` string and CSS selector string passed to `getElementById`, `querySelector`, or `querySelectorAll`, such that each DOM lookup resolves to the same element as before the rename.
5. WHEN the renamed Player_Script is loaded in a browser, THE Player_Script SHALL initialize without runtime error and expose the same observable behavior as the pre-rename version, with all controls, playback, and DOM bindings functioning identically.

### Requirement 6: Proxy server branding strings

**User Story:** As an operator, I want the proxy server output to display "Lumen", so that the running service matches the brand without changing its behavior.

#### Acceptance Criteria

1. WHEN the Proxy_Server process starts, THE Proxy_Server SHALL print the startup banner to standard output with the brand token "StreamFlow" replaced by the Brand_String "Lumen" and all other banner characters unchanged.
2. THE Proxy_Server source file-header comment SHALL contain the Brand_String "Lumen" in place of the brand token "StreamFlow", with all other header-comment text unchanged.
3. WHEN the Proxy_Server prints the startup banner, THE Proxy_Server SHALL keep every right-edge border character "║" in the same character column across all bordered banner lines, such that all bordered lines have identical display width.
4. THE Proxy_Server SHALL continue to listen on TCP port 4000 unchanged.
5. THE Proxy_Server SHALL keep the `/proxy` route path and its request/response handling behavior identical to the pre-rebrand version, producing the same outputs for the same inputs.

### Requirement 7: Documentation rebrand

**User Story:** As a reader, I want the README to describe "Lumen" with an accurate minimalist-interface description, so that the documentation matches the redesigned product.

#### Acceptance Criteria

1. THE Documentation SHALL render the top-level heading and every prose occurrence of the Brand_Strings as "Lumen", such that zero occurrences of the legacy brand name "StreamFlow" remain.
2. THE Documentation SHALL render every code reference to the Player_Class as `LumenPlayer`, such that zero occurrences of the legacy class name `StreamFlowPlayer` remain.
3. THE Documentation SHALL describe the interface as a clean, minimalist interface, such that zero occurrences of the descriptors "cinematic", "animated gradient", "grid background", and "glow background" remain.
4. THE Documentation SHALL render every badge that encoded a Legacy_Palette_Token using the new accent color value, such that zero occurrences of any Legacy_Palette_Token remain.

### Requirement 8: DOM contract invariance

**User Story:** As a developer, I want every element id and CSS class consumed by the player to stay identical, so that all event wiring and state toggling keeps resolving after the redesign.

#### Acceptance Criteria

1. FOR ALL `id` values in the DOM_Contract referenced by the Player_Script through `getElementById`, THE Markup SHALL expose an element whose `id` attribute is byte-for-byte identical to its pre-redesign value, with zero such references resolving to `null` after the redesign.
2. FOR ALL CSS class names in the DOM_Contract referenced by the Player_Script through `classList` or selector operations, THE Stylesheet SHALL retain a rule whose class name is byte-for-byte identical to its pre-redesign value, including dynamically toggled classes (for example `active`, `hidden`, `playing`, `show-controls`, `hide-cursor`) that need not appear in the initial Markup.
3. WHEN the Player_Script resolves an element through `getElementById` or `querySelector` after the redesign, THE System SHALL return a non-null element carrying the same `id` or matching class as the element resolved by that reference before the redesign.
4. THE Markup SHALL preserve the parent-child nesting and document order of the `<video>` element and the elements bearing DOM_Contract ids for the control buttons, the audio, subtitle, and speed menus, and the shortcuts modal, such that every selector used by the Player_Script continues to match.
5. FOR ALL `id` values in the DOM_Contract, THE Markup SHALL assign each `id` to exactly one element, with no duplicate `id` values after the redesign.
6. WHEN the Player_Script resolves a collection through `querySelectorAll` after the redesign, THE System SHALL return a NodeList whose element count and `data-speed` attribute values are identical to the pre-redesign result for the same selector.

### Requirement 9: Playback and networking behavior invariance

**User Story:** As a user, I want all playback, buffering, and networking features to work exactly as before, so that the redesign introduces no functional regression.

#### Acceptance Criteria

1. WHEN a user loads a video URL, THE Player_Script SHALL perform source detection, loading, buffering, and network-speed tracking by executing the same function bodies, event bindings, timers, and fetch calls present in the pre-redesign Player_Script, and SHALL produce the same observable playback state, buffered ranges, and network-speed readout for that URL.
2. WHEN a user operates a playback control, THE Player_Script SHALL perform the play, pause, seek, skip, volume, mute, speed, Picture-in-Picture, fullscreen, audio-track, subtitle, or download action mapped to that control by executing the same function bodies, event bindings, and media-API calls present in the pre-redesign Player_Script, and SHALL produce the same observable result.
3. WHEN a user opens the page with a `?url=` query parameter, THE Player_Script SHALL auto-load the referenced video by executing the same query-parsing and loading logic present in the pre-redesign Player_Script, and SHALL produce the same observable result.
4. THE Player_Script and the Proxy_Server SHALL keep every function body, event binding, timer, fetch call, and media-API call byte-for-byte identical to the corresponding pre-redesign artifact, with the only permitted differences being the Player_Class identifier rename, the Global_Instance identifier rename, and human-readable comment-string changes.
5. IF a user operates any playback, buffering, networking, or `?url=` deep-link feature, THEN THE Player_Script SHALL complete that feature and SHALL produce no console error that was absent from the pre-redesign Player_Script for the same operation.

### Requirement 10: Runtime reference integrity

**User Story:** As a user, I want the page to load without errors after the rename, so that the player works on first open.

#### Acceptance Criteria

1. WHEN the `DOMContentLoaded` event fires, THE System SHALL construct the player instance and complete the initialization handler within 3 seconds without throwing an uncaught exception.
2. WHEN the `DOMContentLoaded` handler completes, THE System SHALL set `window.lumen` to a defined, non-null value for which `window.lumen instanceof LumenPlayer` evaluates to `true`.
3. THE System SHALL complete page load with zero `ReferenceError` occurrences for the legacy identifiers `StreamFlowPlayer` and `streamFlow`.
4. WHILE the page is loading, from navigation start until 3 seconds after the `DOMContentLoaded` event fires, THE System SHALL produce zero error-level entries in the browser console.
5. WHEN the `DOMContentLoaded` handler completes, THE System SHALL leave the legacy global `window.streamFlow` undefined.

### Requirement 11: Contrast and legibility

**User Story:** As a user, I want text to remain readable on the new light theme and over the video, so that the redesign does not reduce usability.

#### Acceptance Criteria

1. WHEN text renders on a light surface token (`--bg-app`, `--bg-surface`, `--bg-subtle`, or `--bg-muted`) using a text token (`--text-primary`, `--text-secondary`, or `--text-tertiary`), THE Stylesheet SHALL provide a contrast ratio of at least 4.5:1 for normal text and at least 3:1 for large text (font size at least 18pt, or at least 14pt bold).
2. WHEN text or a control glyph renders over the video using the `--on-video` or `--on-video-dim` token, THE Stylesheet SHALL provide a contrast ratio of at least 4.5:1 for normal text and at least 3:1 for large text and control glyphs, measured against the composited color over the `--scrim` gradient.
3. THE Stylesheet SHALL render the control `--scrim` such that, at its lightest point beneath a control, the control glyph color retains a contrast ratio of at least 3:1 against the scrimmed video region.
