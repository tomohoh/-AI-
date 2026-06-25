# AIお絵描きゲーム

20秒でお題を描き、端末内のAI判定で「何に見えるか」を予想するブラウザゲームです。

## GitHubのアップロード画面に入れるもの

このフォルダの中身をすべてアップロードしてください。

- `index.html`
- `style.css`
- `app.js`
- `sw.js`
- `manifest.webmanifest`
- `README.md`
- `assets` フォルダ

## GitHub Pagesで公開する方法

1. GitHubのアップロード画面で、このフォルダの中身をすべてドラッグします。
2. `Commit changes` を押します。
3. リポジトリの `Settings` を開きます。
4. 左メニューの `Pages` を開きます。
5. `Build and deployment` で `Deploy from a branch` を選びます。
6. `Branch` は `main`、フォルダは `/root` を選びます。
7. `Save` を押します。
8. 数分後に表示されるURLを共有できます。

## 遊び方

1. `スタート` を押します。
2. Windows/macOSではマウス、iOS/Androidでは画面タッチで絵を描きます。
3. 20秒たつか、`判定` を押すとAIが予想します。
4. 結果画面で `もう一度` または `終わる` を選びます。

## プライバシー

- カメラは使いません。
- マイクは使いません。
- 外部AIや外部サーバーへ絵を送りません。
- 判定はブラウザ内だけで行います。
