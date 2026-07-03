const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
// ドキュメントルートをスクリプト（scratch/server.js）の親ディレクトリに固定
const DOC_ROOT = path.resolve(path.join(__dirname, '..'));

console.log(`Document root set to: ${DOC_ROOT}`);

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    console.log(`${req.method} ${req.url}`);
    
    // URLのデコード
    let decodedUrl;
    try {
        decodedUrl = decodeURIComponent(req.url);
    } catch (e) {
        res.writeHead(400);
        res.end('Bad Request');
        return;
    }

    // パス解決
    let reqPath = decodedUrl;
    if (reqPath === '/' || reqPath.endsWith('/')) {
        reqPath += 'index.html';
    }
    
    const filePath = path.resolve(path.join(DOC_ROOT, reqPath));
    
    // 安全対策：ドキュメントルート外のファイルアクセスを防ぐ
    if (!filePath.startsWith(DOC_ROOT)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }
    
    const extname = path.extname(filePath);
    let contentType = MIME_TYPES[extname] || 'application/octet-stream';
    
    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404);
                res.end('File Not Found');
            } else {
                res.writeHead(500);
                res.end(`Server Error: ${error.code}`);
            }
        } else {
            res.writeHead(200, { 
                'Content-Type': contentType,
                // Web Worker などのセキュリティヘッダー（必要に応じて）
                'Cross-Origin-Opener-Policy': 'same-origin',
                'Cross-Origin-Embedder-Policy': 'require-corp'
            });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
});
