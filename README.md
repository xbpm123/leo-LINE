# ラブコード診断

恋の不安のクセ（愛着スタイル）× 愛の言語 で「EOSH-WP」のようなコードを出す診断サイト。
無料で結果の概要。有料レポートは3プラン（買い切り・税込）:

| プラン | 価格 | 中身 | 表示される文字数（句読点込み） |
|---|---|---|---|
| 無料 | 0円 | タイプの説明、タイプの物語、恋愛あるある、愛の言語の概要、恋人から見たあなた、今週からできる一歩、強み | 約750字 |
| ライト | 980円 | 自分の取扱説明書（恋人から見たあなた、強みとつまずき、合う相手、ペース、愛の言語の取扱説明、言い換え、Q&A、恋人に見せる取扱説明書など） | 約3,900〜4,800字 |
| スタンダード | 1,980円 | ライト＋ケンカ・嫉妬・失恋・復縁・結婚・マッチングアプリ、段階別アドバイス、16タイプとの付き合い方、相性チェック | 約7,300〜8,200字 |
| ペア | 2,980円 | 2人分のスタンダード＋2人だけの相性レポート | 約15,000〜16,000字 |

愛の言語が1つだけの人は、2つの人より少し短くなる。

文章の文体ルール: 地の文は「です・ます」、読み手への勧めは「〜しましょう」「〜してみてください」、箇条書きは常体。
AIっぽい言い回しは yomiyasu（v1.0.4）の基準で直してある。

購入済みのプランからは差額でアップグレードできる（ライト→スタンダード 1,000円など）。
価格は `lib/plans.js` を直せば、購入の金額と結果ページの料金表に反映される。
`public/legal.html`（特商法ページ）と `public/llms.txt` に書いた料金は手で直す。直し忘れると `npm test` が落ちる。

トップページ（導入ページ）には、料金も有料レポートの話も出さない。値段を先に見せると「やってみたい」より先に品定めが始まるため。料金は、診断の結果を見たあとに初めて出す。

## ターゲットとデザイン

- 主なターゲット: 20代の女性（とくに22〜29歳）。交際中、片思い、曖昧な関係、マッチングアプリで出会いを探している人。恋に不安を感じやすい「たしかめ型」「ゆらぎ型」がいちばん刺さる層
- デザイン: 白地・大きな見出し・余白多め。アクセントは1色（ローズレッド）で、愛着スタイル4つにだけ色を付ける。フォントは端末のゴシック体（ヒラギノ角ゴ / Noto Sans JP）、英字コードだけ Outfit
- トップページの文章の方針: 読む人がすでに感じている不安を言葉にして（「なんで私ばっかり、不安になるんだろう」）、すぐに「それは性格でも病気でもなく、クセ」と言い直し、診断で名前がつくことを約束する。新しい不安を植えつけたり、「愛着障害です」と決めつけたりはしない（愛着障害は医師が診断するもの。この診断で分かるのは傾向）。言葉は「愛着スタイル」「愛の言語（ラブランゲージ）」に統一
- 色の役割: アクセント色（ローズレッド、`--accent`）は「押すもの」（ボタン・選択中の項目）だけに使う。読み物の飾り（箇条書きの点、見出しの印、グラフ）は `--mark` で、結果ページとレポートではその人の愛着スタイルの色になる（ひだまり型=黄土、たしかめ型=ローズ、ひとり時間型=青、ゆらぎ型=紫）
- 改行: 見出し・質問・短い文は、文節の切れ目でだけ改行する（`public/phrase.js`）。CSS の `word-break: auto-phrase` は iPhone の Safari で効かないので使わない。長い本文は行の端まで詰め、最後の行に1〜2文字だけ落ちないようにしている。スマホの幅 320 / 375 / 390 / 430px で、トップ・30問すべて・結果・タイプ別ページを確認済み
- 導入ページ（`public/index.html` の `#lp`）は静的な HTML。検索エンジンや AI のクローラーが JavaScript なしで読める。診断と結果は同じページの `#app` に `app.js` が描く

## 構成

| 場所 | 中身 |
|---|---|
| `public/` | サイト本体（静的ファイル）。`index.html` は導入ページ、`data.js` は無料部分の文章と質問、`app.js` は診断と結果の画面 |
| `public/robots.txt` `sitemap.xml` `llms.txt` `_headers` | 検索エンジン・AI向けの案内と、配信時のヘッダー |
| `tools/og.html` `tools/icon.html` | SNSで共有されたときの画像（`public/og.png`）とホーム画面アイコンの元 |
| `tools/build-types.mjs` | 16タイプの個別ページ（`public/types/`）と `sitemap.xml` を `data.js` から作る。`npm run build:types` |
| `tools/build-og.mjs` | タイプ別のシェア画像（`public/og/`）を作る。`npm run build:og`（Mac の Chrome が必要） |
| `functions/api/event.js` `lib/events.js` | 計測。何人がどこまで進んだかを1日ごとの合計で数える |
| `wrangler.toml` | Cloudflare Pages の設定（計測用データベースのつなぎ込み） |
| `lib/premium.js` | 有料レポートの文章。サーバー側だけにあり、支払い確認後に返す |
| `lib/plans.js` | 料金プランと差額の計算 |
| `functions/api/plans.js` | 料金表を画面に返す |
| `functions/api/checkout.js` | Stripe Checkout の支払いページを作る |
| `functions/api/report.js` | 支払い済みか Stripe に確認してレポートを返す |
| `build-demo.mjs` | 決済をモックした1ファイルのデモ（`dist/demo.html`）を作る |
| `test.mjs` | 採点、全パターンのレポート、API の入力チェックと購入の流れをテスト |

ホスティングは Cloudflare Pages（無料プランで商用利用可）、決済は Stripe Checkout。
DB もサーバーも不要。購入の証明は Stripe の Checkout Session ID。

## 公開までの手順

1. **Stripe のアカウントを作る**（https://dashboard.stripe.com/register）
   - 本人確認と銀行口座を登録。審査が通るまではテストモードで動作確認できる
   - 「設定 → 決済手段」で カード / Apple Pay / Google Pay を有効化
2. **Cloudflare のアカウントを作る**（https://dash.cloudflare.com/sign-up）
3. このフォルダで:
   ```sh
   npm install
   npx wrangler login
   npm run deploy            # 初回は lovecode プロジェクトが作られ、https://lovecode.pages.dev などのURLが出る
   ```
4. Stripe のシークレットキーを Cloudflare に登録（キーはチャットやコードに書かない）:
   ```sh
   npx wrangler pages secret put STRIPE_SECRET_KEY --project-name lovecode
   # まずは sk_test_... で試し、テストカード 4242 4242 4242 4242 で購入できるか確認
   ```
5. `public/legal.html` の［ ］を自分の情報に書き換えて、もう一度 `npm run deploy`
   - 日本でネット販売するなら「特定商取引法に基づく表記」は必須
6. 動作確認できたら STRIPE_SECRET_KEY を `sk_live_...` に入れ替えて本番開始

独自ドメインは Cloudflare Pages の「カスタムドメイン」から追加できる。
ドメインを変えたら、`public/` の中の `https://lovecode-9ax.pages.dev` をすべて新しいドメインに置き換える（index.html の canonical・OGP・構造化データ、legal.html、robots.txt、llms.txt）。`tools/build-types.mjs` の `SITE` も直して `npm run build:types` を実行する（タイプ別ページと sitemap.xml が作り直される）。

公開後にやること（SEO）:
- Google Search Console にサイトを登録して、`sitemap.xml` を送信する
- Bing Webmaster Tools にも登録する（ChatGPT や Copilot の検索は Bing の索引を使う）

OG画像を作り直すとき（Mac の Chrome を使う）:
```sh
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --hide-scrollbars --force-device-scale-factor=1 --window-size=1200,630 --screenshot="$PWD/public/og.png" "file://$PWD/tools/og.html"
```

## ローカル確認

```sh
npm test               # テスト
npm run build:demo     # dist/demo.html（決済なしデモ）
echo 'STRIPE_SECRET_KEY=sk_test_...' > .dev.vars && npm run dev   # 本番と同じ構成で起動
```

## メモ
- 診断結果はブラウザの localStorage にだけ保存。購入済みレポートは同じブラウザなら再表示できる。
  別端末で見たい人には、Stripe の領収メールに URL を入れる、などを後で追加するとよい。
- 文章を直すときは `public/data.js`（無料）と `lib/premium.js`（有料）を触る。`data.js` を直したら `npm run build:types` でタイプ別ページを作り直す。タイプ名やキャッチコピーを変えたら、`public/index.html` の16タイプ一覧と `public/llms.txt` も合わせ、`npm run build:og` でシェア画像も作り直す（ずれると `npm test` が落ちる）。

## 計測（何人がどこまで進んだか）

```sh
npm run stats    # 日付・出来事・回数の一覧が出る
```

- 数えているもの: 導入ページを開いた → 診断を始めた → 10問目 → 20問目 → 結果を見た → 料金プランを見た → 購入ボタンを押した → 購入した、のそれぞれの回数。ほかにシェア、招待、タイプ別ページの閲覧。一覧は `lib/events.js`
- 回答・診断結果・IPアドレスは受け取らないし保存しない。Cookie も使わない。同じ人が2回来たら2回と数える
- 保存先は Cloudflare D1 の `lovecode-stats`（無料枠）。表は `tools/stats-schema.sql`

## 購入までの流れを助ける仕組み

- 結果ページの有料部分は「読みかけ → 区切り → 続き」の形:
  - 無料の内容のあと、有料レポートの最初の章「恋人から見たあなた」（今週からできる一歩まで）と、次の章の「強み」を全部見せる。「つまずきやすいところ」は1つ目だけ見せ、2つ目の書き出しが薄く消えていくところで区切る（`/api/preview`、`lib/preview.js`）
  - 無料の範囲を変えるときは `lib/preview.js` と、`app.js` の `renderPaywall` を合わせて直す。レポート全体の12%を超えるとテストが落ちる
  - 「ここから先は有料です」の区切りには、続きの文字数と章の目次、「続きを読む」のボタンだけを置く。プランは並べない
  - 「続きを読む」を押すとシートが開き、そこで初めてプランを選ぶ。迷いやすい点（あとから差額で変えられる、買い切り、返金不可）もここに書く
  - 決済ページから買わずに戻ると（`/?canceled=1#コード`、またはブラウザの「戻る」）、区切りの位置に戻して「料金はかかっていません」と伝える
  - 見出しの横に「無料」やプラン名のタグは付けない。購入済みの人には、持っていないプランの章だけを同じ区切りで見せる

- タイプ別ページ `/types/<コード>`: 検索からの入口と、シェアの着地先。「診断する」は `/?start=1` で1問目から始まる
- シェア: 結果ページのシェアはタイプ別ページのURLを送る（タイプごとの画像が出る）
- 招待: 結果ページの「相手にも診断してもらう」が `/?invite=<自分のコード>` を送る。相手が診断を終えると「コードを送る」が出て、ペアプランの相手コード欄には招待した人のコードが最初から入る
- 別端末: 購入後のレポートに「レポートのURLをコピー」がある（`/?session_id=...`）。このURLを開けばどの端末でも読める
