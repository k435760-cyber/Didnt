/**
 * 아이콘 생성. SVG 하나를 원본으로 삼아 PWA 가 요구하는 PNG 들을 만든다.
 * `npm run icons` 로 다시 만들 수 있고, 결과물은 저장소에 함께 둔다.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, '../public/icons');

/**
 * maskable 은 원형으로 잘려 나가도 마크가 살아남도록 여백을 더 준다.
 * any 용 아이콘만 모서리를 둥글리고, maskable 과 apple-touch 는 OS 가 직접
 * 마스크를 씌우므로 가장자리까지 꽉 채운다.
 */
const mark = (inset, rounded) => {
  const size = 512;
  const pad = size * inset;
  const span = size - pad * 2;
  // 번개 모양: 브랜드 마크와 같은 실루엣.
  const bolt = `M ${pad + span * 0.56} ${pad + span * 0.04}
                L ${pad + span * 0.2} ${pad + span * 0.55}
                L ${pad + span * 0.46} ${pad + span * 0.55}
                L ${pad + span * 0.4} ${pad + span * 0.96}
                L ${pad + span * 0.8} ${pad + span * 0.42}
                L ${pad + span * 0.52} ${pad + span * 0.42} Z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#6366f1"/>
      <stop offset="55%" stop-color="#4f46e5"/>
      <stop offset="100%" stop-color="#14b8a6"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${rounded ? 104 : 0}" fill="url(#bg)"/>
  <path d="${bolt}" fill="#ffffff"/>
</svg>`;
};

const FAVICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#6366f1"/><stop offset="100%" stop-color="#14b8a6"/>
    </linearGradient>
  </defs>
  <rect width="32" height="32" rx="8" fill="url(#g)"/>
  <path d="M18 5 10 18h5l-1 9 8-13h-5z" fill="#fff"/>
</svg>`;

const targets = [
  { name: 'icon-192.png', size: 192, inset: 0.2, rounded: true },
  { name: 'icon-512.png', size: 512, inset: 0.2, rounded: true },
  { name: 'maskable-192.png', size: 192, inset: 0.28, rounded: false },
  { name: 'maskable-512.png', size: 512, inset: 0.28, rounded: false },
  { name: 'apple-touch-icon.png', size: 180, inset: 0.18, rounded: false },
];

await mkdir(out, { recursive: true });
await writeFile(resolve(out, 'favicon.svg'), FAVICON);

for (const target of targets) {
  const svg = Buffer.from(mark(target.inset, target.rounded));
  await sharp(svg)
    .resize(target.size, target.size)
    .png({ compressionLevel: 9 })
    .toFile(resolve(out, target.name));
  console.log(`  ${target.name}  ${target.size}x${target.size}`);
}
console.log('아이콘을 만들었습니다.');
