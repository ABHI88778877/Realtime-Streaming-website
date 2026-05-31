/**
 * Lumen Proxy Server
 * Bypasses CORS and hotlink restrictions for video streaming
 */

const http = require('http');
const https = require('https');
const path = require('path');
const fs = require('fs');
const os = require('os');

const PORT = 4000;

// MIME types for serving static files
const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
    // req.url is a path (e.g. "/proxy?url=..."), so parse it against a base.
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;
    
    // Add CORS headers to all responses
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // Proxy endpoint: /proxy?url=VIDEO_URL
    if (pathname === '/proxy') {
        const videoUrl = parsedUrl.searchParams.get('url');
        
        if (!videoUrl) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing url parameter' }));
            return;
        }
        
        console.log(`\n🎬 Proxying: ${videoUrl}`);
        
        try {
            await proxyVideo(videoUrl, req, res);
        } catch (error) {
            console.error('❌ Proxy error:', error.message);
            // Only send error if headers haven't been sent
            if (!res.headersSent) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: error.message }));
            }
        }
        return;
    }
    
    // Serve static files
    let filePath = pathname === '/' ? '/index.html' : pathname;
    filePath = path.join(__dirname, filePath);
    
    // Security: prevent directory traversal
    if (!filePath.startsWith(__dirname)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }
    
    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    
    fs.readFile(filePath, (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404);
                res.end('File not found');
            } else {
                res.writeHead(500);
                res.end('Server error');
            }
            return;
        }
        
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
});

function proxyVideo(videoUrl, clientReq, clientRes) {
    return new Promise((resolve, reject) => {
        let parsedUrl;
        try {
            parsedUrl = new URL(videoUrl);
        } catch (err) {
            reject(new Error('Invalid video URL'));
            return;
        }
        const protocol = parsedUrl.protocol === 'https:' ? https : http;
        
        // Forward Range header for seeking support
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': '*/*',
            'Accept-Encoding': 'identity',
            'Connection': 'keep-alive',
            'Referer': `${parsedUrl.protocol}//${parsedUrl.hostname}/`
        };
        
        // Forward Range header for seeking
        if (clientReq.headers.range) {
            headers['Range'] = clientReq.headers.range;
            console.log(`📍 Range: ${clientReq.headers.range}`);
        }
        
        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
            path: parsedUrl.pathname + parsedUrl.search,
            method: clientReq.method || 'GET',
            headers: headers,
            timeout: 30000
        };
        
        const proxyReq = protocol.request(options, (proxyRes) => {
            console.log(`📥 Response: ${proxyRes.statusCode}`);
            
            // Handle redirects
            if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
                let redirectUrl = proxyRes.headers.location;
                // Handle relative redirects
                if (redirectUrl.startsWith('/')) {
                    redirectUrl = `${parsedUrl.protocol}//${parsedUrl.hostname}${redirectUrl}`;
                }
                console.log(`🔄 Redirect: ${redirectUrl}`);
                proxyVideo(redirectUrl, clientReq, clientRes)
                    .then(resolve)
                    .catch(reject);
                return;
            }
            
            // Forward response headers
            const responseHeaders = {
                'Content-Type': proxyRes.headers['content-type'] || 'video/mp4',
                'Accept-Ranges': 'bytes',
                'Cache-Control': 'no-cache'
            };
            
            if (proxyRes.headers['content-length']) {
                responseHeaders['Content-Length'] = proxyRes.headers['content-length'];
            }
            
            if (proxyRes.headers['content-range']) {
                responseHeaders['Content-Range'] = proxyRes.headers['content-range'];
            }
            
            // Use appropriate status code
            const statusCode = proxyRes.statusCode;
            
            if (!clientRes.headersSent) {
                clientRes.writeHead(statusCode, responseHeaders);
            }
            
            // Pipe the video stream to client
            proxyRes.pipe(clientRes);
            
            proxyRes.on('end', () => {
                console.log('✅ Done');
                resolve();
            });
            
            proxyRes.on('error', (err) => {
                console.error('Stream error:', err.message);
                if (!clientRes.headersSent) {
                    reject(err);
                } else {
                    resolve(); // Already streaming, just end
                }
            });
        });
        
        proxyReq.on('timeout', () => {
            console.error('⏱️ Request timeout');
            proxyReq.destroy();
            reject(new Error('Request timeout'));
        });
        
        proxyReq.on('error', (err) => {
            console.error('Request error:', err.message);
            reject(err);
        });
        
        // Handle client disconnect
        clientReq.on('close', () => {
            proxyReq.destroy();
        });
        
        clientRes.on('close', () => {
            proxyReq.destroy();
        });
        
        proxyReq.end();
    });
}

// Find the machine's LAN IPv4 address so other devices (e.g. a phone on the
// same Wi-Fi) can reach the server. Falls back to localhost if none is found.
function getLanIP() {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name] || []) {
            // Skip internal (127.0.0.1) and non-IPv4 / link-local (169.254.x) addresses
            if (net.family === 'IPv4' && !net.internal && !net.address.startsWith('169.254.')) {
                return net.address;
            }
        }
    }
    return 'localhost';
}

server.listen(PORT, () => {
    const lanIP = getLanIP();
    const pad = (s) => (s + ' '.repeat(40)).slice(0, 40);
    console.log(`
╔════════════════════════════════════════════════════════╗
║                                                        ║
║   🎬 Lumen Proxy Server                               ║
║                                                        ║
║   On this PC:  ${pad('http://localhost:' + PORT)} ║
║   On phone:    ${pad('http://' + lanIP + ':' + PORT)} ║
║                                                        ║
║   (Phone must be on the same Wi-Fi network)            ║
║   Press Ctrl+C to stop                                 ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
    `);
});
