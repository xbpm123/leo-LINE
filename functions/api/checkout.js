// POST /api/checkout  { code, plan, partner?, upgradeFrom? }  →  { url }
// upgradeFrom に購入済みの session_id を渡すと、差額だけで上のプランに上げられる
import { parseCode } from '../../lib/premium.js';
import { PLANS, upgradePrice } from '../../lib/plans.js';
import { json, stripe } from '../../lib/http.js';

const SESSION_RE = /^cs_(test|live)_[A-Za-z0-9]+$/;

export async function onRequestPost({ request, env }) {
  const { code, plan, partner, upgradeFrom } = await request.json().catch(() => ({}));
  if (!parseCode(code)) return json({ error: 'コードが正しくありません' }, 400);
  if (!PLANS[plan]) return json({ error: 'プランが正しくありません' }, 400);
  if (plan === 'pair' && !parseCode(partner)) return json({ error: '相手のコードを正しく入力してください' }, 400);

  let amount = PLANS[plan].price;
  let label = 'ラブコード診断 ' + PLANS[plan].name + 'レポート（' + code + '）';
  if (upgradeFrom) {
    if (!SESSION_RE.test(upgradeFrom)) return json({ error: '購入情報が見つかりません' }, 400);
    let prev;
    try { prev = await stripe(env, 'GET', 'checkout/sessions/' + upgradeFrom); } catch (e) { return json({ error: '購入情報が見つかりません' }, 404); }
    const prevPlan = (prev.metadata && prev.metadata.plan) || 'lite';
    const diff = upgradePrice(prevPlan, plan);
    if (prev.payment_status !== 'paid' || prev.metadata.code !== code || diff === null) {
      return json({ error: 'このアップグレードはできません' }, 400);
    }
    amount = diff;
    label = 'ラブコード診断 ' + PLANS[plan].name + 'へのアップグレード（' + code + '）';
  }

  const origin = new URL(request.url).origin;
  const form = new URLSearchParams({
    mode: 'payment',
    locale: 'ja',
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': 'jpy',
    'line_items[0][price_data][unit_amount]': String(amount),
    'line_items[0][price_data][product_data][name]': label,
    'metadata[code]': code,
    'metadata[plan]': plan,
    success_url: origin + '/?session_id={CHECKOUT_SESSION_ID}',
    // 決済をやめて戻ってきた人には、結果ページで「料金はかかっていません」と伝える
    cancel_url: origin + '/?canceled=1#' + code
  });
  if (plan === 'pair') form.set('metadata[partner]', partner);
  if (upgradeFrom) form.set('metadata[upgraded_from]', upgradeFrom);

  try {
    const session = await stripe(env, 'POST', 'checkout/sessions', form);
    return json({ url: session.url });
  } catch (e) {
    return json({ error: '決済ページを作れませんでした。時間をおいてもう一度試してください。' }, 502);
  }
}
