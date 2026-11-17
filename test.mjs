// 採点・全パターンのレポート生成・APIの入力チェック・購入とアップグレードの流れを確認する
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { buildReport } from './lib/premium.js';
import { PLANS, upgradePrice } from './lib/plans.js';
import { onRequestPost } from './functions/api/checkout.js';
import { onRequestGet } from './functions/api/report.js';

const ctx = { window: {} };
vm.runInNewContext(readFileSync('./public/data.js', 'utf8'), ctx);
const LC = ctx.window.LC;

// 1) 採点
const r = LC.score(LC.LIKERT.map(() => 5), LC.PAIRS.map(() => 'a'));
assert.strictEqual(r.code.slice(0, 4), 'EKFH');
for (let i = 0; i < 10000; i++) {
  const s = LC.score(LC.LIKERT.map(() => 1 + Math.floor(Math.random() * 5)), LC.PAIRS.map(() => (Math.random() < .5 ? 'a' : 'b')));
  assert.ok(LC.parseCode(s.code), s.code);
}

// 2) 全コード×全プランで文章が欠けていない。文字数も測る
const LLs = ['W', 'T', 'G', 'A', 'P'];
const codes = [];
for (const core of Object.keys(LC.TYPES)) for (const a of LLs) for (const b of ['', ...LLs]) if (a !== b) codes.push(`${core}-${a}${b}`);
const chars = (o) => JSON.stringify(o).replace(/"[a-zA-Z]+":|[{}\[\]",]/g, '').replace(/[A-Z0-9-]/g, '').length;
const sums = { lite: [], standard: [], pair: [] };
for (const code of codes) {
  for (const plan of ['lite', 'standard']) {
    const rep = buildReport(code, plan);
    assert.ok(!JSON.stringify(rep).match(/undefined|null/), code + plan);
    sums[plan].push(chars(rep));
  }
}
for (const code of codes.filter((_, i) => i % 7 === 0)) for (const partner of codes.filter((_, i) => i % 11 === 0)) {
  const rep = buildReport(code, 'pair', partner);
  assert.ok(!JSON.stringify(rep).match(/undefined|null/), code + partner);
  sums.pair.push(chars(rep));
}
assert.strictEqual(buildReport('EOSH-WP', 'pair', 'bad'), null);
const avg = (a) => Math.round(a.reduce((x, y) => x + y, 0) / a.length);
console.log('codes:', codes.length, '| 平均文字数 ライト', avg(sums.lite), '/ スタンダード', avg(sums.standard), '/ ペア', avg(sums.pair));

// 3) 価格
assert.strictEqual(upgradePrice('lite', 'standard'), 1000);
assert.strictEqual(upgradePrice('lite', 'pair'), 2000);
assert.strictEqual(upgradePrice('standard', 'pair'), 1000);
assert.strictEqual(upgradePrice('pair', 'lite'), null);

// 4) Stripe をモックして API を通す
let sent, sessions = {};
globalThis.fetch = async (url, init) => {
  if (init.method === 'POST') { sent = new URLSearchParams(init.body); return new Response(JSON.stringify({ url: 'https://checkout.stripe.com/x' })); }
  const id = url.split('/').pop();
  return sessions[id] ? new Response(JSON.stringify(sessions[id])) : new Response('{"error":{"message":"no"}}', { status: 404 });
};
const env = { STRIPE_SECRET_KEY: 'sk_test_x' };
const post = (body) => onRequestPost({ request: new Request('https://lovecode.pages.dev/api/checkout', { method: 'POST', body: JSON.stringify(body) }), env });
const get = (id) => onRequestGet({ request: new Request('https://x/api/report?session_id=' + id), env });

assert.strictEqual((await post({ code: 'XXXX-Q', plan: 'lite' })).status, 400);
assert.strictEqual((await post({ code: 'EOSH-WP', plan: 'gold' })).status, 400);
assert.strictEqual((await post({ code: 'EOSH-WP', plan: 'pair' })).status, 400); // 相手のコードなし

assert.strictEqual((await post({ code: 'EOSH-WP', plan: 'standard' })).status, 200);
assert.strictEqual(sent.get('line_items[0][price_data][unit_amount]'), '1980');
assert.strictEqual(sent.get('metadata[plan]'), 'standard');

await post({ code: 'EOSH-WP', plan: 'pair', partner: 'CKSM-A' });
assert.strictEqual(sent.get('line_items[0][price_data][unit_amount]'), '2980');
assert.strictEqual(sent.get('metadata[partner]'), 'CKSM-A');

// アップグレード：ライト購入済み → スタンダードは差額1000円
sessions.cs_test_lite = { payment_status: 'paid', metadata: { code: 'EOSH-WP', plan: 'lite' } };
assert.strictEqual((await post({ code: 'EOSH-WP', plan: 'standard', upgradeFrom: 'cs_test_lite' })).status, 200);
assert.strictEqual(sent.get('line_items[0][price_data][unit_amount]'), '1000');
// 別のコードや下のプランへのアップグレードは不可
assert.strictEqual((await post({ code: 'COFH-W', plan: 'standard', upgradeFrom: 'cs_test_lite' })).status, 400);
assert.strictEqual((await post({ code: 'EOSH-WP', plan: 'lite', upgradeFrom: 'cs_test_lite' })).status, 400);
sessions.cs_test_unpaid = { payment_status: 'unpaid', metadata: { code: 'EOSH-WP', plan: 'lite' } };
assert.strictEqual((await post({ code: 'EOSH-WP', plan: 'standard', upgradeFrom: 'cs_test_unpaid' })).status, 400);

// レポート取得
assert.strictEqual((await get('hack')).status, 400);
assert.strictEqual((await get('cs_test_unpaid')).status, 402);
assert.strictEqual((await get('cs_test_lite').then((r) => r.json())).standard, undefined);
sessions.cs_test_pair = { payment_status: 'paid', metadata: { code: 'EOSH-WP', plan: 'pair', partner: 'CKSM-A' } };
const pr = await get('cs_test_pair').then((r) => r.json());
assert.ok(pr.together && pr.partner.code === 'CKSM-A' && pr.standard);

// 5) 導入ページ（静的HTML）が、データ・料金・構造化データとずれていない
const index = readFileSync('./public/index.html', 'utf8');
const llms = readFileSync('./public/llms.txt', 'utf8');
for (const [core, [name, tagline]] of Object.entries(LC.TYPES)) {
  assert.ok(index.includes(`${name}<code>${core}</code>`) && index.includes(tagline), 'index.html に ' + core + ' がない');
  assert.ok(index.includes(LC.EMOJI[core]), 'index.html に ' + core + ' の絵文字がない');
  assert.ok(llms.includes(`${core} ${name}「${tagline}」`), 'llms.txt に ' + core + ' がない');
}
for (const att of Object.values(LC.ATT)) assert.ok(index.includes(att.name) && llms.includes(att.name), att.name);
for (const [key, plan] of Object.entries(PLANS)) {
  const yen = plan.price.toLocaleString('ja-JP');
  assert.ok(index.includes(`<span data-price="${key}">${yen}</span>`), 'index.html の ' + key + ' の料金が lib/plans.js と違う');
  assert.ok(index.includes(`${plan.name}が${yen}円`), 'よくある質問の ' + key + ' の料金が lib/plans.js と違う');
  assert.ok(llms.includes(`${plan.name} ${yen}円`), 'llms.txt の ' + key + ' の料金が lib/plans.js と違う');
}
const ld = JSON.parse(index.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
const faq = ld['@graph'].find((x) => x['@type'] === 'FAQPage').mainEntity;
const shown = [...index.matchAll(/<details><summary>(.*?)<\/summary><p>(.*?)<\/p><\/details>/g)].map((m) => [m[1], m[2]]);
assert.ok(faq.length >= 8 && faq.length === shown.length, 'よくある質問の数が構造化データと違う');
faq.forEach((q, i) => {
  assert.strictEqual(q.name, shown[i][0]);
  assert.strictEqual(q.acceptedAnswer.text, shown[i][1]);
});
const offer = ld['@graph'].find((x) => x['@type'] === 'WebApplication').offers;
assert.strictEqual(offer.highPrice, String(Math.max(...Object.values(PLANS).map((x) => x.price))));
assert.ok(index.includes('<!--BODY-->') && index.includes('<!--/BODY-->'));
assert.strictEqual(index.match(/<h1[ >]/g).length, 1);
console.log('all tests passed');
