(function () {
  var LC = window.LC, API = window.LC_API;
  var app = document.getElementById('app'), lp = document.getElementById('lp');
  var ATT_COLOR = { CO: 'var(--q-co)', EO: 'var(--q-eo)', CK: 'var(--q-ck)', EK: 'var(--q-ek)' };
  var ATT_TINT = { CO: 'var(--t-co)', EO: 'var(--t-eo)', CK: 'var(--t-ck)', EK: 'var(--t-ek)' };
  var TOTAL = LC.LIKERT.length + LC.PAIRS.length;
  var state = { likert: [], pairs: [], i: 0 };

  function load(key, fallback) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* 保存できなくても診断は動く */ }
  }
  function setHash(code) {
    // 一度使えば用が済むパラメータだけ外す（utm などのほかのパラメータは残す）
    try {
      var q = new URLSearchParams(location.search); q.delete('session_id'); q.delete('start'); q.delete('invite');
      var qs = q.toString();
      history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + (code ? '#' + code : ''));
    } catch (e) { /* 表示には影響しない */ }
  }
  function llNames(list) { return list.map(function (k) { return LC.LL[k].name; }).join('・'); }
  function sget(key) { try { return sessionStorage.getItem(key); } catch (e) { return null; } }
  function sset(key, value) { try { sessionStorage.setItem(key, value); } catch (e) { /* なくても動く */ } }

  // 計測：「何人がどこまで進んだか」の合計だけを数える。回答や結果は送らない（名前の一覧は lib/events.js）
  function track(name) {
    if (API.demo) return;
    try { if (navigator.sendBeacon) navigator.sendBeacon('/api/event', JSON.stringify({ name: name })); } catch (e) { /* 計測できなくても動く */ }
  }
  // 同じタブで何度も数えたくないもの用
  function trackOnce(name, key) {
    var k = 'lc_t_' + (key || name);
    if (sget(k)) return;
    sset(k, '1'); track(name);
  }
  // 招待リンク（?invite=コード）で来た人が、誰に招待されたか
  function inviter() { var c = sget('lc_invite'); return c && LC.parseCode(c) ? c : null; }
  function lineUrl(text, url) { return 'https://social-plugins.line.me/lineit/share?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent(text); }
  function copyButton(id, text, event) {
    var btn = document.getElementById(id);
    if (!btn) return;
    btn.onclick = function () {
      var done = function () { btn.textContent = 'コピーしました'; };
      if (event) track(event);
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, function () { btn.textContent = text; });
      else btn.textContent = text;
    };
  }

  // 画面の切り替え。'lp'（導入ページ）のときだけ静的な HTML を見せ、それ以外は #app に描く
  function view(name) {
    document.documentElement.classList.remove('boot-app');
    document.body.dataset.view = name;
    lp.hidden = name !== 'lp';
    app.hidden = name === 'lp';
    if (name !== 'result') sticky(null);
  }

  // ---------- 導入ページ ----------
  function renderIntro() {
    setHash('');
    view('lp');
    trackOnce('lp_view');
    var inv = inviter(), banner = document.getElementById('invite-banner');
    if (banner) {
      banner.hidden = !inv;
      if (inv) banner.textContent = inv + '「' + LC.TYPES[LC.parseCode(inv).core][0] + '」の人から、診断の招待が届いています。診断して、あなたのコードを教えてあげましょう。';
    }
    var last = load('lc_last', null), el = document.getElementById('resume');
    if (el) {
      if (last && LC.parseCode(last.code)) {
        el.hidden = false;
        el.innerHTML = '<button class="linkbtn" id="resume-go">前回の結果（' + last.code + '）を見る</button>';
        document.getElementById('resume-go').onclick = function () { showResult(last.code, last.pct); };
      } else {
        el.hidden = true;
      }
    }
    window.scrollTo(0, 0);
  }

  // デモ版だけ：全パターンを確認するための道具を導入ページに足す
  function setupDemo() {
    var el = document.getElementById('demo-tools');
    if (!el) return;
    el.innerHTML =
      '<div class="demo-banner">デモ版です。決済はStripeにつながず、「購入する」を押すとそのまま有料レポートが開きます。</div>' +
      '<section class="panel" style="margin-top:12px"><span class="eyebrow">制作者用ビューア</span>' +
      '<p class="muted">16タイプ×愛情言語の結果を直接確認できます。</p>' +
      '<div class="viewer">' +
      '<label for="v-core">タイプ<select id="v-core">' + Object.keys(LC.TYPES).map(function (c) { return '<option value="' + c + '">' + c + ' ' + LC.TYPES[c][0] + '</option>'; }).join('') + '</select></label>' +
      '<label for="v-ll1">メイン<select id="v-ll1">' + LC.LL_ORDER.map(function (k) { return '<option value="' + k + '">' + k + ' ' + LC.LL[k].name + '</option>'; }).join('') + '</select></label>' +
      '<label for="v-ll2">サブ<select id="v-ll2"><option value="">なし</option>' + LC.LL_ORDER.map(function (k) { return '<option value="' + k + '">' + k + ' ' + LC.LL[k].name + '</option>'; }).join('') + '</select></label>' +
      '<button class="btn small" id="v-go">この結果を見る</button></div>' +
      '<div><button class="linkbtn" id="random">ランダムに回答して結果を見る（テスト用）</button></div></section>';
    document.getElementById('random').onclick = function () {
      state.likert = LC.LIKERT.map(function () { return 1 + Math.floor(Math.random() * 5); });
      state.pairs = LC.PAIRS.map(function () { return Math.random() < 0.5 ? 'a' : 'b'; });
      finish();
    };
    document.getElementById('v-go').onclick = function () {
      var a = document.getElementById('v-ll1').value, b = document.getElementById('v-ll2').value;
      showResult(document.getElementById('v-core').value + '-' + a + (b && b !== a ? b : ''), null);
    };
  }

  function footer() {
    if (API.demo) return '';
    return '<nav class="foot"><a href="legal.html">特定商取引法に基づく表記</a><a href="legal.html#privacy">プライバシーポリシー</a></nav>';
  }

  // ---------- 診断 ----------
  function startQuiz() { state = { likert: [], pairs: [], i: 0 }; track('quiz_start'); view('quiz'); renderQuestion(); window.scrollTo(0, 0); }

  function renderQuestion() {
    var i = state.i, isPair = i >= LC.LIKERT.length;
    var body;
    if (!isPair) {
      var cur = state.likert[i];
      body = '<p class="eyebrow">あてはまる？</p><p class="qtext">' + LC.LIKERT[i].q + '</p>' +
        '<div class="likert"><div class="dots" role="group" aria-label="5段階で答える">' + [1, 2, 3, 4, 5].map(function (v) {
          var label = ['そう思わない', 'あまりそう思わない', 'どちらでもない', 'ややそう思う', 'そう思う'][v - 1];
          return '<button data-v="' + v + '" aria-label="' + label + '" title="' + label + '"' + (cur === v ? ' class="on"' : '') + '></button>';
        }).join('') + '</div><div class="ends"><span>そう思わない</span><span>そう思う</span></div></div>';
    } else {
      var p = LC.PAIRS[i - LC.LIKERT.length], c = state.pairs[i - LC.LIKERT.length];
      body = '<p class="eyebrow">恋人にされて、より嬉しいのは？</p>' +
        '<div class="choices"><button data-v="a"' + (c === 'a' ? ' class="on"' : '') + '>' + p.qa + '</button><button data-v="b"' + (c === 'b' ? ' class="on"' : '') + '>' + p.qb + '</button></div>';
    }
    app.innerHTML =
      '<div class="progress"><div class="meta"><span>' + (isPair ? 'パート2 愛情言語' : 'パート1 恋のクセ') + '</span><span>' + (i + 1) + ' / ' + TOTAL + '</span></div>' +
      '<div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="' + TOTAL + '" aria-valuenow="' + i + '"><i style="width:' + Math.round((i / TOTAL) * 100) + '%"></i></div></div>' +
      '<section class="qcard">' + body + '</section>' +
      '<div class="qnav"><button class="linkbtn" id="back">' + (i === 0 ? 'トップに戻る' : 'ひとつ前へ') + '</button></div>';

    Array.prototype.forEach.call(app.querySelectorAll('.qcard button'), function (b) {
      b.onclick = function () {
        if (isPair) state.pairs[i - LC.LIKERT.length] = b.dataset.v; else state.likert[i] = Number(b.dataset.v);
        b.classList.add('on');
        if (i === 9) track('quiz_q10'); else if (i === 19) track('quiz_q20');
        setTimeout(function () { if (state.i + 1 >= TOTAL) finish(); else { state.i += 1; renderQuestion(); } }, 160);
      };
    });
    document.getElementById('back').onclick = function () { if (state.i === 0) renderIntro(); else { state.i -= 1; renderQuestion(); } };
  }

  function finish() {
    var r = LC.score(state.likert, state.pairs);
    save('lc_last', { code: r.code, pct: r.pct });
    track('quiz_done');
    showResult(r.code, r.pct);
  }

  // ---------- 結果 ----------
  function showResult(code, pct) {
    var p = LC.parseCode(code);
    if (!p) return renderIntro();
    if (!pct) { var last = load('lc_last', null); if (last && last.code === code) pct = last.pct; }
    setHash(code);
    view('result');
    sticky(null);
    var t = LC.TYPES[p.core], a = LC.ATT[p.att];
    var owned = getPaid(code);

    var axes = pct ? '<section class="panel axes"><span class="eyebrow">あなたの傾き</span>' + LC.AXES.map(function (ax, i) {
      var v = pct[i], toPos = v > 50, w = Math.abs(v - 50);
      return '<div class="axis"><div class="names"><span>' + (toPos ? ax.negName : '<b>' + ax.negName + '</b>') + '</span><span>' + (toPos ? '<b>' + ax.posName + '</b>' : ax.posName) + '</span></div>' +
        '<div class="track"><i style="left:' + (toPos ? 50 : 50 - w) + '%;width:' + Math.max(w, 1.5) + '%"></i></div>' +
        '<div class="label">' + ax.label + '　' + (toPos ? ax.posName : ax.negName) + ' ' + Math.max(v, 100 - v) + '%</div></div>';
    }).join('') + '</section>' : '';

    // シェア先はタイプ別ページ（タイプごとの画像が出る）。1ファイルのデモ版にはそのページが無いので結果のリンクにする
    var shareUrl = API.demo ? location.origin + location.pathname + '#' + code : location.origin + '/types/' + p.core.toLowerCase();
    var mine = !!pct || !!owned, inv = inviter();
    if (!mine) trackOnce('shared_view', 'shared_' + code);
    var reply = mine && inv && inv !== code && !API.demo ? '<section class="invite hot"><h3>' + inv + '「' + LC.TYPES[LC.parseCode(inv).core][0] + '」の人に、コードを送る</h3>' +
      '<p>招待してくれた相手に、あなたのコードを伝えましょう。2人のコードがそろうと、相性が見られます。</p>' +
      '<div class="sharerow"><a class="btn small" id="reply-line" target="_blank" rel="noopener" href="' + lineUrl('診断したよ！私のラブコードは ' + code + '「' + t[0] + '」でした。', shareUrl) + '">LINEでコードを送る</a>' +
      '<button class="btn ghost small" id="reply-copy">コードをコピー</button></div></section>' : '';
    var inviteUrl = location.origin + '/?invite=' + code;
    var inviteText = 'ラブコード診断やってみて！私は ' + code + '「' + t[0] + '」だった。結果のコードを教えてね。';
    var invite = mine && !API.demo ? '<section class="invite"><h3>相手にも診断してもらう</h3>' +
      '<p>恋人や気になる人のコードがわかると、2人の相性が見られます。相手の診断も無料です。</p>' +
      '<div class="sharerow"><a class="btn small" id="invite-line" target="_blank" rel="noopener" href="' + lineUrl(inviteText, inviteUrl) + '">LINEで診断を送る</a>' +
      '<button class="btn ghost small" id="invite-copy">招待リンクをコピー</button></div></section>' : '';
    var shareText = '私のラブコードは ' + code + '「' + t[0] + '」でした。' + t[1] + '。';
    // 自分で診断した結果でも、購入済みでもないとき（シェアされたリンクを開いた人）には診断への入口を出す
    var visitor = !pct && !owned ? '<section class="visitor"><p><strong>これは ' + code + '「' + t[0] + '」の結果ページです。</strong><br>あなたのラブコードも調べてみませんか？</p>' +
      '<button class="btn" id="visitor-start">無料で診断する <span class="arrow" aria-hidden="true">→</span></button><p class="note">30問・約5分・登録なし</p></section>' : '';
    var free = ' <span class="tag free">無料</span>';

    app.innerHTML =
      '<section class="codecard" style="--qc:' + ATT_COLOR[p.att] + ';--qt:' + ATT_TINT[p.att] + '">' +
      '<span class="eyebrow">' + (pct ? 'あなたのラブコード' : 'ラブコード') + '</span>' +
      '<div class="em" aria-hidden="true">' + LC.EMOJI[p.core] + '</div>' +
      '<div class="code">' + p.core + '<em>-' + p.ll.join('') + '</em></div>' +
      '<h2>' + t[0] + '</h2><p class="tagline">' + t[1] + '</p>' +
      '<div class="chips"><span class="chip att">' + a.name + '</span>' + p.ll.map(function (k, i) { return '<span class="chip">' + (i ? 'サブ ' : 'メイン ') + LC.LL[k].name + '</span>'; }).join('') + '</div>' +
      '</section>' +
      '<div class="sharerow">' +
      '<a class="btn ghost small" id="share-x" target="_blank" rel="noopener" href="https://twitter.com/intent/tweet?text=' + encodeURIComponent(shareText + ' #ラブコード診断') + '&url=' + encodeURIComponent(shareUrl) + '">Xでシェア</a>' +
      '<a class="btn ghost small" id="share-line" target="_blank" rel="noopener" href="' + lineUrl(shareText, shareUrl) + '">LINEで送る</a>' +
      '<button class="btn ghost small" id="share">結果をコピー</button></div>' +
      visitor +
      reply +
      axes +
      '<section class="sec"><h3>' + a.name + 'のあなた' + free + '</h3>' + prose(a.body) + '</section>' +
      '<section class="sec"><h3>' + t[0] + 'の物語' + free + '</h3>' + prose(LC.STORY[p.core]) + '</section>' +
      '<section class="sec"><h3>' + t[0] + 'の恋愛あるある' + free + '</h3>' + list(LC.ARUARU[p.core], 'aruaru') + '</section>' +
      '<section class="sec"><h3>あなたに響く愛情言語' + free + '</h3><dl class="kv">' + p.ll.map(function (k) {
        return '<div><dt>' + LC.LL[k].name + '（' + LC.LL[k].en + '）</dt><dd>' + LC.LL[k].short + '</dd></div>';
      }).join('') + '</dl></section>' +
      invite +
      '<div id="premium"></div><div id="upgrade"></div>' +
      '<div class="sharerow"><button class="btn ghost small" id="again">' + (pct || owned ? 'もう一度診断する' : '自分も診断する') + '</button><button class="btn ghost small" id="top">トップへ</button></div>' +
      footer();

    document.getElementById('again').onclick = startQuiz;
    document.getElementById('top').onclick = renderIntro;
    var vs = document.getElementById('visitor-start');
    if (vs) vs.onclick = startQuiz;
    copyButton('share', shareText + ' #ラブコード診断 ' + shareUrl, 'share_copy');
    copyButton('invite-copy', inviteText + ' ' + inviteUrl, 'invite_send');
    copyButton('reply-copy', '私のラブコードは ' + code + '「' + t[0] + '」でした。', 'reply_send');
    [['share-x', 'share_x'], ['share-line', 'share_line'], ['invite-line', 'invite_send'], ['reply-line', 'reply_send']].forEach(function (x) {
      var el = document.getElementById(x[0]);
      if (el) el.addEventListener('click', function () { track(x[1]); });
    });

    mountPremium(code, owned);
    window.scrollTo(0, 0);
  }

  // ---------- 購入 ----------
  var PLAN_INFO = {
    lite: { name: 'ライト', lead: '自分の取扱説明書', items: ['恋人から見たあなたと、今週からできる一歩', '恋の強み・つまずき・要注意サイン', '合う恋人と、気をつけたい相手', '恋のペース、アプローチ、デート、LINE', '愛情言語の取扱説明、もらって嬉しいことリスト、おすすめのデート', '相手の愛情言語の見分け方', 'つい言ってしまう一言の言い換え', '恋のQ&A', 'うまくいくための5つのことと、セルフケア', '恋人に見せる取扱説明書'] },
    standard: { name: 'スタンダード', lead: 'ライトの全部＋恋の実践編', items: ['ライトの内容すべて', 'ケンカのパターンと、ケンカ中にやらないほうがいいこと', '仲直りの4ステップと、ケンカの基本ルール', '長続きする二人の習慣と、マンネリしたとき', '嫉妬、失恋、復縁', '同棲・結婚を考えたとき', 'マッチングアプリでの恋', '片思い・付き合いたて・長く付き合っている時期のアドバイス', '16タイプとの付き合いやすさと、付き合うときのコツ', '相手のコードを入れて見る相性チェック'] },
    pair: { name: 'ペア', lead: '2人分＋2人だけの相性レポート', items: ['あなたと相手、2人分のスタンダード', '2人の間で起きやすいズレの具体例', 'そのまま使える会話のテンプレ', '2人の愛情言語の届け方', '2人におすすめの習慣'] }
  };
  var PLAN_KEYS = ['lite', 'standard', 'pair'];
  var plans = null, plansPromise = null;

  // 料金表は一度だけ取りにいく。失敗したら次の呼び出しでやり直す
  function ensurePlans() {
    if (plans) return Promise.resolve(plans);
    if (!plansPromise) {
      plansPromise = API.plans().then(function (p) {
        if (!p || !p.lite) throw new Error('料金プランを読み込めませんでした');
        plans = p; return p;
      }).catch(function (e) { plansPromise = null; throw e; });
    }
    return plansPromise;
  }

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

  function mountPremium(code, owned) {
    var el = document.getElementById('premium');
    el.innerHTML = '<p class="muted">読み込んでいます…</p>';
    ensurePlans().then(function () {
      if (owned) { loadPremium(code, owned); } else { el.innerHTML = ''; renderPlans(code, null); }
    }, function () {
      el.innerHTML = '<p class="err">料金プランを読み込めませんでした。</p><div><button class="btn small ghost" id="retry">もう一度読み込む</button></div>';
      document.getElementById('retry').onclick = function () { mountPremium(code, owned); };
    });
  }

  // 結果ページの下に固定する購入バー。プラン一覧がまだ下にあるあいだだけ出す
  var stickyOff = null;
  function sticky(label) {
    var el = document.getElementById('stickybuy');
    if (stickyOff) { stickyOff(); stickyOff = null; }
    if (!el) return;
    el.classList.remove('show'); el.setAttribute('aria-hidden', 'true');
    if (!label) return;
    document.getElementById('stickybuy-text').innerHTML = label;
    document.getElementById('stickybuy-go').onclick = function () {
      var target = document.getElementById('plans');
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    var ticking = false;
    var check = function () {
      ticking = false;
      var target = document.getElementById('plans');
      var on = !!target && window.scrollY > 240 && target.getBoundingClientRect().top > window.innerHeight;
      el.classList.toggle('show', on); el.setAttribute('aria-hidden', on ? 'false' : 'true');
    };
    var onScroll = function () { if (!ticking) { ticking = true; requestAnimationFrame(check); } };
    window.addEventListener('scroll', onScroll, { passive: true });
    stickyOff = function () { window.removeEventListener('scroll', onScroll); };
  }

  // owned: 購入済みのプラン（なければ null）。上のプランだけを差額で並べる
  function renderPlans(code, owned) {
    var el = document.getElementById(owned ? 'upgrade' : 'premium');
    if (!el) return;
    var p = LC.parseCode(code), t = LC.TYPES[p.core], a = LC.ATT[p.att];
    var ownedRank = owned ? plans[owned.plan].rank : 0;
    var keys = PLAN_KEYS.filter(function (k) { return plans[k].rank > ownedRank; });
    if (!keys.length) { el.innerHTML = ''; return; }
    var cards = keys.map(function (k) {
      var info = PLAN_INFO[k], price = plans[k].price - (owned ? plans[owned.plan].price : 0);
      var star = k === 'standard' && !owned;
      var head = info.items.slice(0, 4), rest = info.items.slice(4);
      return '<div class="plan' + (star ? ' star' : '') + '">' +
        (star ? '<span class="badge">おすすめ</span>' : '') +
        '<span class="eyebrow">' + info.name + '</span>' +
        '<h4>' + info.lead + '</h4>' +
        '<div class="price">' + yen(price) + '<small> 円（税込）' + (owned ? '・差額' : '') + '</small></div>' +
        (k === 'pair' ? '<p class="note">1人あたり ' + yen(plans.pair.price / 2) + '円</p>' : '') +
        '<ul>' + head.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>' +
        (rest.length ? '<details><summary>ほかに' + rest.length + '項目</summary><ul>' + rest.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul></details>' : '') +
        (k === 'pair' ? '<label class="note" for="pair-partner">相手のラブコード（先に相手にも無料診断してもらってね）</label><input type="text" id="pair-partner" placeholder="例：CKSM-A" autocomplete="off" value="' + (inviter() && inviter() !== code ? inviter() : '') + '">' : '') +
        '<button class="btn' + (star ? '' : ' ghost') + '" data-plan="' + k + '">' + (owned ? info.name + 'にアップグレード' : info.name + 'を購入') + '</button>' +
        '</div>';
    }).join('');
    var lead = owned
      ? '<span class="eyebrow">もっと読む</span><h3>差額だけで、上のプランにアップグレードできます</h3>'
      : '<span class="eyebrow">ここから先は有料レポート</span><h3>' + t[0] + 'のあなた専用の、恋の取扱説明書</h3>' +
        '<p>無料の結果は入口です。レポートでは、' + a.name + 'のクセが恋のどの場面で出やすいか、そのときどうすればいいかまで、具体的に書いています。</p>' +
        '<ul class="locked"><li>恋人から見た「' + t[0] + '」のあなた</li><li>恋の強み・つまずき・要注意サイン</li><li>あなたに合う恋人と、気をつけたい相手</li><li>つい言ってしまう一言の言い換え</li><li>恋人に見せる取扱説明書</li></ul>';
    el.innerHTML = '<section class="teaser" id="' + (owned ? 'upgrade-plans' : 'plans') + '">' + lead +
      '<div class="plans">' + cards + '</div><p class="err" id="buy-err" hidden></p>' +
      '<p class="note">買い切りです。月額料金はかかりません。クレジットカード、Apple Pay、Google Pay に対応。決済は Stripe で安全に処理されます。</p></section>';
    if (!owned) {
      sticky(t[0] + 'の取扱説明書を読む<small>買い切り ' + yen(plans.lite.price) + '円〜</small>');
      // 料金プランが実際に画面に入ったときに一度だけ数える
      if ('IntersectionObserver' in window) {
        var seen = new IntersectionObserver(function (es) {
          if (es[0].isIntersecting) { trackOnce('plans_view'); seen.disconnect(); }
        });
        seen.observe(document.getElementById('plans'));
      }
    }

    Array.prototype.forEach.call(el.querySelectorAll('button[data-plan]'), function (btn) {
      btn.onclick = function () {
        var plan = btn.dataset.plan, err = document.getElementById('buy-err'), partner = null;
        if (plan === 'pair') {
          partner = normalize(document.getElementById('pair-partner').value);
          if (!LC.parseCode(partner)) { err.hidden = false; err.textContent = '相手のコードを「CKSM-A」のような形で入力してください。'; return; }
        }
        var label = btn.textContent;
        btn.disabled = true; btn.textContent = '決済ページを準備中…'; err.hidden = true;
        track('buy_click_' + plan);
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
      renderPremium(code, rep, owned.sid);
      renderPlans(code, { sid: owned.sid, plan: rep.plan });
    }).catch(function (x) {
      el.innerHTML = '<p class="err">' + x.message + '</p>';
    });
  }

  function normalize(raw) { return (raw || '').trim().toUpperCase().replace(/[－ー―‐]/g, '-'); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }
  function tag(plan) { return ' <span class="tag paid">' + PLAN_INFO[plan].name + '</span>'; }
  function list(items, cls) { return '<ul class="' + (cls || 'dots') + '">' + items.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>'; }
  function kv(label, body) { return '<div><span class="k">' + label + '</span>' + (body.charAt(0) === '<' ? body : para(body)) + '</div>'; }
  function stars(score) { var n = Math.max(1, Math.min(5, Math.round(score / 20))); return '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n); }

  // 長い文章を2文ごとの段落に分けて読みやすくする。「」や（）の中の句点では切らない
  function para(text) {
    text = String(text);
    if (text.length < 110 || text.indexOf('<') >= 0) return '<p>' + text + '</p>';
    var out = [], buf = '', depth = 0, n = 0;
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      buf += ch;
      if (ch === '「' || ch === '（') depth += 1;
      else if (ch === '」' || ch === '）') depth = Math.max(0, depth - 1);
      else if (ch === '。' && depth === 0) { n += 1; if (n === 2) { out.push(buf); buf = ''; n = 0; } }
    }
    if (buf) { if (out.length && buf.length < 30) out[out.length - 1] += buf; else out.push(buf); }
    return out.map(function (x) { return '<p>' + x + '</p>'; }).join('');
  }
  function prose(text) { return '<div class="prose">' + para(text) + '</div>'; }

  // 恋人に見せる取扱説明書をコピー用の平文にする
  function guideText(p, g) {
    var lines = ['【' + LC.TYPES[p.core][0] + '（' + p.core + '-' + p.ll.join('') + '）の取扱説明書】', g.att, g.pace];
    lines.push('この人に愛情がいちばん伝わるのは「' + g.ll.map(function (x) { return x.name; }).join('」と「') + '」です。たとえば「' + g.ll[0].action + '」だけでも、ちゃんと伝わります。');
    return lines.join('\n');
  }

  function selfHtml(p, l) {
    var a = LC.ATT[p.att];
    return '<section class="sec"><h3>恋人から見たあなた' + tag('lite') + '</h3>' + prose(l.seen) +
      '<div class="kv">' + kv('今週からできる一歩', '<div class="ask">' + l.step + '</div>') + '</div></section>' +
      '<section class="sec"><h3>' + a.name + '（' + a.base + '）を深く知る' + tag('lite') + '</h3>' + prose(l.portrait) + prose(l.loop) +
      '<div class="kv">' + kv('強み', list(l.strengths)) + kv('つまずきやすいところ', list(l.pitfalls)) + kv('こんなときは要注意', list(l.signs)) + '</div></section>' +
      '<section class="sec"><h3>合う恋人と、気をつけたい相手' + tag('lite') + '</h3><div class="kv">' + kv('あなたに合う恋人', l.match) + kv('気をつけたい相手', l.caution) + '</div></section>' +
      '<section class="sec"><h3>恋のペース「' + l.pace.title + '」' + tag('lite') + '</h3>' + prose(l.pace.body) +
      '<div class="kv">' + kv('アプローチ・告白', l.pace.approach) + kv('デート', l.pace.date) + kv('連絡・LINE', l.pace.line) + '</div></section>' +
      '<section class="sec"><h3>愛情言語の取扱説明' + tag('lite') + '</h3>' + l.ll.map(function (x) {
        return '<div class="panel"><span class="eyebrow">' + LC.LL[x.key].name + '</span><div class="kv">' +
          kv('こうされると満たされる', x.need) + kv('気をつけたいこと', x.give) + kv('足りていないサイン', x.starving) +
          kv('もらって嬉しいことリスト', list(x.joys)) + (x.key === l.ll[0].key ? kv('おすすめのデート', list(l.dates)) : '') + kv('あなたが贈るときのコツ', x.giveTips) + kv('相手の愛情言語が違うとき', x.receive) +
          kv('恋人へのお願いの例文', x.phrases.map(function (s) { return '<div class="ask">「' + s + '」</div>'; }).join('')) + '</div></div>';
      }).join('') + '</section>' +
      '<section class="sec"><h3>' + a.name + '×愛情言語' + tag('lite') + '</h3><div class="kv">' + l.cross.map(function (c) { return kv(LC.LL[c.key].name, c.text); }).join('') + '</div></section>' +
      '<section class="sec"><h3>相手の愛情言語の見分け方' + tag('lite') + '</h3>' + prose(l.spot.intro) + '<div class="kv">' + l.spot.hints.map(function (h) { return kv(h[0], h[1]); }).join('') + '</div>' + prose(l.spot.outro) + '</section>' +
      '<section class="sec"><h3>つい言ってしまう一言の言い換え' + tag('lite') + '</h3><div class="rephrase">' + l.rephrase.map(function (r) {
        return '<div><span class="before">「' + r[0] + '」</span><span class="after">「' + r[1] + '」</span></div>';
      }).join('') + '</div></section>' +
      '<section class="sec"><h3>うまくいくための5つのこと' + tag('lite') + '</h3><ol class="tips">' + l.tips.map(function (x) { return '<li><span><strong>' + x.t + '</strong><br><span class="muted">' + x.why + '</span></span></li>'; }).join('') + '</ol></section>' +
      '<section class="sec"><h3>恋のQ&amp;A' + tag('lite') + '</h3><div class="qa">' + l.qa.map(function (x) { return '<div><p class="q">' + x.q + '</p>' + para(x.a) + '</div>'; }).join('') + '</div></section>' +
      '<section class="sec"><h3>自分を満たすためのセルフケア' + tag('lite') + '</h3>' + list(l.selfcare) + '</section>' +
      '<section class="sec"><h3>愛着スタイルは変わるの？' + tag('lite') + '</h3>' + prose(l.change) + '</section>' +
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
      '<section class="sec"><h3>ケンカの基本ルール' + tag('standard') + '</h3>' + prose(s.fightRules.intro) + list(s.fightRules.rules) + '</section>' +
      '<section class="sec"><h3>長続きする二人の習慣' + tag('standard') + '</h3>' + list(s.habits) + '</section>' +
      '<section class="sec"><h3>マンネリしたとき' + tag('standard') + '</h3>' + prose(s.rut) + '</section>' +
      '<section class="sec"><h3>嫉妬との付き合い方' + tag('standard') + '</h3>' + prose(s.jealousy) + '</section>' +
      '<section class="sec"><h3>失恋したとき' + tag('standard') + '</h3>' + prose(s.afterBreakup) + '</section>' +
      '<section class="sec"><h3>復縁したくなったら' + tag('standard') + '</h3>' + prose(s.reunion) + '</section>' +
      '<section class="sec"><h3>同棲・結婚を考えたとき' + tag('standard') + '</h3>' + prose(s.marriage) + '</section>' +
      '<section class="sec"><h3>マッチングアプリでの恋' + tag('standard') + '</h3>' + prose(s.app) + '</section>' +
      '<section class="sec"><h3>恋の段階別アドバイス' + tag('standard') + '</h3><div class="kv">' +
      kv('片思い', s.stages.crush) + kv('付き合いたて', s.stages.early) + kv('長く付き合っている', s.stages.long) + '</div></section>' +
      '<section class="sec"><h3>16タイプとの付き合いやすさ' + tag('standard') + '</h3>' +
      '<p class="note">★が少ない相手は「合わない」相手ではなく、すれ違いやすいところがはっきりしている相手です。同じ★の中では、ペースや判断の仕方が近い順に並んでいます。タイプ名をタップすると、その人と付き合うときのコツが開きます。</p>' +
      s.compat.map(function (g) {
        return '<div class="cgroup"><h4>' + LC.ATT[g.att].name + 'の人と <span class="st" aria-label="付き合いやすさ 5段階中' + g.ease + '">' + stars(g.ease * 20) + '</span></h4><p>' + g.text + '</p><div class="ranking">' + g.types.map(function (c) {
          var near = c.samePace && c.sameJudge ? 'ペースも判断の仕方も近い' : c.samePace ? 'ペースが近い' : c.sameJudge ? '判断の仕方が近い' : 'ペースも判断の仕方も違う';
          return '<details><summary><code>' + c.core + '</code><span class="nm">' + LC.EMOJI[c.core] + ' ' + c.name + '</span><span class="near">' + near + '</span></summary><p>' + c.howto + '</p></details>';
        }).join('') + '</div></div>';
      }).join('') + '</section>' +
      (withTool ? '<section class="sec panel"><h3>相性チェック' + tag('standard') + '</h3>' +
        '<p class="muted">相手にも診断してもらい、そのコードを入れてください。愛情言語まで含めて見られます。</p>' +
        '<div class="compat-form"><input type="text" id="partner" placeholder="例：CKSM-A" aria-label="相手のラブコード" autocomplete="off"><button class="btn small" id="compat-go">相性を見る</button></div>' +
        '<div class="compat-out" id="compat-out"></div></section>' : '');
  }

  function togetherHtml(p, rep) {
    var t = rep.together, o = LC.parseCode(rep.partner.code);
    return '<section class="codecard pairhead" style="--qc:var(--accent);--qt:var(--tint)"><span class="eyebrow">2人の相性レポート' + tag('pair') + '</span>' +
      '<div class="pair-codes"><span>' + p.core + '-' + p.ll.join('') + '<small>' + LC.TYPES[p.core][0] + '</small></span><b>×</b><span>' + o.core + '-' + o.ll.join('') + '<small>' + LC.TYPES[o.core][0] + '</small></span></div>' +
      '<p>' + t.att + '</p></section>' +
      '<section class="sec"><h3>2人の間で起きやすいズレ' + tag('pair') + '</h3>' + list(t.gaps) + '</section>' +
      '<section class="sec"><h3>そのまま使える会話のテンプレ' + tag('pair') + '</h3>' + t.talks.map(function (x) {
        return '<div class="ask"><span class="who">' + x.who + '</span>「' + x.line + '」</div>';
      }).join('') + '</section>' +
      '<section class="sec"><h3>ペースとケンカの仕方' + tag('pair') + '</h3>' + prose(t.pace) + prose(t.judge) + '</section>' +
      '<section class="sec"><h3>2人の愛情言語' + tag('pair') + '</h3>' + prose((t.ll.shared.length ? '二人に共通する愛情言語は「' + t.ll.shared.join('・') + '」です。' : '') + t.ll.summary) +
      '<div class="kv">' + kv('あなたから相手へ', '<div class="kv">' + t.ll.toPartner.map(function (x) { return kv(x.name, x.action); }).join('') + '</div>') +
      kv('相手からあなたへ', '<div class="kv">' + t.ll.toYou.map(function (x) { return kv(x.name, x.action); }).join('') + '</div>') + '</div></section>' +
      '<section class="sec"><h3>2人におすすめの習慣' + tag('pair') + '</h3>' + prose(t.ritual) + '</section>';
  }

  // 長いレポートの頭に目次を付ける。見出しの文字（プラン名のタグは除く）をそのまま使う
  function tocHtml(root) {
    var secs = Array.prototype.filter.call(root.children, function (x) { return x.classList.contains('sec'); });
    if (secs.length < 4) return '';
    var items = secs.map( function (sec, i) {
      var h = sec.querySelector('h3');
      sec.id = 'sec-' + i;
      return '<li><button data-to="sec-' + i + '">' + esc(h.firstChild.textContent.trim()) + '</button></li>';
    }).join('');
    return '<details class="toc"><summary>目次（' + secs.length + '項目）</summary><ol>' + items + '</ol></details>';
  }

  function renderPremium(code, rep, sid) {
    var p = LC.parseCode(code), el = document.getElementById('premium');
    var html = '';
    if (rep.together) html += togetherHtml(p, rep);
    html += '<h2 class="part">' + (rep.together ? 'あなたのレポート' : 'あなたのレポート（' + PLAN_INFO[rep.plan].name + '）') + '</h2>';
    html += selfHtml(p, rep.lite);
    if (rep.standard) html += standardHtml(p, rep.standard, true);
    if (rep.partner) {
      var o = LC.parseCode(rep.partner.code);
      html += '<details class="partner-report"><summary><h2 class="part">相手のレポート（<span class="nw">' + rep.partner.code + '</span>「' + LC.TYPES[o.core][0] + '」）</h2><span class="note">タップで開く</span></summary>' +
        '<div class="stack">' + selfHtml(o, rep.partner.lite) + standardHtml(o, rep.partner.standard, false) + '</div></details>';
    }
    // 購入の証明は Stripe の購入ID。これを付けたURLを開けば、別の端末でも同じレポートが読める
    var keep = API.demo || !sid ? '' : '<section class="invite"><h3>別の端末でも読むには</h3>' +
      '<p>このレポート専用のURLです。自分あてにLINEやメールで送っておくと、スマホを変えたり、別のブラウザで開いたりしても読み返せます。URLを知っている人は誰でも読めるので、人には送らないでください。</p>' +
      '<div class="sharerow"><button class="btn small" id="keep-copy">レポートのURLをコピー</button></div></section>';
    el.innerHTML = keep + '<div class="stack" id="report" style="margin-top:28px">' + html + '</div>';
    copyButton('keep-copy', location.origin + '/?session_id=' + encodeURIComponent(sid || ''), 'link_copy');
    var stack = document.getElementById('report');
    var toc = tocHtml(stack);
    if (toc) {
      stack.insertAdjacentHTML('afterbegin', toc);
      Array.prototype.forEach.call(stack.querySelectorAll('.toc button'), function (b) {
        b.onclick = function () { var to = document.getElementById(b.dataset.to); if (to) to.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
      });
    }
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

  // ---------- 起動 ----------
  function boot() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-start]'), function (b) { b.onclick = startQuiz; });
    var brand = document.getElementById('brand');
    if (brand) brand.onclick = function (e) { e.preventDefault(); renderIntro(); };
    if (API.demo) setupDemo();
    var params = null;
    try { params = new URLSearchParams(location.search); } catch (e) { params = null; }
    var inv = params && normalize(params.get('invite'));
    if (inv && LC.parseCode(inv)) { sset('lc_invite', inv); trackOnce('invite_open'); }
    // 同じタブで結果のリンク（#コード）を開いたときにも結果を出す
    window.addEventListener('hashchange', function () {
      var code = (location.hash || '').slice(1);
      if (LC.parseCode(code)) showResult(code, null);
    });
    route();
  }
  function route() {
    var sid = null;
    try { sid = new URLSearchParams(location.search).get('session_id'); } catch (e) { sid = null; }
    if (sid) {
      view('result');
      app.innerHTML = '<p class="muted">お支払いを確認しています…</p>';
      API.report(sid).then(function (rep) {
        if (rep && rep.code) {
          // 購入は、同じ購入IDにつき一度だけ数える（URLを開き直しても増えない）
          var counted = load('lc_counted', []);
          if (counted.indexOf(sid) < 0 && PLAN_INFO[rep.plan]) { counted.push(sid); save('lc_counted', counted); track('purchase_' + rep.plan); }
          savePaid(rep.code, sid, rep.plan); setHash(rep.code); showResult(rep.code, null); return;
        }
        app.innerHTML = '<section class="panel"><p class="err">' + ((rep && rep.error) || '購入情報を確認できませんでした') + '</p>' +
          '<p class="note">コンビニ払いなどでお支払いが完了していない場合は、完了後にこのページを開き直してください。</p><div><button class="btn small" id="top">トップへ</button></div></section>';
        document.getElementById('top').onclick = renderIntro;
      });
      return;
    }
    var code = (location.hash || '').slice(1);
    var start = false;
    try { start = new URLSearchParams(location.search).get('start') === '1'; } catch (e) { start = false; }
    if (LC.parseCode(code)) showResult(code, null);
    else if (start) { setHash(''); startQuiz(); }   // タイプ別ページの「診断する」から来たときは、すぐ1問目へ
    else renderIntro();
  }
  boot();
})();
