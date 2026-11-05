// GET /api/report?session_id=cs_...  支払い済みなら、買ったプランのレポートを返す
import { buildReport } from '../../lib/premium.js';
import { json, stripe } from '../../lib/http.js';

export async function onRequestGet({ request, env }) {
  const id = new URL(request.url).searchParams.get('session_id') || '';
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(id)) return json({ error: '購入情報が見つかりません' }, 400);

  let session;
  try {
    session = await stripe(env, 'GET', 'checkout/sessions/' + id);
  } catch (e) {
    return json({ error: '購入情報が見つかりません' }, 404);
  }
  if (session.payment_status !== 'paid') return json({ error: 'お支払いがまだ完了していません', pending: true }, 402);

  const m = session.metadata || {};
  const report = buildReport(m.code, m.plan || 'lite', m.partner || null);
  if (!report) return json({ error: 'レポートを作れませんでした' }, 500);
  return json(report);
}
