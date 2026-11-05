(function () {
  var LC = window.LC, API = window.LC_API;
  var app = document.getElementById('app');
  var ATT_COLOR = { CO: 'var(--q-co)', EO: 'var(--q-eo)', CK: 'var(--q-ck)', EK: 'var(--q-ek)' };
  var ATT_ORDER = ['CO', 'EO', 'CK', 'EK'];
  var TOTAL = LC.LIKERT.length + LC.PAIRS.length;
  var state = { likert: [], pairs: [], i: 0 };

  function load(key, fallback) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* 保存できなくても診断は動く */ }
  }
  function setHash(code) {
    try { history.replaceState(null, '', location.pathname + (code ? '#' + code : '')); } catch (e) { /* 表示には影響しない */ }
  }
  function llNames(list) { return list.map(function (k) { return LC.LL[k].name; }).join('・'); }

  // ---------- intro ----------
  function renderIntro() {
    setHash('');
    var rows = ATT_ORDER.map(function (att) {
      var a = LC.ATT[att];
      var tiles = Object.keys(LC.TYPES).filter(function (c) { return c.slice(0, 2) === att; }).map(function (c) {
        var t = LC.TYPES[c];
        return '<button class="tile" style="--qc:' + ATT_COLOR[att] + '" data-core="' + c + '"><code>' + c + '</code><strong>' + t[0] + '</strong><span>' + t[1] + '</span></button>';
      }).join('');
      return '<div class="typerow"><h3>' + a.name + '<span class="base">' + a.base + 'タイプ</span></h3><div class="tiles">' + tiles + '</div></div>';
    }).join('');

    var demo = API.demo ? (
      '<section class="panel"><span class="eyebrow">制作者用ビューア</span>' +
      '<p class="muted">16タイプ×愛情言語15通り＝240パターンの結果を直接確認できます。</p>' +
      '<div class="viewer">' +
      '<label for="v-core">タイプ<select id="v-core">' + Object.keys(LC.TYPES).map(function (c) { return '<option value="' + c + '">' + c + ' ' + LC.TYPES[c][0] + '</option>'; }).join('') + '</select></label>' +
      '<label for="v-ll1">メイン<select id="v-ll1">' + LC.LL_ORDER.map(function (k) { return '<option value="' + k + '">' + k + ' ' + LC.LL[k].name + '</option>'; }).join('') + '</select></label>' +
      '<label for="v-ll2">サブ<select id="v-ll2"><option value="">なし</option>' + LC.LL_ORDER.map(function (k) { return '<option value="' + k + '">' + k + ' ' + LC.LL[k].name + '</option>'; }).join('') + '</select></label>' +
      '<button class="btn small" id="v-go">この結果を見る</button></div></section>'
    ) : '';

    app.innerHTML =
      (API.demo ? '<div class="demo-banner">デモ版です。決済はStripeにつながず、「購入する」を押すとそのまま有料レポートが開きます。</div>' : '') +
      '<section class="hero">' +
      '<h1><small>LOVE CODE</small>ラブコード診断</h1>' +
      '<p class="lead">恋をすると出てくる「不安のクセ」と、あなたが愛を感じる「愛情言語」。この2つから、あなたの恋愛を英字のコードにします。</p>' +
      '<div class="actions"><button class="btn" id="start">診断をはじめる</button><span class="muted">30問・約5分</span></div>' +
      (API.demo ? '<div class="actions"><button class="linkbtn" id="random">ランダムに回答して結果を見る（テスト用）</button></div>' : '') +
      '</section>' +
      '<section class="panel"><span class="eyebrow">コードの読み方</span>' +
      '<div class="anatomy">' +
      slot('E / C', 'たしかめたい<br>安心している') + slot('K / O', '距離を保つ<br>近づく') + slot('F / S', 'すぐ動く<br>じっくり') + slot('H / M', '気持ち<br>頭') +
      '<span class="dash">-</span>' + slot('W T G A P', '愛情言語<br>1〜2個', 'll') +
      '</div>' +
      '<p class="note">前半の2文字が恋愛の愛着スタイル（安定・不安・回避・恐れ回避の4つ）、後半の2文字が恋のペースと判断の仕方。ハイフンの後ろは、言葉(W)・一緒の時間(T)・贈り物(G)・行動(A)・スキンシップ(P)のうち、あなたに響くもの。</p>' +
      '</section>' +
      '<section class="typegrid"><span class="eyebrow">16のラブタイプ</span>' + rows + '</section>' +
      demo +
      '<p class="note">エンタメとしてお楽しみください。医学的・心理学的な診断ではありません。愛着スタイルは成人の愛着研究（不安・回避の2軸）、愛情言語はゲーリー・チャップマン氏の「5つの愛の言語」の考え方を参考にした独自の質問です。</p>' +
      footer();

    document.getElementById('start').onclick = startQuiz;
    var r = document.getElementById('random');
    if (r) r.onclick = function () {
      state.likert = LC.LIKERT.map(function () { return 1 + Math.floor(Math.random() * 5); });
      state.pairs = LC.PAIRS.map(function () { return Math.random() < 0.5 ? 'a' : 'b'; });
      finish();
    };
    var go = document.getElementById('v-go');
    if (go) go.onclick = function () {
      var a = document.getElementById('v-ll1').value, b = document.getElementById('v-ll2').value;
      var code = document.getElementById('v-core').value + '-' + a + (b && b !== a ? b : '');
      showResult(code, null);
    };
    Array.prototype.forEach.call(app.querySelectorAll('.tile'), function (t) {
      t.onclick = function () {
        if (API.demo) { document.getElementById('v-core').value = t.dataset.core; document.getElementById('v-go').scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      };
    });
    window.scrollTo(0, 0);
  }

  function slot(big, small, cls) { return '<div class="slot ' + (cls || '') + '"><b>' + big + '</b><span>' + small + '</span></div>'; }
  function footer() {
    if (API.demo) return '';
    return '<nav class="foot"><a href="legal.html">特定商取引法に基づく表記</a><a href="legal.html#privacy">プライバシーポリシー</a></nav>';
  }

  // ---------- quiz ----------
  function startQuiz() { state = { likert: [], pairs: [], i: 0 }; renderQuestion(); }

  function renderQuestion() {
    var i = state.i, isPair = i >= LC.LIKERT.length;
    var body;
    if (!isPair) {
      var cur = state.likert[i];
      body = '<p class="eyebrow">あてはまる？</p><p class="qtext">' + LC.LIKERT[i].q + '</p>' +
        '<div class="likert"><div class="dots">' + [1, 2, 3, 4, 5].map(function (v) {
          var label = ['そう思わない', 'あまりそう思わない', 'どちらでもない', 'ややそう思う', 'そう思う'][v - 1];
          return '<button data-v="' + v + '" aria-label="' + label + '"' + (cur === v ? ' class="on"' : '') + '></button>';
        }).join('') + '</div><div class="ends"><span>そう思わない</span><span>そう思う</span></div></div>';
    } else {
      var p = LC.PAIRS[i - LC.LIKERT.length], c = state.pairs[i - LC.LIKERT.length];
      body = '<p class="eyebrow">恋人にされて、より嬉しいのは？</p>' +
        '<div class="choices"><button data-v="a"' + (c === 'a' ? ' class="on"' : '') + '>' + p.qa + '</button><button data-v="b"' + (c === 'b' ? ' class="on"' : '') + '>' + p.qb + '</button></div>';
    }
    app.innerHTML =
      '<div class="progress"><div class="meta"><span>' + (isPair ? 'パート2 愛情言語' : 'パート1 恋のクセ') + '</span><span>' + (i + 1) + ' / ' + TOTAL + '</span></div>' +
      '<div class="bar"><i style="width:' + Math.round((i / TOTAL) * 100) + '%"></i></div></div>' +
      '<section class="qcard">' + body + '</section>' +
      '<div class="qnav"><button class="linkbtn" id="back">' + (i === 0 ? 'トップに戻る' : 'ひとつ前へ') + '</button></div>';

    Array.prototype.forEach.call(app.querySelectorAll('.qcard button'), function (b) {
      b.onclick = function () {
        if (isPair) state.pairs[i - LC.LIKERT.length] = b.dataset.v; else state.likert[i] = Number(b.dataset.v);
        b.classList.add('on');
        setTimeout(function () { if (state.i + 1 >= TOTAL) finish(); else { state.i += 1; renderQuestion(); } }, 160);
      };
    });
    document.getElementById('back').onclick = function () { if (state.i === 0) renderIntro(); else { state.i -= 1; renderQuestion(); } };
  }

  function finish() {
    var r = LC.score(state.likert, state.pairs);
    save('lc_last', { code: r.code, pct: r.pct });
    showResult(r.code, r.pct);
  }

  // ---------- result ----------
  function showResult(code, pct) {
    var p = LC.parseCode(code);
    if (!p) return renderIntro();
    if (!pct) { var last = load('lc_last', null); if (last && last.code === code) pct = last.pct; }
    setHash(code);
    var t = LC.TYPES[p.core], a = LC.ATT[p.att];

    var axes = pct ? '<section class="panel axes"><span class="eyebrow">あなたの傾き</span>' + LC.AXES.map(function (ax, i) {
      var v = pct[i], toPos = v > 50, w = Math.abs(v - 50);
      return '<div class="axis"><div class="names"><span>' + (toPos ? ax.negName : '<b>' + ax.negName + '</b>') + '</span><span>' + (toPos ? '<b>' + ax.posName + '</b>' : ax.posName) + '</span></div>' +
        '<div class="track"><i style="left:' + (toPos ? 50 : 50 - w) + '%;width:' + Math.max(w, 1.5) + '%"></i></div>' +
        '<div class="label">' + ax.label + '　' + (toPos ? ax.posName : ax.negName) + ' ' + Math.max(v, 100 - v) + '%</div></div>';
    }).join('') + '</section>' : '';

    app.innerHTML =
      '<section class="codecard" style="--qc:' + ATT_COLOR[p.att] + '">' +
      '<span class="eyebrow">あなたのラブコード</span>' +
      '<div class="code">' + p.core + '<em>-' + p.ll.join('') + '</em></div>' +
      '<h2>' + t[0] + '</h2><p>' + t[1] + '</p>' +
      '<div class="chips"><span class="chip att">' + a.name + '</span>' + p.ll.map(function (k, i) { return '<span class="chip">' + (i ? 'サブ ' : 'メイン ') + LC.LL[k].name + '</span>'; }).join('') + '</div>' +
      '</section>' +
      axes +
      '<section class="sec"><h3>' + a.name + 'のあなた <span class="tag free">無料</span></h3><p>' + a.body + '</p></section>' +
      '<section class="sec"><h3>' + t[0] + 'の物語 <span class="tag free">無料</span></h3><p>' + LC.STORY[p.core] + '</p></section>' +
      '<section class="sec"><h3>' + t[0] + 'の恋愛あるある <span class="tag free">無料</span></h3>' + list(LC.ARUARU[p.core]) + '</section>' +
      '<section class="sec"><h3>あなたに響く愛情言語 <span class="tag free">無料</span></h3><dl class="kv">' + p.ll.map(function (k) {
        return '<div><dt>' + LC.LL[k].name + '（' + LC.LL[k].en + '）</dt><dd style="margin:0">' + LC.LL[k].short + '</dd></div>';
      }).join('') + '</dl></section>' +
      '<div id="premium"></div><div id="upgrade"></div>' +
      '<div class="actions" style="display:flex;flex-wrap:wrap;gap:12px">' +
      '<button class="btn ghost small" id="share">結果をコピー</button><button class="btn ghost small" id="again">もう一度診断する</button><button class="btn ghost small" id="top">トップへ</button></div>' +
      footer();

    document.getElementById('again').onclick = startQuiz;
    document.getElementById('top').onclick = renderIntro;
    document.getElementById('share').onclick = function (e) {
      var text = '私のラブコードは ' + code + '「' + t[0] + '」でした。' + t[1] + '。 #ラブコード診断';
      var btn = e.currentTarget;
      var done = function () { btn.textContent = 'コピーしました'; };
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, function () { btn.textContent = text; });
      else btn.textContent = text;
    };

    var owned = getPaid(code);
    if (owned) loadPremium(code, owned); else renderPlans(code, null);
    window.scrollTo(0, 0);
  }

  // ---------- 購入 ----------
  var PLAN_INFO = {
    lite: { name: 'ライト', lead: '自分の取扱説明書', items: ['恋人から見たあなたと、今週からできる一歩', '恋の強み・つまずき・要注意サイン', '合う恋人と、気をつけたい相手', '恋のペース、アプローチ、デート、LINE', '愛情言語の取扱説明、もらって嬉しいことリスト、おすすめのデート', '相手の愛情言語の見分け方', 'つい言ってしまう一言の言い換え', '恋のQ&A', 'うまくいくための5つのことと、セルフケア', '恋人に見せる取扱説明書'] },
    standard: { name: 'スタンダード', lead: 'ライトの全部＋恋の実践編', items: ['ライトの内容すべて', 'ケンカのパターンと、ケンカ中にやらないほうがいいこと', '仲直りの4ステップと、ケンカの基本ルール', '長続きする二人の習慣と、マンネリしたとき', '嫉妬、失恋、復縁', '同棲・結婚を考えたとき', 'マッチングアプリでの恋', '片思い・付き合いたて・長く付き合っている時期のアドバイス', '16タイプとの付き合いやすさと、付き合うときのコツ', '相手のコードを入れて見る相性チェック'] },
    pair: { name: 'ペア', lead: '2人分＋2人だけの相性レポート', items: ['あなたと相手、2人分のスタンダード', '2人の間で起きやすいズレの具体例', 'そのまま使える会話のテンプレ', '2人の愛情言語の届け方', '2人におすすめの習慣'] }
  };
  var PLAN_KEYS = ['lite', 'standard', 'pair'];
  var plans = null;

  function getPaid(code) {
    var v = load('lc_paid', {})[code];
    if (!v) return null;
    return typeof v === 'string' ? { sid: v, plan: 'lite' } : v;
  }
  function savePaid(code, sid, plan) {
    var paid = load('lc_paid', {}), cur = paid[code];
    var curRank = cur && cur.plan && plans ? plans[cur.plan].rank : 0;
    if (!plans || !cur || plans[plan].rank >= curRank) { paid[code] = { sid: sid, plan: plan }; save('lc_paid', paid); }
  }
  function yen(n) { return n.toLocaleString('ja-JP'); }

  // owned: 購入済みのプラン（なければ null）。上のプランだけを差額で並べる
  function renderPlans(code, owned) {
    var el = document.getElementById(owned ? 'upgrade' : 'premium');
    var ownedRank = owned ? plans[owned.plan].rank : 0;
    var keys = PLAN_KEYS.filter(function (k) { return plans[k].rank > ownedRank; });
    if (!keys.length) { el.innerHTML = ''; return; }
    var cards = keys.map(function (k) {
      var info = PLAN_INFO[k], price = plans[k].price - (owned ? plans[owned.plan].price : 0);
      var star = k === 'standard' && !owned;
      return '<div class="plan' + (star ? ' star' : '') + '">' +
        (star ? '<span class="badge">いちばん人気</span>' : '') +
        '<span class="eyebrow">' + info.name.toUpperCase() + '</span>' +
        '<h4>' + info.lead + '</h4>' +
        '<div class="price">' + yen(price) + '<small> 円（税込）' + (owned ? '・差額' : '') + '</small></div>' +
        (k === 'pair' ? '<p class="note">1人あたり ' + yen(plans.pair.price / 2) + '円</p>' : '') +
        '<ul>' + info.items.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>' +
        (k === 'pair' ? '<label class="note" for="pair-partner">相手のラブコード（先に相手にも無料診断してもらってね）</label><input type="text" id="pair-partner" placeholder="例：CKSM-A" autocomplete="off">' : '') +
        '<button class="btn' + (star ? '' : ' ghost') + '" data-plan="' + k + '">' + (owned ? info.name + 'にアップグレード' : info.name + 'を購入') + '</button>' +
        '</div>';
    }).join('');
    el.innerHTML = '<section class="sec"><span class="eyebrow">' + (owned ? 'もっと読む' : '詳しいレポート') + '</span>' +
      '<h3>' + (owned ? '差額だけで、上のプランにアップグレードできます' : '恋をうまくいかせるための、あなた専用の取扱説明書') + '</h3>' +
      '<div class="plans">' + cards + '</div><p class="err" id="buy-err" hidden></p>' +
      '<p class="note">買い切りです。クレジットカード、Apple Pay、Google Pay に対応。決済は Stripe で安全に処理されます。</p></section>';

    Array.prototype.forEach.call(el.querySelectorAll('button[data-plan]'), function (btn) {
      btn.onclick = function () {
        var plan = btn.dataset.plan, err = document.getElementById('buy-err'), partner = null;
        if (plan === 'pair') {
          partner = normalize(document.getElementById('pair-partner').value);
          if (!LC.parseCode(partner)) { err.hidden = false; err.textContent = '相手のコードを「CKSM-A」のような形で入力してください。'; return; }
        }
        var label = btn.textContent;
        btn.disabled = true; btn.textContent = '決済ページを準備中…'; err.hidden = true;
        API.checkout({ code: code, plan: plan, partner: partner, upgradeFrom: owned ? owned.sid : null }).then(function (res) {
          if (res.url) { location.href = res.url; return; }
          if (res.sessionId) { savePaid(code, res.sessionId, plan); showResult(code, null); return; }
          throw new Error(res.error || '決済ページを開けませんでした');
        }).catch(function (x) {
          btn.disabled = false; btn.textContent = label;
          err.hidden = false; err.textContent = x.message;
        });
      };
    });
  }

  function loadPremium(code, owned) {
    var el = document.getElementById('premium');
    el.innerHTML = '<p class="muted">レポートを読み込んでいます…</p>';
    API.report(owned.sid).then(function (rep) {
      if (!rep || rep.error) throw new Error((rep && rep.error) || 'レポートを読み込めませんでした');
      renderPremium(code, rep);
      renderPlans(code, { sid: owned.sid, plan: rep.plan });
    }).catch(function (x) {
      el.innerHTML = '<p class="err">' + x.message + '</p>';
    });
  }

  function normalize(raw) { return (raw || '').trim().toUpperCase().replace(/[－ー―‐]/g, '-'); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }
  function tag(plan) { return ' <span class="tag paid">' + PLAN_INFO[plan].name + '</span>'; }
  function list(items, cls) { return '<ul class="' + (cls || 'dots') + '">' + items.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>'; }
  function kv(label, body) { return '<div><span class="k">' + label + '</span>' + (body.charAt(0) === '<' ? body : '<p>' + body + '</p>') + '</div>'; }
  function stars(score) { var n = Math.max(1, Math.min(5, Math.round(score / 20))); return '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n); }

  // 恋人に見せる取扱説明書をコピー用の平文にする
  function guideText(p, g) {
    var lines = ['【' + LC.TYPES[p.core][0] + '（' + p.core + '-' + p.ll.join('') + '）の取扱説明書】', g.att, g.pace];
    lines.push('この人に愛情がいちばん伝わるのは「' + g.ll.map(function (x) { return x.name; }).join('」と「') + '」です。たとえば「' + g.ll[0].action + '」だけでも、ちゃんと伝わります。');
    return lines.join('\n');
  }

  function selfHtml(p, l) {
    var a = LC.ATT[p.att];
    return '<section class="sec"><h3>恋人から見たあなた' + tag('lite') + '</h3><p>' + l.seen + '</p>' +
      '<div class="kv">' + kv('今週からできる一歩', '<div class="ask">' + l.step + '</div>') + '</div></section>' +
      '<section class="sec"><h3>' + a.name + '（' + a.base + '）を深く知る' + tag('lite') + '</h3><p>' + l.portrait + '</p><p>' + l.loop + '</p>' +
      '<div class="kv">' + kv('強み', list(l.strengths)) + kv('つまずきやすいところ', list(l.pitfalls)) + kv('こんなときは要注意', list(l.signs)) + '</div></section>' +
      '<section class="sec"><h3>合う恋人と、気をつけたい相手' + tag('lite') + '</h3><div class="kv">' + kv('あなたに合う恋人', l.match) + kv('気をつけたい相手', l.caution) + '</div></section>' +
      '<section class="sec"><h3>恋のペース「' + l.pace.title + '」' + tag('lite') + '</h3><p>' + l.pace.body + '</p>' +
      '<div class="kv">' + kv('アプローチ・告白', l.pace.approach) + kv('デート', l.pace.date) + kv('連絡・LINE', l.pace.line) + '</div></section>' +
      '<section class="sec"><h3>愛情言語の取扱説明' + tag('lite') + '</h3>' + l.ll.map(function (x) {
        return '<div class="panel"><span class="eyebrow">' + LC.LL[x.key].name + '</span><div class="kv">' +
          kv('こうされると満たされる', x.need) + kv('気をつけたいこと', x.give) + kv('足りていないサイン', x.starving) +
          kv('もらって嬉しいことリスト', list(x.joys)) + (x.key === l.ll[0].key ? kv('おすすめのデート', list(l.dates)) : '') + kv('あなたが贈るときのコツ', x.giveTips) + kv('相手の愛情言語が違うとき', x.receive) +
          kv('恋人へのお願いの例文', x.phrases.map(function (s) { return '<div class="ask">「' + s + '」</div>'; }).join('')) + '</div></div>';
      }).join('') + '</section>' +
      '<section class="sec"><h3>' + a.name + '×愛情言語' + tag('lite') + '</h3><div class="kv">' + l.cross.map(function (c) { return kv(LC.LL[c.key].name, c.text); }).join('') + '</div></section>' +
      '<section class="sec"><h3>相手の愛情言語の見分け方' + tag('lite') + '</h3><p>' + l.spot.intro + '</p><div class="kv">' + l.spot.hints.map(function (h) { return kv(h[0], h[1]); }).join('') + '</div><p>' + l.spot.outro + '</p></section>' +
      '<section class="sec"><h3>つい言ってしまう一言の言い換え' + tag('lite') + '</h3><div class="rephrase">' + l.rephrase.map(function (r) {
        return '<div><span class="before">「' + r[0] + '」</span><span class="after">「' + r[1] + '」</span></div>';
      }).join('') + '</div></section>' +
      '<section class="sec"><h3>うまくいくための5つのこと' + tag('lite') + '</h3><ol class="tips">' + l.tips.map(function (x) { return '<li><span><strong>' + x.t + '</strong><br><span class="muted">' + x.why + '</span></span></li>'; }).join('') + '</ol></section>' +
      '<section class="sec"><h3>恋のQ&amp;A' + tag('lite') + '</h3><div class="qa">' + l.qa.map(function (x) { return '<div><p class="q">' + x.q + '</p><p>' + x.a + '</p></div>'; }).join('') + '</div></section>' +
      '<section class="sec"><h3>自分を満たすためのセルフケア' + tag('lite') + '</h3>' + list(l.selfcare) + '</section>' +
      '<section class="sec"><h3>愛着スタイルは変わるの？' + tag('lite') + '</h3><p>' + l.change + '</p></section>' +
      '<section class="sec panel guide"><h3>恋人に見せる取扱説明書' + tag('lite') + '</h3>' +
      '<p class="note">恋人や気になる人に、そのまま送れる文章です。「この人」はあなたのことです。</p>' +
      '<p>' + l.guide.att + '</p><p>' + l.guide.pace + '</p>' +
      '<p>この人に愛情がいちばん伝わるのは「' + l.guide.ll.map(function (x) { return x.name; }).join('」と「') + '」です。たとえば次のようなことです。</p>' +
      list(l.guide.ll.map(function (x) { return x.action; })) +
      '<div><button class="btn small copy-guide" data-text="' + esc(guideText(p, l.guide)) + '">取扱説明書をコピー</button></div></section>';
  }

  function standardHtml(p, s, withTool) {
    return '<section class="sec"><h3>ケンカと別れの危機' + tag('standard') + '</h3><div class="kv">' +
      kv('ケンカのパターン', s.crisis.pattern) + kv('ケンカ中にやらないほうがいいこと', list(s.crisis.dont)) +
      kv('別れそうになったとき', s.crisis.breakup) +
      kv('仲直りの4ステップ', '<ol class="tips">' + s.crisis.makeup.map(function (x) { return '<li><span>' + x + '</span></li>'; }).join('') + '</ol>') + '</div></section>' +
      '<section class="sec"><h3>ケンカの基本ルール' + tag('standard') + '</h3><p>' + s.fightRules.intro + '</p>' + list(s.fightRules.rules) + '</section>' +
      '<section class="sec"><h3>長続きする二人の習慣' + tag('standard') + '</h3>' + list(s.habits) + '</section>' +
      '<section class="sec"><h3>マンネリしたとき' + tag('standard') + '</h3><p>' + s.rut + '</p></section>' +
      '<section class="sec"><h3>嫉妬との付き合い方' + tag('standard') + '</h3><p>' + s.jealousy + '</p></section>' +
      '<section class="sec"><h3>失恋したとき' + tag('standard') + '</h3><p>' + s.afterBreakup + '</p></section>' +
      '<section class="sec"><h3>復縁したくなったら' + tag('standard') + '</h3><p>' + s.reunion + '</p></section>' +
      '<section class="sec"><h3>同棲・結婚を考えたとき' + tag('standard') + '</h3><p>' + s.marriage + '</p></section>' +
      '<section class="sec"><h3>マッチングアプリでの恋' + tag('standard') + '</h3><p>' + s.app + '</p></section>' +
      '<section class="sec"><h3>恋の段階別アドバイス' + tag('standard') + '</h3><div class="kv">' +
      kv('片思い', s.stages.crush) + kv('付き合いたて', s.stages.early) + kv('長く付き合っている', s.stages.long) + '</div></section>' +
      '<section class="sec"><h3>16タイプとの付き合いやすさ' + tag('standard') + '</h3>' +
      '<p class="note">★が少ない相手は「合わない」相手ではなく、すれ違いやすいところがはっきりしている相手です。同じ★の中では、ペースや判断の仕方が近い順に並んでいます。タイプ名をタップすると、その人と付き合うときのコツが開きます。</p>' +
      s.compat.map(function (g) {
        return '<div class="cgroup"><h4>' + LC.ATT[g.att].name + 'の人と <span class="st" aria-label="付き合いやすさ 5段階中' + g.ease + '">' + stars(g.ease * 20) + '</span></h4><p>' + g.text + '</p><div class="ranking">' + g.types.map(function (c) {
          var near = c.samePace && c.sameJudge ? 'ペースも判断の仕方も近い' : c.samePace ? 'ペースが近い' : c.sameJudge ? '判断の仕方が近い' : 'ペースも判断の仕方も違う';
          return '<details><summary><code>' + c.core + '</code><span class="nm">' + c.name + '</span><span class="near">' + near + '</span></summary><p>' + c.howto + '</p></details>';
        }).join('') + '</div></div>';
      }).join('') + '</section>' +
      (withTool ? '<section class="sec panel"><h3>相性チェック' + tag('standard') + '</h3>' +
        '<p class="muted">相手にも診断してもらい、そのコードを入れてください。愛情言語まで含めて見られます。</p>' +
        '<div class="compat-form"><input type="text" id="partner" placeholder="例：CKSM-A" aria-label="相手のラブコード" autocomplete="off"><button class="btn small" id="compat-go">相性を見る</button></div>' +
        '<div class="compat-out" id="compat-out"></div></section>' : '');
  }

  function togetherHtml(p, rep) {
    var t = rep.together, o = LC.parseCode(rep.partner.code);
    return '<section class="codecard pairhead" style="--qc:var(--accent)"><span class="eyebrow">2人の相性レポート' + tag('pair') + '</span>' +
      '<div class="pair-codes"><span>' + p.core + '-' + p.ll.join('') + '<small>' + LC.TYPES[p.core][0] + '</small></span><b>×</b><span>' + o.core + '-' + o.ll.join('') + '<small>' + LC.TYPES[o.core][0] + '</small></span></div>' +
      '<p>' + t.att + '</p></section>' +
      '<section class="sec"><h3>2人の間で起きやすいズレ' + tag('pair') + '</h3>' + list(t.gaps) + '</section>' +
      '<section class="sec"><h3>そのまま使える会話のテンプレ' + tag('pair') + '</h3>' + t.talks.map(function (x) {
        return '<div class="ask"><span class="who">' + x.who + '</span>「' + x.line + '」</div>';
      }).join('') + '</section>' +
      '<section class="sec"><h3>ペースとケンカの仕方' + tag('pair') + '</h3><div class="kv"><p>' + t.pace + '</p><p>' + t.judge + '</p></div></section>' +
      '<section class="sec"><h3>2人の愛情言語' + tag('pair') + '</h3><p>' + (t.ll.shared.length ? '二人に共通する愛情言語は「' + t.ll.shared.join('・') + '」です。' : '') + t.ll.summary + '</p>' +
      '<div class="kv">' + kv('あなたから相手へ', '<div class="kv">' + t.ll.toPartner.map(function (x) { return kv(x.name, x.action); }).join('') + '</div>') +
      kv('相手からあなたへ', '<div class="kv">' + t.ll.toYou.map(function (x) { return kv(x.name, x.action); }).join('') + '</div>') + '</div></section>' +
      '<section class="sec"><h3>2人におすすめの習慣' + tag('pair') + '</h3><p>' + t.ritual + '</p></section>';
  }

  function renderPremium(code, rep) {
    var p = LC.parseCode(code), el = document.getElementById('premium');
    var html = '';
    if (rep.together) html += togetherHtml(p, rep);
    html += '<h2 class="part">' + (rep.together ? 'あなたのレポート' : 'あなたのレポート（' + PLAN_INFO[rep.plan].name + '）') + '</h2>';
    html += selfHtml(p, rep.lite);
    if (rep.standard) html += standardHtml(p, rep.standard, true);
    if (rep.partner) {
      var o = LC.parseCode(rep.partner.code);
      html += '<details class="partner-report"><summary><h2 class="part">相手のレポート（' + rep.partner.code + '「' + LC.TYPES[o.core][0] + '」）</h2><span class="note">タップで開く</span></summary>' +
        '<div class="stack">' + selfHtml(o, rep.partner.lite) + standardHtml(o, rep.partner.standard, false) + '</div></details>';
    }
    el.innerHTML = '<div class="stack">' + html + '</div>';
    var go = document.getElementById('compat-go');
    if (go) go.onclick = function () {
      document.getElementById('compat-out').innerHTML = compat(p, rep.standard, normalize(document.getElementById('partner').value));
    };
    Array.prototype.forEach.call(el.querySelectorAll('.copy-guide'), function (btn) {
      btn.onclick = function () {
        var text = btn.dataset.text;
        var done = function () { btn.textContent = 'コピーしました'; };
        var fail = function () { var pre = document.createElement('pre'); pre.className = 'guide-text'; pre.textContent = text; btn.replaceWith(pre); };
        if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, fail); else fail();
      };
    });
  }

  function compat(me, s, raw) {
    var o = LC.parseCode(raw);
    if (!o) return '<p class="err">コードの形が正しくありません。「CKSM-A」や「EOFH-WP」のように入力してください。</p>';
    var t = LC.TYPES[o.core];
    var paceKey = me.pace[0] === o.pace[0] ? (me.pace[0] === 'F' ? 'sameF' : 'sameS') : 'diffF';
    var judgeKey = me.pace[1] === o.pace[1] ? (me.pace[1] === 'H' ? 'sameH' : 'sameM') : 'diffH';
    var shared = me.ll.filter(function (k) { return o.ll.indexOf(k) >= 0; });
    var llText = shared.length
      ? '「' + llNames(shared) + '」が、二人に共通する愛情言語です。そこを意識して増やすだけで、お互いの満足度が上がりやすいペアです。'
      : '共通の愛情言語がない二人です。あなたが' + llNames(me.ll) + 'で愛を伝えても、相手には届きにくいかもしれません。相手には「' + s.actions[o.ll[0]] + '」を試してみてください。逆に、相手からの愛は' + llNames(o.ll) + 'の形で届いているかもしれません。それも愛情だと気づいてあげてください。';
    return '<p><strong>相手は ' + o.core + '-' + o.ll.join('') + '「' + t[0] + '」</strong>、' + LC.ATT[o.att].name + 'です。</p>' +
      '<div class="kv">' + kv('不安のクセの相性', s.attPairs[o.att]) + kv('ペース', s.pacePairs[paceKey]) + kv('ケンカのとき', s.pacePairs[judgeKey]) + kv('愛情言語', llText) + '</div>' +
      '<p class="note">2人だけのズレの具体例や会話のテンプレは、ペアプランで読めます。</p>';
  }

  // ---------- boot ----------
  function boot() {
    API.plans().then(function (p) { plans = p; route(); }).catch(function () {
      app.innerHTML = '<p class="err">読み込みに失敗しました。ページを再読み込みしてください。</p>';
    });
  }
  function route() {
    var sid = null;
    try { sid = new URLSearchParams(location.search).get('session_id'); } catch (e) { sid = null; }
    if (sid) {
      app.innerHTML = '<p class="muted">お支払いを確認しています…</p>';
      API.report(sid).then(function (rep) {
        if (rep && rep.code) { savePaid(rep.code, sid, rep.plan); setHash(rep.code); showResult(rep.code, null); return; }
        app.innerHTML = '<section class="panel"><p class="err">' + ((rep && rep.error) || '購入情報を確認できませんでした') + '</p>' +
          '<p class="note">コンビニ払いなどでお支払いが完了していない場合は、完了後にこのページを開き直してください。</p><div><button class="btn small" id="top">トップへ</button></div></section>';
        document.getElementById('top').onclick = renderIntro;
      });
      return;
    }
    var code = (location.hash || '').slice(1);
    if (LC.parseCode(code)) showResult(code, null); else renderIntro();
  }
  boot();
})();
