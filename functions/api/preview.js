// GET /api/preview?code=EOSH-WP  →  { code, seen, step, strengths, lead, fade, chars }
// 有料レポートの冒頭（1文と少し）と、続きの文字数を返す。購入前の結果ページで「読みかけ」として見せる
import { buildPreview } from '../../lib/preview.js';
import { json } from '../../lib/http.js';

export async function onRequestGet({ request }) {
  const preview = buildPreview(new URL(request.url).searchParams.get('code') || '');
  if (!preview) return json({ error: 'コードが正しくありません' }, 400);
  return json(preview);
}
