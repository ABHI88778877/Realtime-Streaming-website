<div align="center">

# 🎬 Lumen

### A fast, dependency-free video player for the web

Paste any direct video link and play it instantly — smart buffering, seeking, speed control, subtitles, downloads, dark mode, and a clean minimalist interface. No accounts, no tracking, no build step.

![Formats](https://img.shields.io/badge/formats-MP4%20%7C%20WebM%20%7C%20OGG%20%7C%20HLS%20%7C%20DASH-2D6AE3)
![Dependencies](https://img.shields.io/badge/dependencies-zero-2D6AE3)
![Backend](https://img.shields.io/badge/proxy-Node.js-339933)
![License](https://img.shields.io/badge/license-MIT-2D6AE3)

</div>

---

## Table of Contents

- [What is Lumen?](#what-is-lumen)
- [Highlights](#highlights)
- [Quick Start (Run Locally)](#quick-start-run-locally)
- [Using the App](#using-the-app)
- [The Proxy Server](#the-proxy-server)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Supported Formats](#supported-formats)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [How It Works](#how-it-works)
- [Browser Support](#browser-support)
- [Troubleshooting](#troubleshooting)
- [Limitations](#limitations)
- [Security Notes](#security-notes)
- [License](#license)

---

## What is Lumen?

Lumen is a single-page web app that turns any direct video URL into a full-featured player in your browser. It is built with plain HTML, CSS, and vanilla JavaScript — no frameworks and no build step — so it loads instantly and runs anywhere.

It ships with an optional, tiny Node.js server that does two things: serves the files locally and acts as a streaming proxy so videos that browsers normally block (CORS / hotlink protection) can still play. The proxy is optional; for CORS-friendly links you can just open the page.

---

## Highlights

- 🎥 **Plays any direct link** — MP4, WebM, OGG, plus HLS (`.m3u8`) and DASH (`.mpd`).
- ⚡ **Smart buffering** — buffers ahead even while paused, keeps a rewind history, and shows live buffer-health and network-speed readouts.
- ⏩ **Full playback control** — play/pause, ±10s skip, scrub & drag, jump-to-timestamp, and variable speed from **0.25x to 100x**.
- 🌗 **Dark & light themes** — one-click toggle that remembers your choice and follows your OS preference by default.
- 💬 **Subtitles & audio tracks** — load external `.srt`/`.vtt` files (SRT auto-converts to WebVTT) and switch embedded audio tracks.
- ⬇️ **One-click download** — streamed download with a live progress toast and cancel support.
- 🖼️ **Picture-in-Picture & Fullscreen** — with auto-hiding controls and title.
- 🔗 **Shareable URLs** — the current video is reflected in `?url=...` so links auto-load on open.
- 🪶 **Zero dependencies** — no npm install, no bundler, no tracking.

---

## Quick Start (Run Locally)

Lumen runs on your machine in under a minute. Pick the path that fits you.

### Prerequisites

- **For the recommended setup:** [Node.js](https://nodejs.org/) **v14 or newer**. Check with:
  ```bash
  node --version
  ```
  No `npm install` is needed — the project has zero dependencies.
- **For the simplest setup:** just a modern web browser (Chrome, Edge, Firefox, or Safari).

### Recommended — clone and run the server

This option enables the built-in proxy, so even CORS-blocked videos play.

**Step 1 — Get the code.** Clone the repository (or [download the ZIP](https://github.com/ABHI88778877/Realtime-Streaming-website/archive/refs/heads/main.zip) and extract it):

```bash
git clone https://github.com/ABHI88778877/Realtime-Streaming-website.git
```

**Step 2 — Enter the project folder:**

```bash
cd Realtime-Streaming-website
```

**Step 3 — Start the server:**

```bash
node server.js
```

You should see a banner confirming Lumen is running on port 4000.

**Step 4 — Open the app** in your browser:

```
http://localhost:4000
```

**Step 5 — Play a video.** Paste a direct video URL, click **Stream**, and you're watching. If a link is blocked, flip on **Use Local Proxy** and try again.

> To stop the server, press `Ctrl + C` in the terminal.

### Simplest — open the file directly

No terminal, no Node. Works for CORS-friendly URLs (the proxy is unavailable this way).

1. [Download the ZIP](https://github.com/ABHI88778877/Realtime-Streaming-website/archive/refs/heads/main.zip) and extract it (or clone the repo).
2. Double-click **`index.html`** to open it in your browser.
3. Paste a direct video URL and click **Stream**.

### No-clone alternative — serve with `npx`

If you have Node but would rather not run `server.js`, you can serve the folder with any static server (note: this skips the proxy):

```bash
cd Realtime-Streaming-website
npx serve .
```

Then open the URL it prints (usually `http://localhost:3000`).

---

## Using the App

1. **Paste a link.** On the landing screen, paste a direct video URL (one that ends in `.mp4`, `.webm`, `.m3u8`, etc.).
2. **Press Stream** (or hit `Enter`). Lumen detects the format and starts buffering.
3. **Control playback** with the on-screen controls or [keyboard shortcuts](#keyboard-shortcuts) — seek, change speed, adjust volume, go fullscreen or Picture-in-Picture.
4. **Add subtitles** from the captions menu (`C`) — load a local `.srt` or `.vtt` file.
5. **Download** the video with the download button or `D`.
6. **Toggle the theme** with the header button or `T`.
7. **Share** the page URL — it carries `?url=...`, so it reopens to the same video.

> **Tip:** If a video won't load, the host is probably blocking cross-origin playback. Run the server and enable **Use Local Proxy** (see below).

---

## The Proxy Server

Some hosts reject cross-origin requests or hotlinking. The bundled proxy works around that without changing how you use the app.

1. Start the server: `node server.js`
2. Open `http://localhost:4000`
3. Enable **Use Local Proxy (requires server.js running)** on the landing screen — or call the endpoint directly:

```
http://localhost:4000/proxy?url=<ENCODED_VIDEO_URL>
```

What it does:
- Forwards your `Range` header so **seeking still works**.
- Follows HTTP redirects automatically.
- Sends a desktop `User-Agent` and matching `Referer` to satisfy hotlink checks.
- Re-emits permissive CORS headers (`Access-Control-Allow-Origin: *`, exposed `Content-Range`/`Accept-Ranges`).
- Streams the response straight to the browser (no full buffering on the server).

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
| `T` | Toggle dark / light mode |
| `←` / `J` | Skip back 10s |
| `→` / `L` | Skip forward 10s |
| `↑` | Volume up |
| `↓` | Volume down |
| `0`–`9` | Jump to 0%–90% |
| `?` | Toggle shortcuts help |
| `Esc` | Close help modal |
| Click time display | Jump to a specific timestamp |

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

## Tech Stack

**Frontend**
- **HTML5** — semantic markup and the native `<video>` element with `preload="auto"` and `playsinline`.
- **CSS3** — custom properties (CSS variables) for theming, flexbox/grid layouts, a token-driven light/dark theme, and a fully responsive control bar. No CSS framework.
- **Vanilla JavaScript (ES6+)** — class-based architecture, `async/await`, the Fetch API with `AbortController`, `URLSearchParams`, and direct DOM manipulation. No libraries bundled.
- **Web APIs used directly:** HTML5 Media API (`buffered`, `currentTime`, `playbackRate`, `audioTracks`, `textTracks`), Fullscreen API (with `webkit` fallbacks), Picture-in-Picture API, Fetch streaming (`ReadableStream`) for download progress, and Blob/Object URLs for downloads and subtitle conversion.
- **Google Fonts** — `Outfit` (UI) and `JetBrains Mono` (numeric readouts).
- **Optional streaming libs** (loaded only if present): [`hls.js`](https://github.com/video-dev/hls.js) for HLS, [`dash.js`](https://github.com/Dash-Industry-Forum/dash.js) for DASH.

**Backend (optional)**
- **Node.js built-in modules only** — `http`, `https`, `url`, `path`, `fs`. Zero npm dependencies.
- A streaming reverse proxy on **port 4000** that forwards `Range` headers, follows redirects, spoofs a desktop `User-Agent`/`Referer`, and re-emits permissive CORS headers.

---

## Project Structure

```
Realtime-Streaming-website/
├── index.html      # Markup: landing/URL screen, player UI, controls, modals
├── styles.css      # Theme tokens (light/dark), layout, animations, responsive control bar
├── player.js       # LumenPlayer class — all player logic & Web API wiring
├── server.js       # Optional Node.js static server + CORS/Range streaming proxy
├── verify/         # Dependency-free static verification scripts
└── README.md       # This file
```

---

## How It Works

1. **Source detection** — On load, `loadVideo()` inspects the URL. `.m3u8` routes to the HLS path (native in Safari, `hls.js` elsewhere), `.mpd` routes to DASH via `dash.js`, and everything else is treated as a direct progressive stream.
2. **Range support check** — A `HEAD` request inspects `Accept-Ranges`/`Content-Length` to decide whether byte-range seeking is available; the UI warns if it isn't.
3. **Buffer management** — A timer continuously evaluates how far ahead/behind the buffer extends, drives the header's buffer-health state, and keeps a history window for smooth rewinds.
4. **Network speed** — Buffer growth is sampled over time and averaged to estimate throughput, shown live in the header.
5. **Downloads** — The Fetch `ReadableStream` reader pulls chunks, updates a progress toast, then assembles a `Blob` for saving; if CORS blocks it, a direct link download is used instead.
6. **Subtitles** — Local `.srt` files are normalized and converted to WebVTT, turned into a Blob URL, and attached as a `<track>`.

---

## Browser Support

- **Chrome / Edge / Firefox** — full feature set (HLS requires `hls.js`).
- **Safari** — full feature set including native HLS.
- Picture-in-Picture and Fullscreen use standard APIs with `webkit` fallbacks. Embedded `audioTracks` switching depends on browser support and is hidden when unavailable.

---

## Troubleshooting

| Problem | Fix |
| --- | --- |
| **Video won't load / "Unable to load video"** | The host likely blocks cross-origin playback. Run `node server.js`, open `http://localhost:4000`, and enable **Use Local Proxy**. |
| **`node` is not recognized** | Node.js isn't installed or isn't on your PATH. Install it from [nodejs.org](https://nodejs.org/) and reopen your terminal. |
| **Port 4000 is already in use** | Stop the other process using the port, or change the `PORT` value near the top of `server.js`. |
| **Proxy toggle does nothing** | The proxy only works when the page is served by `server.js`. Opening `index.html` directly disables it. |
| **HLS/DASH won't play outside Safari** | Add the `hls.js` / `dash.js` `<script>` tags to `index.html`. |
| **A link worked earlier but now fails** | Some URLs (e.g. signed Google links) expire after a few hours — get a fresh link. |

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

---

## License

Released under the **MIT License** — free to use, modify, and distribute.
