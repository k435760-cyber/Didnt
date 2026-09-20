/**
 * 의존성 없는 정적 서버. `npm install` 없이 빌드 결과를 바로 열어 볼 때 쓴다.
 *
 *   node scripts/serve-dist.mjs        # http://127.0.0.1:4173
 *   PORT=8080 node scripts/serve-dist.mjs
 *
 * SPA 라서 없는 경로는 index.html 로 돌려준다. 서비스 워커와 PWA 설치는
 * localhost 에서만 http 로도 동작하고, 그 밖의 주소에서는 HTTPS 가 필요하다.
 */
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../dist');
const port = Number(process.env.PORT ?? 4173);
const host = process.env.HOST ?? '127.0.0.1';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

/** dist 바깥으로 나가는 경로 요청을 막는다. */
function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0] ?? '/');
  const target = resolve(join(root, normalize(decoded)));
  return target === root || target.startsWith(root + '/') ? target : null;
}

async function resolveFile(urlPath) {
  const target = safePath(urlPath);
  if (!target) return null;
  try {
    const info = await stat(target);
    if (info.isFile()) return target;
    if (info.isDirectory()) return resolveFile(join(urlPath, 'index.html'));
  } catch {
    /* 아래에서 SPA 폴백으로 넘어간다 */
  }
  return null;
}

const server = createServer(async (request, response) => {
  const url = request.url ?? '/';
  const found = await resolveFile(url);
  // 화면 경로만 index.html 로 돌려준다. 없는 자산까지 폴백하면 디버깅이 괴롭고,
  // 서비스 워커는 자기 위치가 곧 스코프라서 절대 폴백시키면 안 된다.
  const looksLikeAsset = /\.[a-z0-9]+$/i.test((url.split('?')[0] ?? '').replace(/\/$/, ''));
  const file = found ?? (looksLikeAsset ? null : join(root, 'index.html'));

  if (!file) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('없는 파일입니다.');
    return;
  }

  const type = TYPES[extname(file)] ?? 'application/octet-stream';
  // 해시가 붙은 자산만 오래 캐시하고, 껍데기와 워커는 매번 확인하게 둔다.
  const immutable = file.includes('/assets/') && /-[A-Za-z0-9_-]{8,}\./.test(file);
  response.writeHead(200, {
    'content-type': type,
    'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
  });
  createReadStream(file).pipe(response);
});

server.listen(port, host, () => {
  console.log(`ScoreLab: http://${host}:${port}  (Ctrl+C 로 종료)`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`${port} 번 포트를 이미 쓰고 있습니다. PORT=다른번호 로 다시 실행하세요.`);
    process.exit(1);
  }
  throw error;
});
