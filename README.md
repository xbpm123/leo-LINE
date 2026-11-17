# ラブコード診断

恋の不安のクセ（愛着スタイル）× 愛情言語 で「EOSH-WP」のようなコードを出す診断サイト。
無料で結果の概要。有料レポートは3プラン（買い切り・税込）:

| プラン | 価格 | 中身 | 表示される文字数（句読点込み） |
|---|---|---|---|
| 無料 | 0円 | タイプの説明、タイプの物語、恋愛あるある、愛情言語の概要 | 約500字 |
| ライト | 980円 | 自分の取扱説明書（恋人から見たあなた、強みとつまずき、合う相手、ペース、愛情言語の取扱説明、言い換え、Q&A、恋人に見せる取扱説明書など） | 約3,900〜4,800字 |
| スタンダード | 1,980円 | ライト＋ケンカ・嫉妬・失恋・復縁・結婚・マッチングアプリ、段階別アドバイス、16タイプとの付き合い方、相性チェック | 約7,300〜8,200字 |
| ペア | 2,980円 | 2人分のスタンダード＋2人だけの相性レポート | 約15,000〜16,000字 |

愛情言語が1つだけの人は、2つの人より少し短くなる。

文章の文体ルール: 地の文は「です・ます」、読み手への勧めは「〜しましょう」「〜してみてください」、箇条書きは常体。
AIっぽい言い回しは yomiyasu（v1.0.4）の基準で直してある。

購入済みのプランからは差額でアップグレードできる（ライト→スタンダード 1,000円など）。
価格は `lib/plans.js` を直せば、購入の金額と画面の料金表に反映される。
ただし検索・AI向けに HTML へ直接書いた料金（`public/index.html` の料金表・よくある質問・構造化データ、`public/llms.txt`、`public/legal.html`）は手で直す。直し忘れると `npm test` が落ちる。

## ターゲットとデザイン

- 主なターゲット: 20代の女性（とくに22〜29歳）。交際中、片思い、曖昧な関係、マッチングアプリで出会いを探している人。恋に不安を感じやすい「たしかめ型」「ゆらぎ型」がいちばん刺さる層
- デザイン: 白地・大きな見出し・余白多め。アクセントは1色（ローズレッド）で、愛着スタイル4つにだけ色を付ける。フォントは端末のゴシック体（ヒラギノ角ゴ / Noto Sans JP）、英字コードだけ Outfit
- 導入ページ（`public/index.html` の `#lp`）は静的な HTML。検索エンジンや AI のクローラーが JavaScript なしで読める。診断と結果は同じページの `#app` に `app.js` が描く

## 構成

| 場所 | 中身 |
|---|---|
| `public/` | サイト本体（静的ファイル）。`index.html` は導入ページ、`data.js` は無料部分の文章と質問、`app.js` は診断と結果の画面 |
| `public/robots.txt` `sitemap.xml` `llms.txt` `_headers` | 検索エンジン・AI向けの案内と、配信時のヘッダー |
| `tools/og.html` `tools/icon.html` | SNSで共有されたときの画像（`public/og.png`）とホーム画面アイコンの元 |
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
ドメインを変えたら、`public/` の中の `https://lovecode-9ax.pages.dev` をすべて新しいドメインに置き換える（index.html の canonical・OGP・構造化データ、legal.html、robots.txt、sitemap.xml、llms.txt）。

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
- 文章を直すときは `public/data.js`（無料）と `lib/premium.js`（有料）を触る。タイプ名やキャッチコピーを変えたら、`public/index.html` の16タイプ一覧と `public/llms.txt` も合わせる（ずれると `npm test` が落ちる）。
