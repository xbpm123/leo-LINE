// タイプ別のシェア画像（public/og/<コード>.png, 1200x630）を作る。Mac の Chrome が必要。
// タイプ名・キャッチコピー・絵文字を変えたときだけ `npm run build:og` で作り直す。
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LC, slug } from './build-types.mjs';

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const COLORS = { CO: ['#a8610b', '#fcf0da'], EO: ['#d62246', '#fde8ec'], CK: ['#2460b5', '#e5eefb'], EK: ['#6a45bf', '#efe9fb'] };
const HEART = 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z';

const html = (core) => {
  const [name, tagline] = LC.TYPES[core], att = LC.ATT[core.slice(0, 2)], [ink, tint] = COLORS[core.slice(0, 2)];
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; margin: 0; }
  body { width: 1200px; height: 630px; background: ${tint}; font-family: "Hiragino Sans", "Noto Sans JP", sans-serif; color: #1a1719; display: grid; grid-template-columns: 1fr 380px; align-items: center; padding: 0 72px; gap: 48px; overflow: hidden; }
  .brand { display: flex; align-items: center; gap: 14px; font-weight: 700; font-size: 30px; }
  .brand svg { width: 52px; height: 52px; }
  .att { display: inline-block; margin-top: 40px; background: ${ink}; color: #fff; font-size: 26px; font-weight: 700; border-radius: 999px; padding: 6px 24px; }
  h1 { font-size: ${name.length > 7 ? 72 : 96}px; line-height: 1.2; font-weight: 700; margin-top: 14px; white-space: nowrap; }
  p { font-size: 34px; color: #443f43; margin-top: 16px; font-weight: 600; line-height: 1.45; }
  small { display: block; font-size: 24px; color: #6e686d; margin-top: 36px; font-weight: 600; }
  .card { background: #fff; border-radius: 40px; padding: 48px 24px; text-align: center; box-shadow: 0 30px 60px -30px rgba(26,23,25,.35); }
  .em { width: 190px; height: 190px; border-radius: 50%; background: ${tint}; display: grid; place-items: center; font-size: 104px; margin: 0 auto 20px; }
  .code { font-family: "Avenir Next", "Helvetica Neue", sans-serif; font-weight: 700; font-size: 76px; color: ${ink}; letter-spacing: .04em; }
</style></head><body>
<div>
  <div class="brand"><svg viewBox="0 0 28 28"><rect width="28" height="28" rx="8" fill="#d62246"/><path transform="translate(5 5.2) scale(.75)" fill="#fff" d="${HEART}"/></svg>ラブコード診断</div>
  <span class="att">${att.name}</span>
  <h1>${name}</h1>
  <p>${tagline}</p>
  <small>あなたはどのタイプ？ 30問・約5分の無料診断</small>
</div>
<div class="card"><div class="em">${LC.EMOJI[core]}</div><div class="code">${core}</div></div>
</body></html>`;
};

const out = fileURLToPath(new URL('../public/og/', import.meta.url));
mkdirSync(out, { recursive: true });
const tmp = mkdtempSync(join(tmpdir(), 'lovecode-og-'));
for (const core of Object.keys(LC.TYPES)) {
  const src = join(tmp, core + '.html');
  writeFileSync(src, html(core));
  execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', '--window-size=1200,630', `--screenshot=${join(out, slug(core) + '.png')}`, 'file://' + src], { stdio: 'ignore' });
  console.log(slug(core) + '.png');
}
rmSync(tmp, { recursive: true, force: true });
