# GitHub Pages Deployment Report — Final Candidate 2.3

## 対象

- Repository: `NOTO-ReBloom/fourth-bedroom`
- Public URL: `https://noto-rebloom.github.io/fourth-bedroom/`
- Deployment method: GitHub Actions
- Published directory: `site/`

## パッケージ側の検証

- ルート絶対パスなし
- `start_url`と`scope`は`./`
- 404ページと`.nojekyll`を同梱
- `site/`だけをPages artifactとしてアップロード
- サービスワーカーのキャッシュ名を`fourth-bedroom-v2.3.0`へ更新
- 動的人物画像はすべて`assets/characters/expressions/...`の相対パス
- 78画像の存在とデコードを検証済み

## 公開前確認

2026-07-22時点で公開URLは到達可能だが、表示上はFinal Candidate 2.0である。Final Candidate 2.3はこの成果物から既存GitHubへ上書きした後に公開される。

## 公開後の合格条件

- ページタイトル：`第四の寝室 — Final Candidate 2.3`
- タイトル画面：`VERSION 2.3.0`
- DevTools Networkで人物画像の404がない
- PCとスマートフォンで人物が表示される
- 既存セーブが読み込める
- 強制再読み込み後も2.3.0が維持される

この環境からGitHubへのpush操作は行っていない。差分ZIPまたは完全版ZIPをリポジトリへ反映した後、Actionsと公開URLで最終確認する。
