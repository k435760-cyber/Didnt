/**
 * 게임 전체를 하나의 index.html 로 묶는다.
 *
 * 1. Tailwind CLI 로 실제 사용된 클래스만 담은 CSS 를 만들고
 * 2. esbuild 로 React 앱을 단일 번들로 묶은 뒤
 * 3. 템플릿에 인라인으로 삽입한다.
 *
 * 결과물은 외부 요청 없이 파일 하나로 동작한다(구글 로그인만 http(s) 오리진 필요).
 */
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import * as esbuild from 'esbuild';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './supabase-values.mjs';

const run = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(root, 'dist');
const tempCss = resolve(outDir, 'bundle.css');

async function buildCss() {
  await run(
    'npx',
    [
      '@tailwindcss/cli',
      '--input',
      resolve(root, 'src/app/globals.css'),
      '--output',
      tempCss,
      '--minify',
    ],
    { cwd: root },
  );
  return readFile(tempCss, 'utf8');
}

async function buildScript() {
  const result = await esbuild.build({
    entryPoints: [resolve(root, 'src/standalone/entry.tsx')],
    bundle: true,
    write: false,
    minify: true,
    format: 'iife',
    target: ['es2022'],
    platform: 'browser',
    jsx: 'automatic',
    legalComments: 'none',
    logLevel: 'error',
    alias: { '@': resolve(root, 'src') },
    define: {
      'process.env.NODE_ENV': '"production"',
      'process.env.NEXT_PUBLIC_SUPABASE_URL': JSON.stringify(SUPABASE_URL),
      'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(SUPABASE_ANON_KEY),
    },
  });

  const file = result.outputFiles[0];
  if (!file) throw new Error('esbuild 가 결과물을 만들지 못했습니다.');
  return file.text;
}

/** </script> 가 문자열 안에 들어가면 HTML 파싱이 깨지므로 분리한다. */
function escapeForInlineScript(code) {
  return code.replaceAll('</script', '<\\/script').replaceAll('<!--', '<\\!--');
}

async function main() {
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  const [css, js, template] = await Promise.all([
    buildCss(),
    buildScript(),
    readFile(resolve(root, 'src/standalone/template.html'), 'utf8'),
  ]);

  const html = template
    .replace('/*__STYLES__*/', () => css.trim())
    .replace('/*__SCRIPT__*/', () => escapeForInlineScript(js.trim()));

  await rm(tempCss, { force: true });
  await writeFile(resolve(outDir, 'index.html'), html, 'utf8');
  await writeFile(resolve(root, 'index.html'), html, 'utf8');

  const size = Buffer.byteLength(html, 'utf8');
  process.stdout.write(
    `index.html 생성 완료 — ${(size / 1024).toFixed(0)} KB (CSS ${(css.length / 1024).toFixed(0)} KB, JS ${(js.length / 1024).toFixed(0)} KB)\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
