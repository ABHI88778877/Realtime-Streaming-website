/**
 * Lumen Video Player
 * High-quality streaming video player with smart buffering
 */

class LumenPlayer {
    constructor() {
        // DOM Elements
        this.urlSection = document.getElementById('urlSection');
        this.playerSection = document.getElementById('playerSection');
        this.playerContainer = document.getElementById('playerContainer');
        this.video = document.getElementById('videoPlayer');
        this.urlInput = document.getElementById('videoUrl');
        this.loadBtn = document.getElementById('loadBtn');
        this.backBtn = document.getElementById('backBtn');
        this.useProxyCheckbox = document.getElementById('useProxy');
        
        // Overlays
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.playOverlay = document.getElementById('playOverlay');
        this.errorOverlay = document.getElementById('errorOverlay');
        this.errorText = document.getElementById('errorText');
        this.bufferIndicator = document.getElementById('bufferIndicator');

        // Video title bar
        this.videoTitleBar = document.getElementById('videoTitleBar');
        this.videoTitle = document.getElementById('videoTitle');
        
        // Controls
        this.controls = document.getElementById('controls');
        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.bigPlayBtn = document.getElementById('bigPlayBtn');
        this.skipBackBtn = document.getElementById('skipBackBtn');
        this.skipForwardBtn = document.getElementById('skipForwardBtn');
        this.muteBtn = document.getElementById('muteBtn');
        this.volumeSlider = document.getElementById('volumeSlider');
        this.volumeFill = document.getElementById('volumeFill');
        this.fullscreenBtn = document.getElementById('fullscreenBtn');
        this.pipBtn = document.getElementById('pipBtn');

        // Audio track controls
        this.audioContainer = document.getElementById('audioContainer');
        this.audioBtn = document.getElementById('audioBtn');
        this.audioMenu = document.getElementById('audioMenu');
        this.audioList = document.getElementById('audioList');

        // Quality controls
        this.qualityContainer = document.getElementById('qualityContainer');
        this.qualityBtn = document.getElementById('qualityBtn');
        this.qualityMenu = document.getElementById('qualityMenu');
        this.qualityList = document.getElementById('qualityList');

        // Subtitle controls
        this.subtitleContainer = document.getElementById('subtitleContainer');
        this.subtitleBtn = document.getElementById('subtitleBtn');
        this.subtitleMenu = document.getElementById('subtitleMenu');
        this.subtitleList = document.getElementById('subtitleList');
        this.loadSubtitleBtn = document.getElementById('loadSubtitleBtn');
        this.subtitleFileInput = document.getElementById('subtitleFileInput');

        // Download
        this.downloadBtn = document.getElementById('downloadBtn');
        this.speedBtn = document.getElementById('speedBtn');
        this.speedMenu = document.getElementById('speedMenu');
        this.speedValue = document.getElementById('speedValue');
        this.retryBtn = document.getElementById('retryBtn');
        
        // Progress
        this.progressContainer = document.getElementById('progressContainer');
        this.progressBuffer = document.getElementById('progressBuffer');
        this.progressPlayed = document.getElementById('progressPlayed');
        this.progressThumb = document.getElementById('progressThumb');
        this.progressTooltip = document.getElementById('progressTooltip');
        
        // Time Display
        this.currentTimeEl = document.getElementById('currentTime');
        this.durationEl = document.getElementById('duration');
        this.timeDisplay = document.getElementById('timeDisplay');
        this.timeInputWrapper = document.getElementById('timeInputWrapper');
        this.timeInput = document.getElementById('timeInput');
        this.timeGoBtn = document.getElementById('timeGoBtn');
        
        // Stats
        this.bufferPercent = document.getElementById('bufferPercent');
        this.networkSpeed = document.getElementById('networkSpeed');
        
        // Shortcuts Modal
        this.shortcutsModal = document.getElementById('shortcutsModal');
        this.closeShortcuts = document.getElementById('closeShortcuts');

        // Theme toggle
        this.themeToggle = document.getElementById('themeToggle');
        
        // State
        this.isPlaying = false;
        this.isMuted = false;
        this.isFullscreen = false;
        this.controlsTimeout = null;
        this.cursorTimeout = null;
        this.lastVolume = 1;
        this.currentUrl = '';
        this.loadStartTime = 0;
        this.bytesLoaded = 0;
        
        // Buffer Management
        this.bufferCheckInterval = null;
        this.targetBufferAhead = 60; // seconds to buffer ahead
        this.historyBufferRatio = 0.10; // 10% of watched video as history buffer
        this.maxWatchedPosition = 0; // track furthest watched position
        this.bufferRanges = []; // store all buffer ranges for visualization
        
        // Network speed tracking
        this.lastBufferTime = 0;
        this.lastBufferedAmount = 0;
        this.networkSpeedSamples = [];
        this.maxSpeedSamples = 10; // rolling average of last 10 samples
        
        // Range request support detection
        this.supportsRangeRequests = null; // null = unknown, true/false after check
        this.rangeRequestChecked = false;

        // Streaming-library instances (for HLS/DASH audio-track handling)
        this.hls = null;       // hls.js instance, when used
        this.dashPlayer = null; // dash.js instance, when used

        // Track management
        this.externalSubtitleUrls = []; // blob URLs created for external subtitles (for cleanup)
        this.downloadAbortController = null; // allows cancelling an in-progress download
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.setupVideoEvents();
        this.updateVolumeUI();
        this.initTheme();
        
        // Focus input on load
        this.urlInput.focus();
        
        // Check for URL in query params
        const params = new URLSearchParams(window.location.search);
        const videoUrl = params.get('url');
        if (videoUrl) {
            this.urlInput.value = decodeURIComponent(videoUrl);
            this.loadVideo();
        }
    }

    // --- Theme (light / dark) -------------------------------------------------
    initTheme() {
        // The no-flash inline script in <head> already set data-theme before
        // paint; mirror that value into state so the toggle stays in sync.
        this.theme = document.documentElement.getAttribute('data-theme') || 'light';
        this.applyTheme(this.theme);
    }

    applyTheme(theme) {
        this.theme = theme === 'dark' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', this.theme);
        if (this.themeToggle) {
            const isDark = this.theme === 'dark';
            const label = isDark ? 'Switch to light mode (T)' : 'Switch to dark mode (T)';
            this.themeToggle.setAttribute('title', label);
            this.themeToggle.setAttribute('aria-label', label);
            this.themeToggle.setAttribute('aria-pressed', String(isDark));
        }
    }

    toggleTheme() {
        const next = this.theme === 'dark' ? 'light' : 'dark';
        this.applyTheme(next);
        try {
            localStorage.setItem('lumen-theme', next);
        } catch (e) {
            // localStorage unavailable (private mode / disabled) — theme still
            // applies for the session, it just won't persist.
        }
    }
    
    bindEvents() {
        // URL Input
        this.loadBtn.addEventListener('click', () => this.loadVideo());
        this.urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.loadVideo();
        });
        this.backBtn.addEventListener('click', () => this.showUrlSection());
        this.retryBtn.addEventListener('click', () => this.loadVideo());

        // Theme toggle
        if (this.themeToggle) {
            this.themeToggle.addEventListener('click', () => this.toggleTheme());
        }
        
        // Play Controls
        this.playPauseBtn.addEventListener('click', () => this.togglePlay());
        this.bigPlayBtn.addEventListener('click', () => this.togglePlay());
        this.skipBackBtn.addEventListener('click', () => this.skip(-10));
        this.skipForwardBtn.addEventListener('click', () => this.skip(10));
        
        // Volume
        this.muteBtn.addEventListener('click', () => this.toggleMute());
        this.volumeSlider.addEventListener('input', (e) => this.setVolume(e.target.value));
        
        // Progress Bar
        this.progressContainer.addEventListener('click', (e) => this.seek(e));
        this.progressContainer.addEventListener('mousemove', (e) => this.updateTooltip(e));
        
        // Add drag support for progress bar
        let isDragging = false;
        this.progressContainer.addEventListener('mousedown', (e) => {
            isDragging = true;
            this.seek(e);
        });
        
        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                this.seek(e);
            }
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
        
        // Fullscreen & PiP
        this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        this.pipBtn.addEventListener('click', () => this.togglePiP());

        // Audio track menu
        this.audioBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.audioBtn.disabled) return; // greyed out when only one track
            this.subtitleMenu.classList.remove('active');
            this.qualityMenu.classList.remove('active');
            this.audioMenu.classList.toggle('active');
        });
        this.audioMenu.addEventListener('click', (e) => e.stopPropagation());

        // Quality menu
        this.qualityBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.qualityBtn.disabled) return; // greyed out when only one level
            this.audioMenu.classList.remove('active');
            this.subtitleMenu.classList.remove('active');
            this.qualityMenu.classList.toggle('active');
        });
        this.qualityMenu.addEventListener('click', (e) => e.stopPropagation());

        // Subtitle menu
        this.subtitleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.audioMenu.classList.remove('active');
            this.subtitleMenu.classList.toggle('active');
        });
        this.subtitleMenu.addEventListener('click', (e) => e.stopPropagation());
        this.loadSubtitleBtn.addEventListener('click', () => this.subtitleFileInput.click());
        this.subtitleFileInput.addEventListener('change', (e) => this.handleSubtitleFile(e));

        // Close track menus when clicking outside
        document.addEventListener('click', () => {
            this.audioMenu.classList.remove('active');
            this.subtitleMenu.classList.remove('active');
            this.qualityMenu.classList.remove('active');
        });

        // Download
        this.downloadBtn.addEventListener('click', () => this.downloadVideo());
        
        // Time Input - click time display to show input
        this.timeDisplay.addEventListener('click', () => this.showTimeInput());
        this.timeGoBtn.addEventListener('click', () => this.jumpToInputTime());
        this.timeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.jumpToInputTime();
        });
        this.timeInput.addEventListener('blur', () => {
            // Hide input after a short delay (allows clicking Go button)
            setTimeout(() => this.hideTimeInput(), 200);
        });
        
        // Speed Menu
        this.speedBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.speedMenu.classList.toggle('active');
        });
        
        document.querySelectorAll('.speed-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const speed = parseFloat(e.target.dataset.speed);
                this.setPlaybackSpeed(speed);
            });
        });
        
        // Custom speed input
        const customSpeedInput = document.getElementById('customSpeedInput');
        const customSpeedBtn = document.getElementById('customSpeedBtn');
        
        if (customSpeedBtn && customSpeedInput) {
            customSpeedBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const speed = parseFloat(customSpeedInput.value);
                if (speed >= 0.1 && speed <= 100) {
                    this.setPlaybackSpeed(speed);
                    customSpeedInput.value = '';
                }
            });
            
            customSpeedInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.stopPropagation();
                    const speed = parseFloat(customSpeedInput.value);
                    if (speed >= 0.1 && speed <= 100) {
                        this.setPlaybackSpeed(speed);
                        customSpeedInput.value = '';
                    }
                }
            });
            
            customSpeedInput.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
        
        // Close speed menu when clicking outside
        document.addEventListener('click', () => {
            this.speedMenu.classList.remove('active');
        });
        
        // Shortcuts Modal
        this.closeShortcuts.addEventListener('click', () => {
            this.shortcutsModal.classList.remove('active');
        });
        
        // Keyboard Shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
        
        // Controls visibility
        this.playerContainer.addEventListener('mousemove', () => this.showControls());
        this.playerContainer.addEventListener('mouseleave', () => this.hideControls());
        
        // Click to play/pause
        this.video.addEventListener('click', () => this.togglePlay());
        
        // Double-click to fullscreen
        this.video.addEventListener('dblclick', () => this.toggleFullscreen());
        
        // Fullscreen change
        document.addEventListener('fullscreenchange', () => this.onFullscreenChange());
        document.addEventListener('webkitfullscreenchange', () => this.onFullscreenChange());
    }
    
    setupVideoEvents() {
        // Loading states
        this.video.addEventListener('loadstart', () => {
            this.loadStartTime = Date.now();
            this.maxWatchedPosition = 0; // Reset watched position
            this.bufferRanges = [];
            this.showLoading();
        });
        
        this.video.addEventListener('loadedmetadata', () => {
            // Clear load timeout
            if (this.loadTimeout) {
                clearTimeout(this.loadTimeout);
                this.loadTimeout = null;
            }
            
            this.durationEl.textContent = this.formatTime(this.video.duration);
            this.hideLoading();
            // Start buffer management once we have metadata
            this.startBufferManagement();
            // Initialize speed status
            this.updateSpeedStatus();
            // Detect available audio tracks and subtitles
            this.refreshAudioTracks();
            this.refreshSubtitleTracks();

            console.log(`Video loaded: ${this.formatTime(this.video.duration)} duration`);
        });
        
        this.video.addEventListener('canplay', () => {
            this.hideLoading();
            this.playOverlay.classList.remove('hidden');
        });
        
        this.video.addEventListener('canplaythrough', () => {
            this.hideLoading();
        });
        
        this.video.addEventListener('waiting', () => {
            this.showLoading();
        });
        
        this.video.addEventListener('playing', () => {
            this.hideLoading();
            this.isPlaying = true;
            this.playerContainer.classList.add('playing');
            this.playOverlay.classList.add('hidden');
        });
        
        this.video.addEventListener('pause', () => {
            this.isPlaying = false;
            this.playerContainer.classList.remove('playing');
            // Continue buffering even when paused - browser handles this
            // but we update the UI to show buffer progress
            this.updateBuffer();
        });
        
        this.video.addEventListener('ended', () => {
            this.isPlaying = false;
            this.playerContainer.classList.remove('playing');
            this.playOverlay.classList.remove('hidden');
        });
        
        // Time update
        this.video.addEventListener('timeupdate', () => {
            this.updateProgress();
            // Track max watched position for history buffer
            if (this.video.currentTime > this.maxWatchedPosition) {
                this.maxWatchedPosition = this.video.currentTime;
            }
        });
        
        // Buffer progress - fires when browser downloads more data
        this.video.addEventListener('progress', () => this.updateBuffer());
        
        // Also update buffer on seeking
        this.video.addEventListener('seeked', () => {
            this.updateBuffer();
        });
        
        // Error handling
        this.video.addEventListener('error', (e) => this.handleError(e));
        
        // Volume change
        this.video.addEventListener('volumechange', () => this.updateVolumeUI());

        // Audio / subtitle tracks can appear or change after metadata loads
        if (this.video.audioTracks) {
            this.video.audioTracks.addEventListener('addtrack', () => this.refreshAudioTracks());
            this.video.audioTracks.addEventListener('removetrack', () => this.refreshAudioTracks());
            this.video.audioTracks.addEventListener('change', () => this.refreshAudioTracks());
        }
        if (this.video.textTracks) {
            this.video.textTracks.addEventListener('addtrack', () => this.refreshSubtitleTracks());
            this.video.textTracks.addEventListener('removetrack', () => this.refreshSubtitleTracks());
            this.video.textTracks.addEventListener('change', () => this.refreshSubtitleTracks());
        }
    }
    
    loadVideo() {
        let url = this.urlInput.value.trim();
        if (!url) {
            this.urlInput.focus();
            return;
        }
        
        // Check if proxy should be used
        const useProxy = this.useProxyCheckbox && this.useProxyCheckbox.checked;
        if (useProxy) {
            // Use local proxy server (run server.js with node)
            url = `http://localhost:4000/proxy?url=${encodeURIComponent(url)}`;
            console.log('🔄 Using local proxy server for URL');
        }
        
        this.currentUrl = url;
        this.originalUrl = this.urlInput.value.trim(); // Store original for display
        this.hideError();
        this.showPlayerSection();
        this.setVideoTitle();
        this.showLoading();

        // Tear down any previous streaming-library instance before loading anew
        this.destroyStreamingInstances();
        // Reset the audio menu to its disabled state until the new source
        // reports its tracks (the button stays visible, just greyed out).
        this.setAudioMenuEnabled(false);
        // Same for the quality menu.
        this.setQualityMenuEnabled(false);
        
        // Reset network speed tracking
        this.lastBufferTime = 0;
        this.lastBufferedAmount = 0;
        this.networkSpeedSamples = [];
        this.loadStartTime = Date.now();
        
        // Reset CORS retry flags
        this.triedWithoutCors = false;
        this.triedWithCors = false;
        this.rangeRequestChecked = false;
        
        // Check if HLS stream
        if (url.includes('.m3u8')) {
            this.loadHLS(url);
        } else if (url.includes('.mpd')) {
            this.loadDASH(url);
        } else {
            // Direct video URL - try loading with best settings for streaming
            this.loadDirectVideo(url);
        }
        
        // Update URL params
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('url', encodeURIComponent(url));
        window.history.replaceState({}, '', newUrl);
    }
    
    async loadDirectVideo(url) {
        // Reset video element for fresh load
        this.video.pause();
        this.video.removeAttribute('src');
        this.video.load();
        
        // Configure for streaming
        this.video.preload = 'auto';
        
        // Check if it's a Google URL (they have specific requirements)
        const isGoogleUrl = url.includes('googleusercontent.com') || 
                           url.includes('googlevideo.com') ||
                           url.includes('google.com');
        
        if (isGoogleUrl) {
            console.log('🔗 Detected Google video URL - may expire after a few hours');
            // Google URLs work better without crossorigin attribute
            this.video.removeAttribute('crossorigin');
        }
        
        // Check if server supports Range requests (for seeking)
        if (!this.rangeRequestChecked) {
            this.checkRangeRequestSupport(url);
        }
        
        // Set the source and load
        this.video.src = url;
        this.video.load();
        
        // Add timeout for stuck loading
        this.loadTimeout = setTimeout(() => {
            if (this.video.readyState < 2) { // HAVE_CURRENT_DATA
                console.warn('Video loading is taking too long...');
                // Try without any special attributes
                this.video.removeAttribute('crossorigin');
                this.video.load();
            }
        }, 10000); // 10 second timeout
    }
    
    async checkRangeRequestSupport(url) {
        this.rangeRequestChecked = true;
        
        try {
            const response = await fetch(url, {
                method: 'HEAD',
                mode: 'cors'
            });
            
            const acceptRanges = response.headers.get('Accept-Ranges');
            const contentLength = response.headers.get('Content-Length');
            
            this.supportsRangeRequests = acceptRanges === 'bytes';
            
            if (this.supportsRangeRequests) {
                console.log(`✅ Server supports Range requests (byte-seeking enabled)`);
                if (contentLength) {
                    const sizeMB = (parseInt(contentLength) / 1024 / 1024).toFixed(1);
                    console.log(`📦 File size: ${sizeMB} MB`);
                }
            } else {
                console.warn(`⚠️ Server doesn't support Range requests - seeking may require re-download`);
                this.showRangeWarning();
            }
        } catch (error) {
            console.warn('Could not check Range request support:', error.message);
            // Assume it works - browser will handle it
            this.supportsRangeRequests = true;
        }
    }
    
    showRangeWarning() {
        // Show a subtle warning that seeking might not work well
        const warning = document.createElement('div');
        warning.className = 'range-warning';
        warning.innerHTML = `
            <span>⚠️ This video may not support seeking to unbuffered positions</span>
        `;
        warning.style.cssText = `
            position: absolute;
            top: 70px;
            right: 20px;
            padding: 10px 16px;
            background: rgba(255, 165, 0, 0.9);
            color: #000;
            border-radius: 8px;
            font-size: 0.85rem;
            z-index: 20;
            animation: slideInRight 0.3s ease, fadeOut 0.3s ease 4s forwards;
        `;
        
        this.playerContainer.appendChild(warning);
        
        setTimeout(() => {
            warning.remove();
        }, 5000);
    }
    
    loadHLS(url) {
        const nativeHls = this.video.canPlayType('application/vnd.apple.mpegurl');
        const hlsJsSupported = typeof Hls !== 'undefined' && Hls.isSupported();

        // Prefer hls.js whenever it is supported. It provides a consistent
        // audio/subtitle-track API across browsers, whereas native HLS (notably
        // in Chrome/Edge) often plays the stream but does NOT expose
        // video.audioTracks — which is why the audio menu stayed disabled.
        // Native HLS is used only as a fallback (mainly Safari/iOS).
        if (hlsJsSupported) {
            // Use hls.js
            const hls = new Hls({
                maxBufferLength: 60,
                maxMaxBufferLength: 120,
                maxBufferSize: 60 * 1000 * 1000, // 60MB
                maxBufferHole: 0.5,
            });
            this.hls = hls;
            hls.loadSource(url);
            hls.attachMedia(this.video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                this.hideLoading();
                // hls.js exposes alternate audio through its own API, not
                // video.audioTracks — surface it in the menu.
                this.refreshAudioTracks();
                this.refreshQualityLevels();
            });
            // Keep the menu in sync when hls.js adds/switches audio tracks.
            hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, () => this.refreshAudioTracks());
            hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, () => this.refreshAudioTracks());
            // Keep the quality menu in sync as levels load / switch.
            hls.on(Hls.Events.LEVEL_SWITCHED, () => this.refreshQualityLevels());
            hls.on(Hls.Events.ERROR, (event, data) => {
                if (data.fatal) {
                    this.showError('HLS stream error: ' + data.type);
                }
            });
        } else if (nativeHls) {
            // Native HLS fallback (Safari / iOS)
            this.video.src = url;
            this.video.load();
        } else {
            this.showError('HLS playback not supported. Please use Safari or add hls.js library.');
        }
    }
    
    loadDASH(url) {
        if (typeof dashjs !== 'undefined') {
            const player = dashjs.MediaPlayer().create();
            this.dashPlayer = player;
            player.initialize(this.video, url, false);
            player.updateSettings({
                streaming: {
                    buffer: {
                        fastSwitchEnabled: true,
                        bufferTimeAtTopQuality: 30,
                        bufferTimeAtTopQualityLongForm: 60,
                    }
                }
            });
            // dash.js manages audio tracks through its own API — refresh the
            // menu once streams are known.
            const refresh = () => this.refreshAudioTracks();
            player.on(dashjs.MediaPlayer.events.STREAM_INITIALIZED, refresh);
            player.on(dashjs.MediaPlayer.events.TRACK_CHANGE_RENDERED, refresh);
            // Quality levels are also known after stream init / on switch.
            const refreshQuality = () => this.refreshQualityLevels();
            player.on(dashjs.MediaPlayer.events.STREAM_INITIALIZED, refreshQuality);
            player.on(dashjs.MediaPlayer.events.QUALITY_CHANGE_RENDERED, refreshQuality);
        } else {
            this.showError('DASH playback requires dash.js library.');
        }
    }
    
    togglePlay() {
        if (this.video.paused) {
            this.video.play().catch(e => {
                console.error('Play error:', e);
            });
        } else {
            this.video.pause();
        }
    }
    
    skip(seconds) {
        const newTime = this.video.currentTime + seconds;
        this.seekToTime(newTime);
        
        // Show seek indicator
        this.showSeekIndicator(seconds);
    }
    
    showSeekIndicator(seconds) {
        // Create indicator if doesn't exist
        let indicator = document.querySelector(`.seek-indicator.${seconds < 0 ? 'left' : 'right'}`);
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = `seek-indicator ${seconds < 0 ? 'left' : 'right'}`;
            this.playerContainer.appendChild(indicator);
        }
        
        indicator.textContent = `${seconds > 0 ? '+' : ''}${seconds}s`;
        indicator.classList.remove('active');
        void indicator.offsetWidth; // Force reflow
        indicator.classList.add('active');
    }
    
    seek(e) {
        const rect = this.progressContainer.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        const clampedPos = Math.max(0, Math.min(1, pos));
        this.seekToTime(clampedPos * this.video.duration);
    }
    
    seekToTime(targetTime) {
        if (!this.video.duration) return;

        // Preserve playback state across the seek. Seeking into an unbuffered
        // region can make the browser stall/drop out of "playing" while it
        // re-fetches data; capture the intent so we can resume afterward.
        const wasPlaying = !this.video.paused && !this.video.ended;
        
        // Check if target is within buffered range
        const isBuffered = this.isTimeBuffered(targetTime);
        
        if (!isBuffered) {
            // Show loading indicator for unbuffered seek
            this.showLoading();
            
            const timeStr = this.formatTime(targetTime);
            
            if (this.supportsRangeRequests === false) {
                console.warn(`⚠️ Seeking to ${timeStr} - server may not support Range requests`);
            } else {
                console.log(`🎯 Seeking to ${timeStr} - requesting chunk via HTTP Range header`);
            }
            
            // For Google URLs, add a note
            const isGoogleUrl = this.currentUrl.includes('googleusercontent.com');
            if (isGoogleUrl && !isBuffered) {
                console.log(`📥 Note: Google URLs support seeking, but may expire soon`);
            }
        }
        
        this.video.currentTime = Math.max(0, Math.min(targetTime, this.video.duration));

        // If it was playing before the seek, make sure it keeps playing.
        if (wasPlaying) {
            const resume = () => {
                const p = this.video.play();
                if (p && typeof p.catch === 'function') p.catch(() => {});
            };
            // Resume once the seek finishes; also try immediately in case the
            // seek completes synchronously (target already buffered).
            this.video.addEventListener('seeked', resume, { once: true });
            resume();
        }
    }
    
    isTimeBuffered(time) {
        for (let i = 0; i < this.video.buffered.length; i++) {
            if (time >= this.video.buffered.start(i) && time <= this.video.buffered.end(i)) {
                return true;
            }
        }
        return false;
    }
    
    // Seek to a specific percentage (0-100)
    seekToPercent(percent) {
        if (!this.video.duration) return;
        const targetTime = (percent / 100) * this.video.duration;
        this.seekToTime(targetTime);
    }
    
    // Time input methods
    showTimeInput() {
        this.timeDisplay.style.display = 'none';
        this.timeInputWrapper.style.display = 'flex';
        this.timeInput.value = '';
        this.timeInput.placeholder = this.formatTime(this.video.currentTime);
        this.timeInput.focus();
    }
    
    hideTimeInput() {
        this.timeInputWrapper.style.display = 'none';
        this.timeDisplay.style.display = '';
    }
    
    jumpToInputTime() {
        const input = this.timeInput.value.trim();
        if (!input) {
            this.hideTimeInput();
            return;
        }
        
        const seconds = this.parseTimeInput(input);
        if (seconds !== null && seconds >= 0 && seconds <= this.video.duration) {
            this.seekToTime(seconds);
            this.hideTimeInput();
        } else {
            // Invalid input - shake the input
            this.timeInput.style.animation = 'shake 0.3s ease';
            setTimeout(() => {
                this.timeInput.style.animation = '';
            }, 300);
        }
    }
    
    parseTimeInput(input) {
        // Support formats: "1:30", "1:30:00", "90", "1h30m", "90s"
        input = input.toLowerCase().trim();
        
        // Try HH:MM:SS or MM:SS format
        if (input.includes(':')) {
            const parts = input.split(':').map(p => parseInt(p) || 0);
            if (parts.length === 2) {
                // MM:SS
                return parts[0] * 60 + parts[1];
            } else if (parts.length === 3) {
                // HH:MM:SS
                return parts[0] * 3600 + parts[1] * 60 + parts[2];
            }
        }
        
        // Try human readable format: 1h30m, 90s, 1h, 30m
        let totalSeconds = 0;
        const hourMatch = input.match(/(\d+)\s*h/);
        const minMatch = input.match(/(\d+)\s*m/);
        const secMatch = input.match(/(\d+)\s*s/);
        
        if (hourMatch || minMatch || secMatch) {
            if (hourMatch) totalSeconds += parseInt(hourMatch[1]) * 3600;
            if (minMatch) totalSeconds += parseInt(minMatch[1]) * 60;
            if (secMatch) totalSeconds += parseInt(secMatch[1]);
            return totalSeconds;
        }
        
        // Try plain number (seconds)
        const num = parseInt(input);
        if (!isNaN(num)) {
            return num;
        }
        
        return null;
    }
    
    updateTooltip(e) {
        const rect = this.progressContainer.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        const clampedPos = Math.max(0, Math.min(1, pos));
        const time = clampedPos * this.video.duration;
        
        this.progressTooltip.textContent = this.formatTime(time);
        this.progressTooltip.style.left = `${clampedPos * 100}%`;
    }
    
    updateProgress() {
        if (!this.video.duration) return;
        
        const progress = (this.video.currentTime / this.video.duration) * 100;
        this.progressPlayed.style.width = `${progress}%`;
        this.progressThumb.style.left = `${progress}%`;
        this.currentTimeEl.textContent = this.formatTime(this.video.currentTime);
    }
    
    updateBuffer() {
        if (!this.video.duration || this.video.buffered.length === 0) return;
        
        const duration = this.video.duration;
        const currentTime = this.video.currentTime;
        const now = Date.now();
        
        // Track max watched position for history buffer calculation
        if (currentTime > this.maxWatchedPosition) {
            this.maxWatchedPosition = currentTime;
        }
        
        // Collect all buffer ranges
        this.bufferRanges = [];
        for (let i = 0; i < this.video.buffered.length; i++) {
            this.bufferRanges.push({
                start: this.video.buffered.start(i),
                end: this.video.buffered.end(i)
            });
        }
        
        // Find buffer range containing current time
        let currentBufferEnd = currentTime;
        let currentBufferStart = currentTime;
        for (const range of this.bufferRanges) {
            if (currentTime >= range.start && currentTime <= range.end) {
                currentBufferEnd = range.end;
                currentBufferStart = range.start;
                break;
            }
        }
        
        // Calculate buffer ahead (from current position)
        const bufferAhead = currentBufferEnd - currentTime;
        
        // Calculate history buffer (from start of current buffer range)
        const historyBuffer = currentTime - currentBufferStart;
        
        // Calculate total buffered seconds
        let totalBuffered = 0;
        for (const range of this.bufferRanges) {
            totalBuffered += range.end - range.start;
        }
        
        // Update visual buffer bar - show the continuous buffer range around current position
        const bufferStartPercent = (currentBufferStart / duration) * 100;
        const bufferEndPercent = (currentBufferEnd / duration) * 100;
        
        this.progressBuffer.style.left = `${bufferStartPercent}%`;
        this.progressBuffer.style.width = `${bufferEndPercent - bufferStartPercent}%`;
        
        // Update stats display
        const aheadSeconds = Math.round(bufferAhead);
        this.bufferPercent.textContent = `${aheadSeconds}s ahead`;
        
        // Calculate real-time network speed using rolling average
        this.calculateNetworkSpeed(totalBuffered, now);
    }
    
    calculateNetworkSpeed(totalBuffered, now) {
        // Initialize on first call
        if (this.lastBufferTime === 0) {
            this.lastBufferTime = now;
            this.lastBufferedAmount = totalBuffered;
            return;
        }
        
        // Calculate speed based on buffer change over time
        const timeDelta = (now - this.lastBufferTime) / 1000; // seconds
        const bufferDelta = totalBuffered - this.lastBufferedAmount; // seconds of video
        
        if (timeDelta > 0.3) { // Update every 300ms minimum
            // Estimate bitrate: assume average video bitrate
            // For typical HD video: ~5 Mbps, 4K: ~15 Mbps, SD: ~2 Mbps
            const estimatedBitrate = 5000000; // 5 Mbps default assumption
            
            // bytes downloaded = seconds of video * (bitrate / 8)
            const bytesDownloaded = bufferDelta * (estimatedBitrate / 8);
            const speedBps = bytesDownloaded / timeDelta; // bytes per second
            
            if (bufferDelta > 0.1) {
                // Add to rolling average
                this.networkSpeedSamples.push(speedBps);
                if (this.networkSpeedSamples.length > this.maxSpeedSamples) {
                    this.networkSpeedSamples.shift();
                }
                
                // Calculate average speed
                const avgSpeed = this.networkSpeedSamples.reduce((a, b) => a + b, 0) / this.networkSpeedSamples.length;
                this.displayNetworkSpeed(avgSpeed);
            } else if (timeDelta > 2) {
                // No recent buffering activity
                const isFullyBuffered = totalBuffered >= this.video.duration - 1;
                if (isFullyBuffered) {
                    this.networkSpeed.textContent = 'Complete';
                    this.networkSpeed.style.color = 'var(--accent-primary)';
                } else {
                    this.networkSpeed.textContent = 'Waiting...';
                    this.networkSpeed.style.color = 'var(--text-tertiary)';
                }
            }
            
            // Update tracking
            this.lastBufferTime = now;
            this.lastBufferedAmount = totalBuffered;
        }
    }
    
    displayNetworkSpeed(bytesPerSecond) {
        this.networkSpeed.style.color = ''; // Reset to default color
        
        if (bytesPerSecond >= 1000000) {
            this.networkSpeed.textContent = `${(bytesPerSecond / 1000000).toFixed(1)} MB/s`;
        } else if (bytesPerSecond >= 1000) {
            this.networkSpeed.textContent = `${(bytesPerSecond / 1000).toFixed(0)} KB/s`;
        } else if (bytesPerSecond > 0) {
            this.networkSpeed.textContent = `${Math.round(bytesPerSecond)} B/s`;
        }
    }
    
    // Update speed status when not actively buffering
    updateSpeedStatus() {
        if (!this.video.duration) return;
        
        // Calculate total buffered
        let totalBuffered = 0;
        for (let i = 0; i < this.video.buffered.length; i++) {
            totalBuffered += this.video.buffered.end(i) - this.video.buffered.start(i);
        }
        
        const isFullyBuffered = totalBuffered >= this.video.duration - 1;
        const bufferPercent = Math.round((totalBuffered / this.video.duration) * 100);
        
        // Update based on current state
        if (isFullyBuffered) {
            this.networkSpeed.textContent = 'Complete';
            this.networkSpeed.style.color = 'var(--accent-primary)';
            this.bufferIndicator.classList.remove('active');
        } else if (this.networkSpeedSamples.length === 0) {
            // No speed data yet, show buffer progress
            this.networkSpeed.textContent = `${bufferPercent}% loaded`;
            this.networkSpeed.style.color = '';
        }
    }
    
    // Smart buffer management - continues buffering when paused
    startBufferManagement() {
        // Clear any existing interval
        if (this.bufferCheckInterval) {
            clearInterval(this.bufferCheckInterval);
        }
        
        // Check buffer status every 500ms
        this.bufferCheckInterval = setInterval(() => {
            this.manageBuffer();
        }, 500);
    }
    
    stopBufferManagement() {
        if (this.bufferCheckInterval) {
            clearInterval(this.bufferCheckInterval);
            this.bufferCheckInterval = null;
        }
    }
    
    manageBuffer() {
        if (!this.video.duration || !this.video.src) return;
        
        const currentTime = this.video.currentTime;
        const duration = this.video.duration;
        
        // Calculate required history buffer (10% of max watched position)
        const requiredHistoryBuffer = this.maxWatchedPosition * this.historyBufferRatio;
        
        // Find current buffer range
        let bufferAhead = 0;
        let bufferBehind = 0;
        let totalBuffered = 0;
        
        for (let i = 0; i < this.video.buffered.length; i++) {
            const start = this.video.buffered.start(i);
            const end = this.video.buffered.end(i);
            totalBuffered += end - start;
            
            if (currentTime >= start && currentTime <= end) {
                bufferAhead = end - currentTime;
                bufferBehind = currentTime - start;
            }
        }
        
        // Check if still buffering (not fully loaded)
        const isFullyBuffered = totalBuffered >= duration - 0.5;
        const needsMoreBuffer = bufferAhead < this.targetBufferAhead && !isFullyBuffered;
        
        // Show buffer indicator when paused and still buffering
        if (this.video.paused && needsMoreBuffer && !this.loadingOverlay.classList.contains('active')) {
            this.bufferIndicator.classList.add('active');
            this.encourageBuffering();
        } else {
            this.bufferIndicator.classList.remove('active');
        }
        
        // Update UI with buffer health indicator
        this.updateBufferHealth(bufferAhead, bufferBehind, requiredHistoryBuffer);
        
        // Update speed status display
        this.updateSpeedStatus();
    }
    
    encourageBuffering() {
        // Browsers automatically buffer when video is loaded
        // We ensure preload is set to auto for aggressive buffering
        if (this.video.preload !== 'auto') {
            this.video.preload = 'auto';
        }
        
        // Some browsers buffer more when we access buffered property
        // This is a hint to the browser that we care about buffering
        if (this.video.buffered.length > 0) {
            const lastBufferedEnd = this.video.buffered.end(this.video.buffered.length - 1);
            // Log buffer status for debugging
            console.debug(`Buffer: ${lastBufferedEnd.toFixed(1)}s / ${this.video.duration.toFixed(1)}s`);
        }
    }
    
    updateBufferHealth(ahead, behind, requiredHistory) {
        // Visual indicator of buffer health
        const bufferStat = document.getElementById('bufferStat');
        
        if (ahead >= 30) {
            bufferStat.classList.remove('warning', 'critical');
            bufferStat.classList.add('healthy');
        } else if (ahead >= 10) {
            bufferStat.classList.remove('healthy', 'critical');
            bufferStat.classList.add('warning');
        } else {
            bufferStat.classList.remove('healthy', 'warning');
            bufferStat.classList.add('critical');
        }
    }
    
    toggleMute() {
        if (this.video.muted) {
            this.video.muted = false;
            this.video.volume = this.lastVolume || 1;
        } else {
            this.lastVolume = this.video.volume;
            this.video.muted = true;
        }
    }
    
    setVolume(value) {
        this.video.volume = value;
        this.video.muted = value == 0;
        this.updateVolumeUI();
    }
    
    updateVolumeUI() {
        const volume = this.video.muted ? 0 : this.video.volume;
        const container = this.muteBtn.closest('.volume-container');
        
        this.volumeSlider.value = volume;
        this.volumeFill.style.width = `${volume * 100}%`;
        
        container.classList.remove('low', 'muted');
        if (volume === 0 || this.video.muted) {
            container.classList.add('muted');
        } else if (volume < 0.5) {
            container.classList.add('low');
        }
    }
    
    setPlaybackSpeed(speed) {
        try {
            this.video.playbackRate = speed;
            this.speedValue.textContent = `${speed}x`;
            
            document.querySelectorAll('.speed-option').forEach(option => {
                option.classList.toggle('active', parseFloat(option.dataset.speed) === speed);
            });
            
            this.speedMenu.classList.remove('active');
        } catch (error) {
            // Browser doesn't support this playback rate
            console.warn(`Playback rate ${speed}x not supported:`, error.message);
            this.showSpeedWarning(speed);
        }
    }
    
    showSpeedWarning(speed) {
        // Show temporary warning
        const warning = document.createElement('div');
        warning.className = 'speed-warning';
        warning.innerHTML = `⚠️ ${speed}x not supported. Browser limit: 0.0625x - 16x`;
        
        this.playerContainer.appendChild(warning);
        
        setTimeout(() => {
            warning.classList.add('fade-out');
            setTimeout(() => warning.remove(), 300);
        }, 2500);
    }
    
    toggleFullscreen() {
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
            if (this.playerContainer.requestFullscreen) {
                this.playerContainer.requestFullscreen();
            } else if (this.playerContainer.webkitRequestFullscreen) {
                this.playerContainer.webkitRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }
        }
    }
    
    onFullscreenChange() {
        this.isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement);
        this.playerContainer.classList.toggle('fullscreen', this.isFullscreen);
    }
    
    async togglePiP() {
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            } else if (document.pictureInPictureEnabled) {
                await this.video.requestPictureInPicture();
            }
        } catch (e) {
            console.error('PiP error:', e);
        }
    }

    // ========================================
    // Audio Track Switching
    // ========================================
    destroyStreamingInstances() {
        // Clean up hls.js
        if (this.hls) {
            try { this.hls.destroy(); } catch (e) { /* ignore */ }
            this.hls = null;
        }
        // Clean up dash.js
        if (this.dashPlayer) {
            try { this.dashPlayer.reset(); } catch (e) { /* ignore */ }
            this.dashPlayer = null;
        }
    }

    refreshAudioTracks() {
        // The audio button is ALWAYS visible. It is enabled only when there are
        // multiple selectable audio tracks; otherwise it is shown greyed/disabled
        // so users can see the control exists.
        //
        // Tracks come from one of three sources depending on playback mode:
        //   1. hls.js   — hls.audioTracks / hls.audioTrack (HLS in non-Safari)
        //   2. dash.js  — getTracksFor('audio') / setCurrentTrack (DASH)
        //   3. native   — video.audioTracks (Safari HLS, some MP4 containers)
        if (this.hls && Array.isArray(this.hls.audioTracks) && this.hls.audioTracks.length > 1) {
            this.renderHlsAudioTracks();
            return;
        }
        if (this.dashPlayer && typeof this.dashPlayer.getTracksFor === 'function') {
            const dashTracks = this.dashPlayer.getTracksFor('audio') || [];
            if (dashTracks.length > 1) {
                this.renderDashAudioTracks(dashTracks);
                return;
            }
        }
        const native = this.video.audioTracks;
        if (native && native.length > 1) {
            this.renderNativeAudioTracks();
            return;
        }
        // Fallback: only one track (or the API is unavailable) — disable.
        this.setAudioMenuEnabled(false);
    }

    // Toggle the audio control between enabled and greyed-out/disabled states.
    // The container stays visible either way.
    setAudioMenuEnabled(enabled) {
        this.audioContainer.style.display = '';
        if (enabled) {
            this.audioContainer.classList.remove('disabled');
            this.audioBtn.disabled = false;
            this.audioBtn.title = 'Audio Track (A)';
        } else {
            this.audioContainer.classList.add('disabled');
            this.audioBtn.disabled = true;
            this.audioBtn.title = 'Only one audio track available';
            this.audioMenu.classList.remove('active');
            // Show an informative, non-interactive note in the menu.
            this.audioList.innerHTML =
                '<div class="track-empty">Only one audio track</div>';
        }
    }

    renderHlsAudioTracks() {
        const tracks = this.hls.audioTracks;
        const current = this.hls.audioTrack; // currently active track id (index)

        this.setAudioMenuEnabled(true);
        this.audioList.innerHTML = '';

        tracks.forEach((track, i) => {
            const label = track.name || track.lang || `Audio ${i + 1}`;
            const btn = this.createTrackOption(label, i === current, () => {
                this.hls.audioTrack = i; // switch via hls.js
                this.refreshAudioTracks();
                this.audioMenu.classList.remove('active');
            });
            this.audioList.appendChild(btn);
        });
    }

    renderDashAudioTracks(tracks) {
        const player = this.dashPlayer;
        const currentTrack = player.getCurrentTrackFor('audio');

        this.setAudioMenuEnabled(true);
        this.audioList.innerHTML = '';

        tracks.forEach((track, i) => {
            const label = track.labels && track.labels.length
                ? track.labels[0].text
                : (track.lang || `Audio ${i + 1}`);
            const isActive = currentTrack && currentTrack.index === track.index;
            const btn = this.createTrackOption(label, isActive, () => {
                player.setCurrentTrack(track); // switch via dash.js
                this.refreshAudioTracks();
                this.audioMenu.classList.remove('active');
            });
            this.audioList.appendChild(btn);
        });
    }

    renderNativeAudioTracks() {
        const tracks = this.video.audioTracks;

        // Caller guarantees tracks.length > 1 here.
        this.setAudioMenuEnabled(true);
        this.audioList.innerHTML = '';

        for (let i = 0; i < tracks.length; i++) {
            const track = tracks[i];
            const label = track.label || track.language || `Audio ${i + 1}`;
            const btn = this.createTrackOption(label, track.enabled, () => {
                // Only one audio track can be enabled at a time
                for (let j = 0; j < tracks.length; j++) {
                    tracks[j].enabled = (j === i);
                }
                this.refreshAudioTracks();
                this.audioMenu.classList.remove('active');
            });
            this.audioList.appendChild(btn);
        }
    }

    // ========================================
    // Quality / Resolution Control
    // ========================================
    refreshQualityLevels() {
        // Quality levels come from the streaming library in use:
        //   1. hls.js  — hls.levels / hls.currentLevel (-1 = Auto)
        //   2. dash.js — bitrate list via getBitrateInfoListFor('video')
        // Plain progressive files (MP4/WebM) have no selectable levels.
        if (this.hls && Array.isArray(this.hls.levels) && this.hls.levels.length > 1) {
            this.renderHlsQualityLevels();
            return;
        }
        if (this.dashPlayer && typeof this.dashPlayer.getBitrateInfoListFor === 'function') {
            const levels = this.dashPlayer.getBitrateInfoListFor('video') || [];
            if (levels.length > 1) {
                this.renderDashQualityLevels(levels);
                return;
            }
        }
        // No selectable quality levels — disable the control.
        this.setQualityMenuEnabled(false);
    }

    setQualityMenuEnabled(enabled) {
        this.qualityContainer.style.display = '';
        if (enabled) {
            this.qualityContainer.classList.remove('disabled');
            this.qualityBtn.disabled = false;
            this.qualityBtn.title = 'Quality (Q)';
        } else {
            this.qualityContainer.classList.add('disabled');
            this.qualityBtn.disabled = true;
            this.qualityBtn.title = 'Quality options unavailable for this source';
            this.qualityMenu.classList.remove('active');
            this.qualityList.innerHTML =
                '<div class="track-empty">No quality options</div>';
        }
    }

    // Build a readable label for a level (prefers height -> "1080p").
    qualityLabel(level) {
        if (level && level.height) return `${level.height}p`;
        if (level && level.bitrate) return `${Math.round(level.bitrate / 1000)} kbps`;
        return 'Unknown';
    }

    renderHlsQualityLevels() {
        const levels = this.hls.levels;
        const current = this.hls.currentLevel; // -1 means Auto (ABR)
        const auto = this.hls.autoLevelEnabled;

        this.setQualityMenuEnabled(true);
        this.qualityList.innerHTML = '';

        // "Auto" (adaptive) option first.
        const autoBtn = this.createTrackOption('Auto', auto, () => {
            this.hls.currentLevel = -1; // re-enable ABR
            this.refreshQualityLevels();
            this.qualityMenu.classList.remove('active');
        });
        this.qualityList.appendChild(autoBtn);

        // Highest resolution first.
        levels
            .map((level, index) => ({ level, index }))
            .sort((a, b) => (b.level.height || 0) - (a.level.height || 0))
            .forEach(({ level, index }) => {
                const isActive = !auto && index === current;
                const btn = this.createTrackOption(this.qualityLabel(level), isActive, () => {
                    this.hls.currentLevel = index; // lock to this level
                    this.refreshQualityLevels();
                    this.qualityMenu.classList.remove('active');
                });
                this.qualityList.appendChild(btn);
            });
    }

    renderDashQualityLevels(levels) {
        const player = this.dashPlayer;
        // dash.js: auto switching on/off + current quality index.
        const autoSwitch = player.getSettings()?.streaming?.abr?.autoSwitchBitrate?.video !== false;
        const currentIndex = player.getQualityFor('video');

        this.setQualityMenuEnabled(true);
        this.qualityList.innerHTML = '';

        const autoBtn = this.createTrackOption('Auto', autoSwitch, () => {
            player.updateSettings({ streaming: { abr: { autoSwitchBitrate: { video: true } } } });
            this.refreshQualityLevels();
            this.qualityMenu.classList.remove('active');
        });
        this.qualityList.appendChild(autoBtn);

        levels
            .slice()
            .sort((a, b) => (b.height || 0) - (a.height || 0))
            .forEach((level) => {
                const isActive = !autoSwitch && level.qualityIndex === currentIndex;
                const btn = this.createTrackOption(this.qualityLabel(level), isActive, () => {
                    player.updateSettings({ streaming: { abr: { autoSwitchBitrate: { video: false } } } });
                    player.setQualityFor('video', level.qualityIndex);
                    this.refreshQualityLevels();
                    this.qualityMenu.classList.remove('active');
                });
                this.qualityList.appendChild(btn);
            });
    }

    // ========================================
    // Subtitle / Caption Control
    // ========================================
    refreshSubtitleTracks() {
        const tracks = this.video.textTracks;
        this.subtitleList.innerHTML = '';

        // "Off" option - always available
        const anyShowing = tracks && Array.from(tracks).some(t => t.mode === 'showing');
        const offBtn = this.createTrackOption('Off', !anyShowing, () => {
            if (tracks) {
                for (let i = 0; i < tracks.length; i++) tracks[i].mode = 'disabled';
            }
            this.refreshSubtitleTracks();
            this.subtitleMenu.classList.remove('active');
        });
        this.subtitleList.appendChild(offBtn);

        if (tracks) {
            for (let i = 0; i < tracks.length; i++) {
                const track = tracks[i];
                // Skip metadata/chapter tracks - only show subtitles & captions
                if (track.kind && track.kind !== 'subtitles' && track.kind !== 'captions') continue;

                const label = track.label || track.language || `Subtitle ${i + 1}`;
                const btn = this.createTrackOption(label, track.mode === 'showing', () => {
                    for (let j = 0; j < tracks.length; j++) {
                        tracks[j].mode = (j === i) ? 'showing' : 'disabled';
                    }
                    this.refreshSubtitleTracks();
                    this.subtitleMenu.classList.remove('active');
                });
                this.subtitleList.appendChild(btn);
            }
        }

        // Highlight the subtitle button when a track is active
        this.subtitleBtn.style.color = anyShowing ? 'var(--accent-primary)' : '';
    }

    async handleSubtitleFile(e) {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        try {
            let text = await file.text();

            // Convert SRT to WebVTT if needed (browsers only render VTT)
            if (file.name.toLowerCase().endsWith('.srt')) {
                text = this.srtToVtt(text);
            } else if (!text.trimStart().startsWith('WEBVTT')) {
                // Ensure a VTT header exists
                text = 'WEBVTT\n\n' + text;
            }

            const blob = new Blob([text], { type: 'text/vtt' });
            const blobUrl = URL.createObjectURL(blob);
            this.externalSubtitleUrls.push(blobUrl);

            const trackEl = document.createElement('track');
            trackEl.kind = 'subtitles';
            trackEl.label = file.name.replace(/\.(srt|vtt)$/i, '');
            trackEl.src = blobUrl;
            trackEl.default = true;
            this.video.appendChild(trackEl);

            // Enable it once the browser registers it
            trackEl.addEventListener('load', () => {
                const tracks = this.video.textTracks;
                for (let i = 0; i < tracks.length; i++) {
                    tracks[i].mode = (tracks[i].label === trackEl.label) ? 'showing' : 'disabled';
                }
                this.refreshSubtitleTracks();
            });

            // Fallback in case 'load' doesn't fire
            setTimeout(() => this.refreshSubtitleTracks(), 300);

            console.log(`📝 Loaded subtitle: ${file.name}`);
        } catch (err) {
            console.error('Failed to load subtitle file:', err);
        } finally {
            // Reset so the same file can be re-selected later
            this.subtitleFileInput.value = '';
        }
    }

    srtToVtt(srt) {
        // Normalize line endings, swap comma decimal separators for periods
        const body = srt
            .replace(/\r+/g, '')
            .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
        return 'WEBVTT\n\n' + body;
    }

    createTrackOption(label, isActive, onClick) {
        const btn = document.createElement('button');
        btn.className = 'track-option' + (isActive ? ' active' : '');
        btn.innerHTML = `
            <svg class="track-check" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span class="track-name"></span>
        `;
        btn.querySelector('.track-name').textContent = label;
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            onClick();
        });
        return btn;
    }

    // ========================================
    // One-Click Download
    // ========================================
    async downloadVideo() {
        if (!this.currentUrl) return;

        // Already downloading? Cancel it.
        if (this.downloadAbortController) {
            this.downloadAbortController.abort();
            this.downloadAbortController = null;
            return;
        }

        const filename = this.getDownloadFilename();

        // Try a streamed fetch so we can show progress. Falls back to a direct
        // link if the fetch is blocked by CORS.
        this.downloadAbortController = new AbortController();
        const toast = this.showDownloadToast(filename);

        try {
            const response = await fetch(this.currentUrl, {
                signal: this.downloadAbortController.signal
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const contentLength = Number(response.headers.get('Content-Length')) || 0;
            const reader = response.body.getReader();
            const chunks = [];
            let received = 0;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
                received += value.length;
                this.updateDownloadToast(toast, received, contentLength);
            }

            const blob = new Blob(chunks);
            this.triggerBlobDownload(blob, filename);
            this.finishDownloadToast(toast, 'Saved ✓');
        } catch (err) {
            if (err.name === 'AbortError') {
                this.finishDownloadToast(toast, 'Cancelled');
            } else {
                // CORS or network issue - fall back to opening a direct download link
                console.warn('Streamed download failed, using direct link:', err.message);
                this.triggerLinkDownload(this.currentUrl, filename);
                this.finishDownloadToast(toast, 'Opened in browser');
            }
        } finally {
            this.downloadAbortController = null;
        }
    }

    getDownloadFilename() {
        // Prefer the original (un-proxied) URL for naming
        const source = this.originalUrl || this.currentUrl;
        try {
            const u = new URL(source, window.location.href);
            // If proxied, the real URL is in the ?url= param
            const proxied = u.searchParams.get('url');
            const target = proxied ? decodeURIComponent(proxied) : source;
            const pathname = new URL(target, window.location.href).pathname;
            let name = pathname.substring(pathname.lastIndexOf('/') + 1);
            name = decodeURIComponent(name) || 'video';
            // Ensure it has some extension
            if (!/\.[a-z0-9]{2,4}$/i.test(name)) name += '.mp4';
            return name;
        } catch {
            return 'video.mp4';
        }
    }

    setVideoTitle() {
        if (!this.videoTitle) return;
        // Derive a human-friendly title from the filename: drop the extension,
        // turn separators into spaces, and collapse whitespace.
        const file = this.getDownloadFilename();
        let title = file.replace(/\.[a-z0-9]{2,4}$/i, '');   // strip extension
        title = title.replace(/[._+]+/g, ' ')                 // separators -> space
                     .replace(/%20/gi, ' ')                   // stray encoded spaces
                     .replace(/\s+/g, ' ')                    // collapse runs
                     .trim();
        const display = title || 'Video';
        this.videoTitle.textContent = display;
        this.videoTitle.setAttribute('title', display); // tooltip for long names
    }

    triggerBlobDownload(blob, filename) {
        const url = URL.createObjectURL(blob);
        this.triggerLinkDownload(url, filename);
        setTimeout(() => URL.revokeObjectURL(url), 10000);
    }

    triggerLinkDownload(url, filename) {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        a.remove();
    }

    showDownloadToast(filename) {
        const toast = document.createElement('div');
        toast.className = 'download-toast';
        toast.innerHTML = `
            <span class="download-toast-label">⬇ <span class="download-toast-text">Starting…</span></span>
            <div class="download-toast-bar"><div class="download-toast-fill"></div></div>
        `;
        this.playerContainer.appendChild(toast);
        return toast;
    }

    updateDownloadToast(toast, received, total) {
        const text = toast.querySelector('.download-toast-text');
        const fill = toast.querySelector('.download-toast-fill');
        const mb = (received / 1024 / 1024).toFixed(1);

        if (total > 0) {
            const percent = Math.min(100, (received / total) * 100);
            const totalMb = (total / 1024 / 1024).toFixed(1);
            fill.style.width = `${percent}%`;
            text.textContent = `${mb} / ${totalMb} MB`;
        } else {
            text.textContent = `${mb} MB`;
        }
    }

    finishDownloadToast(toast, message) {
        const text = toast.querySelector('.download-toast-text');
        const fill = toast.querySelector('.download-toast-fill');
        if (text) text.textContent = message;
        if (fill) fill.style.width = '100%';
        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }
    
    showControls() {
        clearTimeout(this.controlsTimeout);
        clearTimeout(this.cursorTimeout);
        
        this.playerContainer.classList.add('show-controls');
        this.playerContainer.classList.remove('hide-cursor');
        
        if (this.isPlaying) {
            this.controlsTimeout = setTimeout(() => {
                this.playerContainer.classList.remove('show-controls');
            }, 3000);
            
            if (this.isFullscreen) {
                this.cursorTimeout = setTimeout(() => {
                    this.playerContainer.classList.add('hide-cursor');
                }, 3000);
            }
        }
    }
    
    hideControls() {
        if (this.isPlaying) {
            this.playerContainer.classList.remove('show-controls');
        }
    }
    
    handleKeyboard(e) {
        // Don't handle if typing in input
        if (e.target.tagName === 'INPUT') return;
        
        const key = e.key.toLowerCase();
        
        switch (key) {
            case ' ':
            case 'k':
                e.preventDefault();
                if (this.playerSection.classList.contains('active')) {
                    this.togglePlay();
                }
                break;
            case 'f':
                e.preventDefault();
                this.toggleFullscreen();
                break;
            case 'm':
                e.preventDefault();
                this.toggleMute();
                break;
            case 'p':
                e.preventDefault();
                this.togglePiP();
                break;
            case 'a':
                e.preventDefault();
                if (!this.audioBtn.disabled) {
                    this.subtitleMenu.classList.remove('active');
                    this.qualityMenu.classList.remove('active');
                    this.audioMenu.classList.toggle('active');
                }
                break;
            case 'q':
                e.preventDefault();
                if (!this.qualityBtn.disabled) {
                    this.audioMenu.classList.remove('active');
                    this.subtitleMenu.classList.remove('active');
                    this.qualityMenu.classList.toggle('active');
                }
                break;
            case 'c':
                e.preventDefault();
                this.audioMenu.classList.remove('active');
                this.subtitleMenu.classList.toggle('active');
                break;
            case 'd':
                e.preventDefault();
                this.downloadVideo();
                break;
            case 't':
                e.preventDefault();
                this.toggleTheme();
                break;
            case 'arrowleft':
            case 'j':
                e.preventDefault();
                this.skip(-10);
                break;
            case 'arrowright':
            case 'l':
                e.preventDefault();
                this.skip(10);
                break;
            case 'arrowup':
                e.preventDefault();
                this.setVolume(Math.min(1, this.video.volume + 0.1));
                break;
            case 'arrowdown':
                e.preventDefault();
                this.setVolume(Math.max(0, this.video.volume - 0.1));
                break;
            case '?':
                e.preventDefault();
                this.shortcutsModal.classList.toggle('active');
                break;
            case 'escape':
                this.shortcutsModal.classList.remove('active');
                break;
            default:
                // Number keys for seeking (0-9 = 0%-90%)
                if (key >= '0' && key <= '9') {
                    e.preventDefault();
                    const percent = parseInt(key) * 10;
                    this.seekToPercent(percent);
                }
        }
    }
    
    showLoading() {
        this.loadingOverlay.classList.add('active');
    }
    
    hideLoading() {
        this.loadingOverlay.classList.remove('active');
    }
    
    showError(message = 'Unable to load video') {
        this.hideLoading();
        this.errorText.textContent = message;
        this.errorOverlay.classList.add('active');
    }
    
    hideError() {
        this.errorOverlay.classList.remove('active');
    }
    
    handleError(e) {
        const error = this.video.error;
        let message = 'Unable to load video';
        
        if (error) {
            switch (error.code) {
                case MediaError.MEDIA_ERR_ABORTED:
                    message = 'Video playback aborted';
                    break;
                case MediaError.MEDIA_ERR_NETWORK:
                    message = 'Network error - check your connection or the URL may have expired';
                    break;
                case MediaError.MEDIA_ERR_DECODE:
                    message = 'Video format not supported by browser';
                    break;
                case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
                    // Try without crossorigin attribute if it was set
                    if (this.video.hasAttribute('crossorigin') && !this.triedWithoutCors) {
                        this.triedWithoutCors = true;
                        console.log('Retrying without CORS...');
                        this.video.removeAttribute('crossorigin');
                        this.video.load();
                        return;
                    }
                    // Try with crossorigin if it wasn't set
                    if (!this.video.hasAttribute('crossorigin') && !this.triedWithCors) {
                        this.triedWithCors = true;
                        console.log('Retrying with CORS anonymous...');
                        this.video.setAttribute('crossorigin', 'anonymous');
                        this.video.load();
                        return;
                    }
                    
                    // Check if it's a Google URL for specific message
                    const isGoogleUrl = this.currentUrl.includes('googleusercontent.com') || 
                                       this.currentUrl.includes('googlevideo.com');
                    if (isGoogleUrl) {
                        message = 'Google video URL has expired!\n\nGoogle download links are only valid for a few hours.\nPlease get a fresh download URL.';
                    } else {
                        message = 'Video cannot be played.\n\n• URL may be expired or invalid\n• Server may block external access\n• Format may not be supported';
                    }
                    break;
            }
        }
        
        this.showError(message);
    }
    
    showPlayerSection() {
        this.urlSection.classList.add('hidden');
        this.playerSection.classList.add('active');
    }
    
    showUrlSection() {
        this.urlSection.classList.remove('hidden');
        this.playerSection.classList.remove('active');

        // Clear the video title bar
        if (this.videoTitle) {
            this.videoTitle.textContent = '';
            this.videoTitle.removeAttribute('title');
        }

        // Tear down any streaming-library instance
        this.destroyStreamingInstances();
        
        // Stop buffer management
        this.stopBufferManagement();

        // Cancel any in-progress download
        if (this.downloadAbortController) {
            this.downloadAbortController.abort();
            this.downloadAbortController = null;
        }

        // Clean up external subtitle tracks and their blob URLs
        this.video.querySelectorAll('track').forEach(t => t.remove());
        this.externalSubtitleUrls.forEach(url => URL.revokeObjectURL(url));
        this.externalSubtitleUrls = [];
        this.audioContainer.style.display = 'none';
        this.audioMenu.classList.remove('active');
        this.qualityContainer.style.display = 'none';
        this.qualityMenu.classList.remove('active');
        this.subtitleMenu.classList.remove('active');
        this.subtitleBtn.style.color = '';

        // Reset video
        this.video.pause();
        this.video.src = '';
        this.video.load();
        
        // Reset buffer tracking
        this.maxWatchedPosition = 0;
        this.bufferRanges = [];
        this.lastBufferTime = 0;
        this.lastBufferedAmount = 0;
        this.networkSpeedSamples = [];
        
        // Reset UI
        this.hideLoading();
        this.hideError();
        this.progressPlayed.style.width = '0%';
        this.progressBuffer.style.width = '0%';
        this.progressBuffer.style.left = '0%';
        this.progressThumb.style.left = '0%';
        this.currentTimeEl.textContent = '0:00';
        this.durationEl.textContent = '0:00';
        this.bufferPercent.textContent = '0%';
        this.networkSpeed.textContent = '—';
        
        // Remove buffer health classes
        const bufferStat = document.getElementById('bufferStat');
        bufferStat.classList.remove('healthy', 'warning', 'critical');
        
        // Hide buffer indicator
        this.bufferIndicator.classList.remove('active');
        
        // Clear URL params
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('url');
        window.history.replaceState({}, '', newUrl);
        
        this.urlInput.focus();
    }
    
    formatTime(seconds) {
        if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
        
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        
        if (h > 0) {
            return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        return `${m}:${s.toString().padStart(2, '0')}`;
    }
}

// Initialize player when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.lumen = new LumenPlayer();
});

// Service Worker for offline support (optional enhancement)
if ('serviceWorker' in navigator) {
    // Uncomment to enable service worker
    // navigator.serviceWorker.register('/sw.js');
}

