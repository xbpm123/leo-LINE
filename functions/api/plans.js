// GET /api/plans  料金表（画面の表示用）
import { PLANS } from '../../lib/plans.js';
import { json } from '../../lib/http.js';

export function onRequestGet() {
  return json(PLANS);
}
