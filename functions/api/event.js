// POST /api/event  { name }  →  204
// 「何人がどこまで進んだか」を1日ごとの合計で数える。回答・診断結果・IPアドレスは受け取らないし保存しない
import { EVENTS, jstDay } from '../../lib/events.js';
import { json } from '../../lib/http.js';

const NAMES = new Set(EVENTS);

export async function onRequestPost({ request, env }) {
  const body = await request.json().catch(() => ({}));
  if (!body || !NAMES.has(body.name)) return json({ error: 'unknown event' }, 400);
  // データベースをつないでいない環境（ローカルなど）では何もしない
  if (env.DB) {
    try {
      await env.DB.prepare('INSERT INTO events (day, name, n) VALUES (?1, ?2, 1) ON CONFLICT (day, name) DO UPDATE SET n = n + 1')
        .bind(jstDay(), body.name).run();
    } catch (e) { /* 計測に失敗しても、サイトの動作には影響させない */ }
  }
  return new Response(null, { status: 204 });
}
