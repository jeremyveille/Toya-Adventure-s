/**
 * Lance le parcours E2E Playwright (tests/play_village.py) de bout en bout :
 *   1. sert le dépôt sur un port local ;
 *   2. choisit un navigateur Chromium (variable CHROMIUM_PATH, Edge, Chrome, puis défaut Playwright) ;
 *   3. exécute le script Python et relaie son code de sortie.
 *
 * Prérequis : Python avec le paquet `playwright` (pip install playwright).
 * Usage : npm run test:e2e
 */
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.E2E_PORT || 3017);

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
};

function startServer() {
    const server = http.createServer((request, response) => {
        const url = decodeURIComponent((request.url || '/').split('?')[0]);
        const relative = url === '/' ? 'index.html' : url.replace(/^\/+/, '');
        const file = path.join(ROOT, relative);
        if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
            response.writeHead(404);
            response.end('Not found');
            return;
        }
        response.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
        fs.createReadStream(file).pipe(response);
    });
    return new Promise((resolve) => server.listen(PORT, '127.0.0.1', () => resolve(server)));
}

function browserPath() {
    if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
    const candidates = [
        path.join(process.env['ProgramFiles(x86)'] || '', 'Microsoft/Edge/Application/msedge.exe'),
        path.join(process.env.ProgramFiles || '', 'Microsoft/Edge/Application/msedge.exe'),
        path.join(process.env.ProgramFiles || '', 'Google/Chrome/Application/chrome.exe'),
        path.join(process.env['ProgramFiles(x86)'] || '', 'Google/Chrome/Application/chrome.exe'),
        path.join(process.env.LOCALAPPDATA || '', 'Google/Chrome/Application/chrome.exe'),
    ];
    return candidates.find((candidate) => candidate && fs.existsSync(candidate)) || '';
}

function run(command, args, options) {
    return new Promise((resolve) => {
        const child = spawn(command, args, { stdio: 'inherit', ...options });
        child.on('error', (error) => {
            console.error('Impossible de lancer ' + command + ' : ' + error.message);
            resolve(1);
        });
        child.on('exit', (code) => resolve(code === null ? 1 : code));
    });
}

async function main() {
    const probe = await new Promise((resolve) => {
        const child = spawn(process.env.PYTHON || 'python', ['-c', 'import playwright'], { stdio: 'ignore' });
        child.on('error', () => resolve(false));
        child.on('exit', (code) => resolve(code === 0));
    });
    if (!probe) {
        console.error('Playwright est absent : exécute `python -m pip install playwright` puis relance npm run test:e2e.');
        process.exit(1);
    }

    const server = await startServer();
    const env = { ...process.env, CHROMIUM_PATH: browserPath() };
    console.log('Serveur E2E sur http://127.0.0.1:' + PORT + ' · navigateur : ' + (env.CHROMIUM_PATH || 'défaut Playwright'));
    let code = 1;
    try {
        code = await run(process.env.PYTHON || 'python', ['tests/play_village.py', 'http://127.0.0.1:' + PORT], {
            cwd: ROOT, env,
        });
    } finally {
        server.close();
    }
    process.exit(code);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
