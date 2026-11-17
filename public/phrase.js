// 短い文（見出し・質問・キャッチコピー）を、文節の切れ目でだけ改行させる。
// CSS の word-break: auto-phrase は iPhone の Safari では効かないので、どのブラウザでも同じ結果になるよう自前でやる。
// やり方: 切ってよい位置に <wbr> を入れ、.ph（word-break: keep-all）でそれ以外の位置では切れないようにする。
// 長い本文には使わない（本文は行の端まで詰めたほうが読みやすい）。
(function (root) {
  // 漢字1字のあとに付くひらがな1字が、この中の文字なら、そこで切ってよい（助詞や活用語尾の終わり）。例: 返信が|遅い
  // 「り」「き」「し」「い」などは入れない（贈り物・取り扱い・付き合い・話し合い・思い出 のような語の途中で切れるため）
  var TAIL = 'がをにはへとでものやかてばらどなるたずうくす';
  var STOP = '、。！？';          // このあとは切ってよい
  var CLOSE = '」』）';           // 閉じかっこ。あとに助詞が続くときは切らない（「…」と|話せる）
  var OPEN = '「『（';
  var HIRA = /[ぁ-ゖ]/;
  var KANJI = /[一-龠々〆ヶ]/;
  var START = /[一-龠々〆ヶァ-ヴA-Za-z0-9０-９]/;   // 次の語の始まりになる文字
  var SUFFIX = '型達方用的';      // 前の語にくっつく漢字（やり方・あなた達）。この前では切らない
  // 途中で切りたくない語（上の規則だと切れてしまうもの）
  var KEEP = ['ひだまり型', 'ひとり時間', 'たしかめ型', 'ゆらぎ型', '愛の言語', '一緒の時間', 'この', 'その', 'あの', 'どの', 'もう一', '女の子', '男の子', 'やり直', 'やり取'];

  // 切ってよい位置（その位置の文字の前で切れる）を返す
  function points(text) {
    var out = [], i, k, from;
    var locked = {};
    for (k = 0; k < KEEP.length; k++) {
      from = text.indexOf(KEEP[k]);
      while (from >= 0) {
        // 「この」「その」などは、うしろの語と離さない（その|日 にしない）
        for (i = from + 1; i <= from + KEEP[k].length - (KEEP[k].length > 2 ? 1 : 0); i++) locked[i] = true;
        from = text.indexOf(KEEP[k], from + 1);
      }
    }
    for (i = 1; i < text.length; i++) {
      if (locked[i]) continue;
      var a = text.charAt(i - 1), b = text.charAt(i), c = text.charAt(i + 1);
      if (STOP.indexOf(b) >= 0 || CLOSE.indexOf(b) >= 0) continue;   // 句読点や閉じかっこを行頭に送らない
      if (STOP.indexOf(a) >= 0) { out.push(i); continue; }
      if (CLOSE.indexOf(a) >= 0) { if (!HIRA.test(b)) out.push(i); continue; }
      if (OPEN.indexOf(b) >= 0) { if (OPEN.indexOf(a) < 0) out.push(i); continue; }
      if (!HIRA.test(a) || !START.test(b)) continue;
      if (SUFFIX.indexOf(b) >= 0 && !KANJI.test(c)) continue;
      // 助詞などのあと、またはひらがなが2字以上続いたあとは、次の語の前で切ってよい
      if (TAIL.indexOf(a) >= 0 || HIRA.test(text.charAt(i - 2))) out.push(i);
    }
    // 最後に1〜2文字だけが次の行に落ちる切り方はしない（「…する人」の「人」だけが残る、など）
    var tail = text.replace(/[、。！？」』）]+$/, '').length;
    out = out.filter(function (p) { return tail - p > 2 && p > 1; });
    return out;
  }

  // 文節ごとに分けた配列（テスト用）
  function split(text) {
    var p = points(text), out = [], last = 0;
    for (var i = 0; i < p.length; i++) { out.push(text.slice(last, p[i])); last = p[i]; }
    out.push(text.slice(last));
    return out;
  }

  // HTML の文字列にして返す。タグを含む文字列はそのまま返す
  function html(text) {
    text = String(text);
    if (text.indexOf('<') >= 0) return text;
    return '<span class="ph">' + split(text).join('<wbr>') + '</span>';
  }

  // すでにページにある要素に適用する（中のタグは残し、文字の部分にだけ <wbr> を入れる）
  function apply(scope, selector) {
    var els = scope.querySelectorAll(selector);
    for (var e = 0; e < els.length; e++) {
      var el = els[e];
      if (el.classList.contains('ph')) continue;
      el.classList.add('ph');
      var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null), nodes = [], n;
      while ((n = walker.nextNode())) nodes.push(n);
      for (var i = 0; i < nodes.length; i++) {
        var parts = split(nodes[i].nodeValue);
        if (parts.length < 2) continue;
        var frag = document.createDocumentFragment();
        for (var j = 0; j < parts.length; j++) {
          if (j) frag.appendChild(document.createElement('wbr'));
          frag.appendChild(document.createTextNode(parts[j]));
        }
        nodes[i].parentNode.replaceChild(frag, nodes[i]);
      }
    }
  }

  // 長い本文用：段落の最後の数文字をひとかたまりにして、最後の行に1〜2文字だけ落ちるのを防ぐ（「…ます。」だけの行を作らない）
  function tail(scope, selector) {
    var els = scope.querySelectorAll(selector);
    for (var e = 0; e < els.length; e++) {
      var el = els[e];
      if (el.classList.contains('ph') || el.hasAttribute('data-tail') || el.closest('.ph')) continue;
      el.setAttribute('data-tail', '');
      var node = el.lastChild;
      while (node && node.nodeType === 1 && node.lastChild && !/^(BUTTON|A|UL|OL|DL|DIV|DETAILS)$/.test(node.tagName)) node = node.lastChild;
      if (!node || node.nodeType !== 3) continue;
      var text = node.nodeValue.replace(/\s+$/, '');
      if (text.length < 12) continue;
      var cut = text.length - 6;
      // かたまりの先頭に、行頭に置けない文字（句読点・閉じかっこ・小さいかな・長音）が来ないようにする
      while (cut > 0 && /[、。！？」』）ぁぃぅぇぉっゃゅょァィゥェォッャュョー]/.test(text.charAt(cut))) cut -= 1;
      var span = document.createElement('span');
      span.className = 'nw';
      span.textContent = text.slice(cut);
      node.nodeValue = text.slice(0, cut);
      node.parentNode.insertBefore(span, node.nextSibling);
    }
  }

  root.LCPhrase = { split: split, html: html, apply: apply, tail: tail };
})(typeof window !== 'undefined' ? window : globalThis);
