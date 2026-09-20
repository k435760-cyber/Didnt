/*
 * 서비스 워커.
 *
 * 앱 껍데기는 캐시에서 바로 띄우고, 빌드 때 해시가 붙는 정적 자산은 한 번 받으면
 * 계속 재사용한다. Supabase 로 가는 요청은 절대 캐시하지 않는다 — 남의 계정
 * 응답이 남아 있으면 안 되고, 로그인 상태가 오래된 응답으로 되살아나서도 안 된다.
 */
const VERSION = 'scorelab-v1';
const SHELL_CACHE = `${VERSION}-shell`;
const ASSET_CACHE = `${VERSION}-assets`;

const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icons/favicon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      // 하나가 실패해도 설치 전체가 실패하지 않게 개별로 담는다.
      .then((cache) => Promise.allSettled(SHELL.map((url) => cache.add(url))))
      .then(() => undefined),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

const isAsset = (url) =>
  url.origin === self.location.origin &&
  (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/'));

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // 인증·데이터 요청은 건드리지 않는다.
  if (url.origin !== self.location.origin) return;

  // 페이지 이동: 네트워크를 먼저 보되, 끊겨 있으면 캐시된 껍데기로 연다.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put('/index.html', copy));
          return response;
        })
        .catch(() => caches.match('/index.html').then((cached) => cached ?? Response.error())),
    );
    return;
  }

  // 해시가 붙은 정적 자산: 한 번 받으면 바뀌지 않으므로 캐시 우선.
  if (isAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
  }
});
