# GitHub Pages 移植レポート

## 公開方式

- 公開対象：`site/`
- デプロイ：GitHub Actions
- ビルド工程：なし（静的HTML / CSS / JavaScript）
- Jekyll：`.nojekyll` により無効化
- 外部ランタイム依存：なし
- 公開URLのサブパス対応：確認済み

## 自動検査

push時に `scripts/validate-site.mjs` を実行し、次を検査します。

- 必須ファイルの存在
- HTML / CSSのルート絶対パス混入
- 参照される画像・スクリプトの存在
- ゲームデータ700ノードの読み込み
- ノードIDの重複

検査に失敗した場合、Pagesへのデプロイは実行されません。

## サブパス検証

GitHub Pagesのプロジェクトサイトを想定し、次の形式で検証しました。

```text
/fourth-bedroom/
```

HTML、CSS、JavaScript、画像、manifestを含むローカル参照42件がすべてHTTP 200で取得できることを確認しています。詳細は `docs/GITHUB_PAGES_SUBPATH_TEST.json` を参照してください。

## セーブデータ

セーブ、設定、プレイ記録はブラウザのlocalStorageへ保存されます。保存領域は公開元のオリジンとパス構成に依存するため、URL変更時には既存セーブが自動移行されない場合があります。
