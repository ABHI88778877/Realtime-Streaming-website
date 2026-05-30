# StreamFlow — Realtime Streaming Website

A lightweight, dependency-free video streaming player that plays any direct video URL straight in the browser. Paste an `MP4`, `WebM`, `OGG`, `HLS`, or `DASH` link and StreamFlow handles smart buffering, seeking, speed control, subtitles, downloads, and more. An optional Node.js proxy server is bundled to bypass CORS and hotlink restrictions.

![Formats](https://img.shields.io/badge/formats-MP4%20%7C%20WebM%20%7C%20OGG%20%7C%20HLS%20%7C%20DASH-00F5D4)
![Dependencies](https://img.shields.io/badge/dependencies-zero-7B2CBF)
![Backend](https://img.shields.io/badge/proxy-Node.js-339933)

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Using the Proxy Server](#using-the-proxy-server)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [How It Works](#how-it-works)
- [Supported Formats](#supported-formats)
- [Browser Support](#browser-support)
- [Limitations](#limitations)
- [Security Notes](#security-notes)

---

## Overview

StreamFlow is a single-page web app built with plain HTML, CSS, and JavaScript — no frameworks, no build step. The frontend is a self-contained class (`StreamFlowPlayer`) that wraps the native HTML5 `<video>` element with a custom, cinematic control surface and intelligent buffering logic.

A small Node.js server (`server.js`) is included for two purposes:
1. Serving the static files locally.
2. Acting as a streaming proxy that forwards HTTP `Range` requests and strips CORS/hotlink restrictions, so videos that browsers normally refuse to load can still play.

The app can run with no backend at all — just open `index.html`. The proxy is only needed for URLs blocked by CORS.

---

## Tech Stack

### Frontend
- **HTML5** — semantic markup and the native `<video>` element with `preload="auto"` and `playsinline`.
- **CSS3** — custom properties (CSS variables) for theming, flexbox/grid layouts, keyframe animations, gradients, backdrop filters, and a fully responsive control bar. No CSS framework.
- **Vanilla JavaScript (ES6+)** — class-based architecture, `async/await`, the Fetch API with `AbortController`, `URLSearchParams`, and direct DOM manipulation. No libraries bundled.
- **Web APIs** used directly:
  - HTML5 Media API (`buffered`, `currentTime`, `playbackRate`, `audioTracks`, `textTracks`)
  - Fullscreen API (with `webkit` fallbacks)
  - Picture-in-Picture API
  - Fetch streaming (`ReadableStream` reader) for download progress
  - Blob / Object URLs for client-side downloads and subtitle conversion
- **Google Fonts** — `Outfit` (UI) and `JetBrains Mono` (numeric/monospace readouts).
- **Optional streaming libraries** (loaded only if present on the page):
  - [`hls.js`](https://github.com/video-dev/hls.js) for HLS (`.m3u8`) on non-Safari browsers
  - [`dash.js`](https://github.com/Dash-Industry-Forum/dash.js) for MPEG-DASH (`.mpd`)

### Backend (optional)
- **Node.js** built-in modules only — `http`, `https`, `url`, `path`, `fs`. Zero npm dependencies.
- Runs a streaming reverse proxy on **port 4000** that forwards `Range` headers, follows redirects, spoofs a desktop `User-Agent`/`Referer`, and re-emits permissive CORS headers.

---

## Features

### Playback
- Stream any direct video URL instantly with buffer-aware playback.
- Play / pause via button, big center overlay, click-on-video, or keyboard.
- Skip forward / backward 10 seconds with an on-screen seek indicator.
- Variable playback speed from **0.25x up to 100x** — presets (0.25x → 100x) plus a custom speed input.
- Picture-in-Picture mode.
- Fullscreen (button, double-click, or `F`) with cross-browser support.
- Volume control with mute toggle and a slide-out volume slider.

### Smart Buffering
- Continues buffering ahead (target ~60s) even while paused.
- Keeps a rolling history buffer (~10% of watched content) for instant rewinds.
- Live **buffer health** indicator in the header (healthy / warning / critical states).
- Visual buffered-range bar layered on the progress track.
- Detects whether the source server supports HTTP **Range requests** and warns when seeking to unbuffered positions may fail.

### Network & Stats
- Real-time **network speed** readout in the header, computed from a rolling average of buffer deltas.
- Live buffer percentage display.

### Seeking & Navigation
- Click or drag the progress bar to scrub, with a time tooltip on hover.
- Number keys `0`–`9` jump to 0%–90% of the video.
- Click the time display to type an exact timestamp — accepts `MM:SS`, `HH:MM:SS`, plain seconds, or human formats like `1h30m`, `90s`.

### Audio & Subtitles
- Automatic detection of embedded **audio tracks** with a switcher menu (shown only when multiple tracks exist).
- Subtitle / caption track menu with on/off toggling.
- Load **external subtitle files** (`.srt` or `.vtt`) from disk — `.srt` is converted to WebVTT on the fly.

### Downloads
- One-click video download with a live progress toast (streamed via the Fetch reader).
- Cancel an in-progress download by clicking again.
- Smart filename derived from the source URL.
- Graceful fallback to a direct browser download link when CORS blocks the streamed fetch.

### UX & Interface
- Distinctive dark, cinematic theme with animated gradient/grid/glow backgrounds.
- Auto-hiding controls and cursor during playback.
- Loading, buffering, play, and error overlays with retry support.
- Keyboard shortcuts modal (`?`).
- URL is reflected in the query string (`?url=...`) so sessions are shareable/bookmarkable and auto-load on open.
- Optional local-proxy toggle on the landing screen.

---

## Project Structure

```
Realtime-Streaming-website/
├── index.html      # Markup: landing/URL screen, player UI, controls, modals
├── styles.css      # Full theme, layout, animations, responsive control bar
├── player.js       # StreamFlowPlayer class — all player logic & Web API wiring
├── server.js       # Optional Node.js static server + CORS/Range streaming proxy
└── README.md       # This file
```

---

## Getting Started

### Option 1 — Open directly (simplest)

Just open `index.html` in a modern browser, paste a direct video URL, and click **Stream**.

> Works great for CORS-friendly URLs. Some hosts block cross-origin playback — for those, use the proxy below.

### Option 2 — Run with the Node server (recommended)

Requires [Node.js](https://nodejs.org/) (no `npm install` needed — zero dependencies).

```bash
node server.js
```

Then open:

```
http://localhost:4000
```

Serving through the Node server lets you use the **Use Local Proxy** toggle for blocked URLs.

---

## Using the Proxy Server

Some video hosts reject cross-origin requests or hotlinking. The bundled proxy works around this:

1. Start the server: `node server.js`
2. Open `http://localhost:4000`
3. Enable the **Use Local Proxy (requires server.js running)** toggle on the landing screen, or call the endpoint directly:

```
http://localhost:4000/proxy?url=<ENCODED_VIDEO_URL>
```

What the proxy does:
- Forwards the client's `Range` header so **seeking still works**.
- Follows HTTP redirects automatically.
- Sends a desktop `User-Agent` and a matching `Referer` to satisfy hotlink checks.
- Re-emits permissive CORS headers (`Access-Control-Allow-Origin: *`, exposed `Content-Range`/`Accept-Ranges`).
- Streams the response straight through to the browser (no full buffering on the server).

---

## Keyboard Shortcuts

| Key | Action |
| --- | --- |
| `Space` / `K` | Play / Pause |
| `F` | Toggle fullscreen |
| `M` | Mute / unmute |
| `P` | Picture-in-Picture |
| `A` | Audio track menu (when multiple tracks) |
| `C` | Subtitles / captions menu |
| `D` | Download video |
| `←` / `J` | Skip back 10s |
| `→` / `L` | Skip forward 10s |
| `↑` | Volume up |
| `↓` | Volume down |
| `0`–`9` | Jump to 0%–90% |
| `?` | Toggle shortcuts help |
| `Esc` | Close help modal |
| Click time display | Jump to a specific timestamp |

---

## How It Works

1. **Source detection** — On load, `loadVideo()` inspects the URL. `.m3u8` routes to the HLS path (native in Safari, `hls.js` elsewhere), `.mpd` routes to DASH via `dash.js`, and everything else is treated as a direct progressive stream.
2. **Range support check** — A `HEAD` request inspects `Accept-Ranges`/`Content-Length` to decide whether byte-range seeking is available; the UI warns if it isn't.
3. **Buffer management** — A timer continuously evaluates how far ahead/behind the buffer extends, drives the header's buffer-health state, and keeps a history window for smooth rewinds.
4. **Network speed** — Buffer growth is sampled over time and averaged to estimate throughput, shown live in the header.
5. **Downloads** — The Fetch `ReadableStream` reader pulls chunks, updates a progress toast, then assembles a `Blob` for saving; if CORS blocks it, a direct link download is used instead.
6. **Subtitles** — Local `.srt` files are normalized and converted to WebVTT, turned into a Blob URL, and attached as a `<track>`.

---

## Supported Formats

| Format | Extension | Notes |
| --- | --- | --- |
| MP4 | `.mp4` | Native, best support |
| WebM | `.webm` | Native |
| OGG | `.ogg` | Native |
| HLS | `.m3u8` | Native in Safari; needs `hls.js` elsewhere |
| DASH | `.mpd` | Needs `dash.js` |

> `hls.js` and `dash.js` are not bundled. To enable HLS/DASH on non-Safari browsers, add their `<script>` tags to `index.html`.

---

## Browser Support

- **Chrome / Edge / Firefox** — full feature set (HLS requires `hls.js`).
- **Safari** — full feature set including native HLS.
- Picture-in-Picture and Fullscreen use standard APIs with `webkit` fallbacks. Embedded `audioTracks` switching depends on browser support and is hidden when unavailable.

---

## Limitations

- HLS (outside Safari) and DASH require adding `hls.js` / `dash.js` to the page; they are not included.
- Some video URLs (e.g. signed Google URLs) expire after a few hours.
- Seeking to unbuffered positions only works smoothly when the source server supports HTTP Range requests.
- Embedded audio-track switching is limited by browser API support.
- The proxy server is intended for **local/development use** — see security notes.

---

## Security Notes

- The proxy at `server.js` is an **open proxy** by design: it will fetch any URL passed to `/proxy?url=`. There is no authentication, rate limiting, or allowlist. Run it locally only and do **not** expose it to the public internet as-is.
- The static server includes basic directory-traversal protection but is meant for local development, not production hosting.
- Treat any externally loaded video, subtitle, or proxied content as untrusted.
