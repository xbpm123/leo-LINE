// public/ と lib/premium.js から、決済をモックした1ファイルのデモ版 dist/demo.html を作る
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const premium = read('./lib/plans.js').replace(/^export /gm, '') + read('./lib/premium.js').replace(/^export /gm, '');
const demoApi = `
${premium}
window.LC_API = {
  demo: true,
  plans: function () { return Promise.resolve(PLANS); },
  // デモでは購入内容を session_id に詰めて、決済なしでレポートを返す
  checkout: function (o) {
    var prev = o.upgradeFrom ? o.upgradeFrom.split('|') : null;
    return Promise.resolve({ sessionId: ['demo', o.code, o.plan, o.partner || (prev && prev[3]) || ''].join('|') });
  },
  report: function (sid) { var s = sid.split('|'); return Promise.resolve(buildReport(s[1], s[2], s[3] || null)); }
};`;

// 本文（ヘッダー・導入ページ・#app）は本番の index.html からそのまま使う。デモに無いページへのリンクは外す
const index = read('./public/index.html');
const body = index.slice(index.indexOf('<!--BODY-->'), index.indexOf('<!--/BODY-->')).replace(/<!--NODEMO-->[\s\S]*?<!--\/NODEMO-->/g, '');
if (!body.includes('id="lp"') || !body.includes('id="app"')) throw new Error('index.html から本文を取り出せませんでした');

const html = `<title>ラブコード診断</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@500;700&display=swap">
<style>
${read('./public/style.css')}
</style>
${body}
<script>
${read('./public/data.js')}
</script>
<script>
${demoApi}
</script>
<script>
${read('./public/app.js')}
</script>
`;
mkdirSync(new URL('./dist/', import.meta.url), { recursive: true });
writeFileSync(new URL('./dist/demo.html', import.meta.url), html);
console.log('dist/demo.html', html.length, 'bytes');
