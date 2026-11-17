// 計測する出来事の一覧。ここに無い名前は /api/event で受け付けない
export const EVENTS = [
  'lp_view',        // 導入ページを開いた
  'type_view',      // タイプ別ページを開いた
  'invite_open',    // 招待リンクから来た
  'quiz_start',     // 診断を始めた
  'quiz_q10',       // 10問目まで答えた
  'quiz_q20',       // 20問目まで答えた
  'quiz_done',      // 診断を終えて結果を見た
  'shared_view',    // シェアされた結果のリンクを開いた
  'plans_view',     // 料金プランが画面に入った
  'buy_click_lite', 'buy_click_standard', 'buy_click_pair',   // 購入ボタンを押した
  'purchase_lite', 'purchase_standard', 'purchase_pair',      // 購入してレポートが開いた
  'share_x', 'share_line', 'share_copy',                      // 結果をシェアした
  'invite_send',    // 相手に診断を送った
  'reply_send',     // 招待してくれた相手にコードを送り返した
  'link_copy'       // レポートのURLをコピーした
];

// 日本時間の日付（YYYY-MM-DD）
export function jstDay(now = Date.now()) {
  return new Date(now + 9 * 3600 * 1000).toISOString().slice(0, 10);
}
