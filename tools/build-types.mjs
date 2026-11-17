// 16タイプの個別ページ（public/types/<コード>.html）と sitemap.xml を public/data.js から作る。
// タイプ名や文章を直したら `npm run build:types` で作り直す（作り直し忘れると npm test が落ちる）。
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

export const SITE = 'https://lovecode-9ax.pages.dev';
const root = new URL('../', import.meta.url);
const ctx = { window: {} };
vm.runInNewContext(readFileSync(new URL('public/data.js', root), 'utf8'), ctx);
export const LC = ctx.window.LC;

const HEART = 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z';
const ATT_ORDER = ['CO', 'EO', 'CK', 'EK'];
export const slug = (core) => core.toLowerCase();
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

// app.js の para() と同じ分け方：2文ごとに段落にし、「」や（）の中の句点では切らない
function para(text) {
  if (text.length < 110) return `<p>${text}</p>`;
  const out = []; let buf = '', depth = 0, n = 0;
  for (const ch of text) {
    buf += ch;
    if (ch === '「' || ch === '（') depth += 1;
    else if (ch === '」' || ch === '）') depth = Math.max(0, depth - 1);
    else if (ch === '。' && depth === 0) { n += 1; if (n === 2) { out.push(buf); buf = ''; n = 0; } }
  }
  if (buf) { if (out.length && buf.length < 30) out[out.length - 1] += buf; else out.push(buf); }
  return out.map((x) => `<p>${x}</p>`).join('');
}

// コードの4文字を、軸ごとの言葉に直す
export function letters(core) {
  return LC.AXES.map((ax, i) => {
    const pos = core[i] === ax.pos;
    return { letter: core[i], label: ax.label, name: pos ? ax.posName : ax.negName, other: pos ? `${ax.neg}：${ax.negName}` : `${ax.pos}：${ax.posName}` };
  });
}

export function summary(core) {
  const [name, tagline] = LC.TYPES[core], att = LC.ATT[core.slice(0, 2)], ls = letters(core);
  return `${name}（${core}）は、ラブコード診断の16タイプのひとつで、「${tagline}」です。愛着スタイルは${att.name}（${att.base}）。${ls.map((l) => `${l.label}は「${l.name}」`).join('、')}の組み合わせです。`;
}

function page(core) {
  const [name, tagline] = LC.TYPES[core], attKey = core.slice(0, 2), att = LC.ATT[attKey], q = attKey.toLowerCase();
  const url = `${SITE}/types/${slug(core)}`;
  const title = `${name}（${core}）の恋愛傾向とあるある｜ラブコード診断`;
  const desc = `${name}（${core}）は「${tagline}」。${att.name}（${att.base}）タイプの恋愛傾向、物語、恋愛あるあるを紹介します。無料の恋愛タイプ診断「ラブコード診断」の16タイプのひとつです。`;
  const question = `${name}（${core}）はどんなタイプ？`;
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'ラブコード診断', item: `${SITE}/` },
        { '@type': 'ListItem', position: 2, name: `${name}（${core}）`, item: url }
      ] },
      { '@type': 'FAQPage', mainEntity: [{ '@type': 'Question', name: question, acceptedAnswer: { '@type': 'Answer', text: summary(core) } }] }
    ]
  };
  const others = ATT_ORDER.map((a) => {
    const links = Object.keys(LC.TYPES).filter((c) => c.slice(0, 2) === a).map((c) =>
      c === core ? `<span class="tlink on">${LC.EMOJI[c]} ${LC.TYPES[c][0]}</span>` : `<a class="tlink" href="/types/${slug(c)}">${LC.EMOJI[c]} ${LC.TYPES[c][0]}</a>`).join('');
    return `<div class="tgroup"><span class="k">${LC.ATT[a].name}</span><div class="tlinks">${links}</div></div>`;
  }).join('\n      ');

  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#121013" media="(prefers-color-scheme: dark)">
<meta property="og:type" content="article">
<meta property="og:site_name" content="ラブコード診断">
<meta property="og:locale" content="ja_JP">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${esc(`${name}（${core}）｜${tagline}`)}">
<meta property="og:description" content="${esc(`${att.name}タイプの恋愛傾向とあるある。あなたはどのタイプ？ 30問・約5分の無料診断。`)}">
<meta property="og:image" content="${SITE}/og/${slug(core)}.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@500;700&display=swap">
<link rel="stylesheet" href="/style.css">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
</head>
<body data-view="type">
<header class="top">
  <div class="top-in">
    <a class="brand" href="/" aria-label="ラブコード診断 トップ">
      <svg viewBox="0 0 28 28" aria-hidden="true"><rect width="28" height="28" rx="8" fill="var(--accent)"/><path transform="translate(5 5.2) scale(.75)" fill="#fff" d="${HEART}"/></svg>
      ラブコード診断
    </a>
    <a class="btn small" href="/?start=1">無料で診断する <span class="arrow" aria-hidden="true">→</span></a>
  </div>
</header>
<main class="wrap">
  <nav class="crumbs" aria-label="現在の場所"><a href="/">ラブコード診断</a><span aria-hidden="true">›</span>16のラブタイプ<span aria-hidden="true">›</span>${name}</nav>
  <section class="codecard" style="--qc:var(--q-${q});--qt:var(--t-${q})">
    <span class="eyebrow">16のラブタイプ</span>
    <div class="em" aria-hidden="true">${LC.EMOJI[core]}</div>
    <div class="code">${core}</div>
    <h1>${name}</h1>
    <p class="tagline">${tagline}</p>
    <div class="chips"><span class="chip att">${att.name}</span><span class="chip">${att.base}タイプ</span></div>
  </section>
  <section class="sec">
    <h2>${question}</h2>
    <div class="prose"><p>${summary(core)}</p>${para(att.body)}</div>
    <div class="anatomy" aria-label="${core} の読み方">
      ${letters(core).map((l) => `<div class="slot"><b>${l.letter}</b><span>${l.name}</span><small>${l.other}</small></div>`).join('')}
    </div>
  </section>
  <section class="sec">
    <h2>${name}の物語</h2>
    <div class="prose">${para(LC.STORY[core])}</div>
  </section>
  <section class="sec">
    <h2>${name}の恋愛あるある</h2>
    <ul class="aruaru">${LC.ARUARU[core].map((x) => `<li>${x}</li>`).join('')}</ul>
  </section>
  <section class="visitor">
    <p><strong>あなたはどのタイプ？</strong><br>診断すると、16タイプに加えて、あなたに響く愛情言語もわかります。</p>
    <a class="btn" href="/?start=1">無料で診断する <span class="arrow" aria-hidden="true">→</span></a>
    <p class="note">30問・約5分・登録なし</p>
  </section>
  <section class="sec">
    <h2>ほかのラブタイプ</h2>
    <div class="tgroups">
      ${others}
    </div>
  </section>
  <p class="note">エンタメとしてお楽しみください。医学的・心理学的な診断ではありません。</p>
  <nav class="foot"><a href="/">トップ</a><a href="/legal">特定商取引法に基づく表記</a><a href="/legal#privacy">プライバシーポリシー</a></nav>
</main>
<script>if (navigator.sendBeacon) navigator.sendBeacon('/api/event', '{"name":"type_view"}');</script>
</body>
</html>
`;
}

function sitemap(day) {
  const urls = [`${SITE}/`, ...Object.keys(LC.TYPES).map((c) => `${SITE}/types/${slug(c)}`), `${SITE}/legal`];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u}</loc><lastmod>${day}</lastmod></url>`).join('\n')}
</urlset>
`;
}

// 作るファイルの一覧（public/ からの相対パス → 中身）。sitemap の日付は今ある値を引き継げるよう引数にしている
export function render(day) {
  const files = {};
  for (const core of Object.keys(LC.TYPES)) files[`types/${slug(core)}.html`] = page(core);
  files['sitemap.xml'] = sitemap(day);
  return files;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const day = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  mkdirSync(new URL('public/types/', root), { recursive: true });
  const files = render(day);
  for (const [path, body] of Object.entries(files)) writeFileSync(new URL('public/' + path, root), body);
  console.log(Object.keys(files).length, 'files');
}
