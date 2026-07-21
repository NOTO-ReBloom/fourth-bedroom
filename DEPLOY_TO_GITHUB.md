# GitHub Pages 公開手順

## 方法A：GitHub DesktopまたはGitで公開する

### 1. リポジトリを作る

GitHubの「New repository」から新しいリポジトリを作成します。名前の例：

```text
fourth-bedroom
```

READMEやライセンスの自動追加は不要です。

### 2. ファイルをpushする

このフォルダをターミナルで開き、次を実行します。

```bash
git init
git add .
git commit -m "Publish The Fourth Bedroom"
git branch -M main
git remote add origin https://github.com/あなたのユーザー名/リポジトリ名.git
git push -u origin main
```

### 3. Pagesを有効にする

1. GitHub上でリポジトリを開く
2. `Settings`
3. 左側の `Pages`
4. `Build and deployment` の `Source`
5. `GitHub Actions` を選択

`Deploy GitHub Pages` ワークフローが完了すると、公開URLが表示されます。

プロジェクトサイトの場合、URLは通常次の形です。

```text
https://あなたのユーザー名.github.io/リポジトリ名/
```

## 方法B：GitHubのWeb画面だけで公開する

1. 新規リポジトリを作成
2. `Add file → Upload files`
3. このフォルダの中身をアップロード
4. `.github/workflows/deploy-pages.yml` を含め、階層を崩さない
5. コミット後、`Settings → Pages → GitHub Actions` を選択

隠しフォルダ `.github` をアップロードできない場合は、GitHub上で `.github/workflows/deploy-pages.yml` を新規作成し、同梱ファイルの内容を貼り付けてください。

## 更新方法

ゲームを更新する場合は、原則として `site/` の内容を差し替え、`main` へpushします。静的ファイル検査に通った場合だけ公開版が更新されます。

## よくある問題

### 404になる

- `Settings → Pages` のSourceが `GitHub Actions` になっているか確認
- Actionsタブで `Deploy GitHub Pages` が成功しているか確認
- 公開URL末尾の `/リポジトリ名/` を省略していないか確認

### 画像が表示されない

ファイル名の大文字・小文字はGitHub Pages上で区別されます。`site/assets/` の階層を変更しないでください。

### セーブが消えたように見える

セーブは公開URL単位で保存されます。リポジトリ名、独自ドメイン、HTTP/HTTPSが変わると別保存になります。

### Actionsが権限エラーになる

リポジトリの `Settings → Actions → General` と `Settings → Pages` を確認してください。ワークフローにはPages公開に必要な `pages: write` と `id-token: write` を設定済みです。
