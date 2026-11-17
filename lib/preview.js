// 購入前に無料で見せる「続きの冒頭」と、残りの文字数。文章の本体は lib/premium.js（サーバー側）にあり、ここからは冒頭だけを出す
import { buildReport } from './premium.js';

// レポートの文字数（キー名や記号、英数字のコードを除いたおおよその数）
export function countChars(o) {
  return JSON.stringify(o).replace(/"[a-zA-Z]+":|[{}\[\]",]/g, '').replace(/[A-Z0-9-]/g, '').length;
}

const round = (n) => Math.round(n / 100) * 100;

export function buildPreview(code) {
  const rep = buildReport(code, 'standard');
  if (!rep) return null;
  const l = rep.lite;
  // 無料で全部読めるところ：最初の章「恋人から見たあなた」（今週からできる一歩まで）と、次の章の「強み」
  const free = { seen: l.seen, step: l.step, strengths: l.strengths };
  // 読みかけにするところ：「つまずきやすいところ」の1つ目は全部、2つ目は書き出しだけ（画面では薄く消えていく）
  const lead = l.pitfalls[0], fade = l.pitfalls[1].slice(0, 14);
  const rest = countChars(l) - countChars(free) - lead.length;
  return {
    code,
    ...free,
    lead,
    fade,
    chars: { lite: round(rest), standard: round(rest + countChars(rep.standard)) }
  };
}
