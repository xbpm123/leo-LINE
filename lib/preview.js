// 購入前に見せる「続きの冒頭」と、続きの文字数。文章の本体は lib/premium.js（サーバー側）にあり、ここからは冒頭だけを出す
import { buildReport } from './premium.js';

// レポートの文字数（キー名や記号、英数字のコードを除いたおおよその数）
export function countChars(o) {
  return JSON.stringify(o).replace(/"[a-zA-Z]+":|[{}\[\]",]/g, '').replace(/[A-Z0-9-]/g, '').length;
}

const round = (n) => Math.round(n / 100) * 100;

export function buildPreview(code) {
  const rep = buildReport(code, 'standard');
  if (!rep) return null;
  // 最初の章「恋人から見たあなた」の1文目は全部見せ、2文目は書き出しだけ（画面では薄く消えていく）
  const seen = rep.lite.seen, cut = seen.indexOf('。') + 1;
  const lite = countChars(rep.lite);
  return {
    code,
    lead: seen.slice(0, cut),
    fade: seen.slice(cut, cut + 14),
    chars: { lite: round(lite), standard: round(lite + countChars(rep.standard)) }
  };
}
