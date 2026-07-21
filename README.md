# 第四の寝室 — GitHub Pages版

フィンセント・ファン・ゴッホの《寝室》を題材にした、死に戻り型美術史サスペンスのブラウザゲームです。

## そのまま公開する方法

このリポジトリは、`main` ブランチへ置くだけで GitHub Actions が `site/` を検証し、GitHub Pagesへ公開する構成です。

1. GitHubで新しいリポジトリを作成します。
2. このフォルダの**中身すべて**を、階層を保ったまま追加します。
3. リポジトリの **Settings → Pages** を開きます。
4. **Build and deployment → Source** で **GitHub Actions** を選びます。
5. `main` ブランチへpushすると、`Deploy GitHub Pages` が実行されます。
6. 完了後、Pages画面またはActionsのデプロイ結果に公開URLが表示されます。

詳しい手順は [DEPLOY_TO_GITHUB.md](DEPLOY_TO_GITHUB.md) を参照してください。

## リポジトリ構成

- `site/` — GitHub Pagesで公開されるゲーム本体
- `.github/workflows/deploy-pages.yml` — 自動検査・公開ワークフロー
- `scripts/validate-site.mjs` — 公開前の静的ファイル検査
- `docs/` — QA・プレイテスト資料

## ローカル確認

Pythonがある場合：

```bash
python -m http.server 8000 --directory site
```

その後、ブラウザで `http://localhost:8000/` を開きます。

## 保存データ

セーブデータとプレイ記録はブラウザの `localStorage` に保存されます。公開URL、リポジトリ名、独自ドメインを変更すると、ブラウザ上では別の保存領域として扱われます。

## 権利・出典

史実上の作品画像とゲーム用素材の区別・出典は、`site/CREDITS_AND_SOURCES.md` に記載しています。公開前に確認してください。
