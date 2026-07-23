# GitHub更新チェックリスト

## 推奨手順

1. 現在のGitHubリポジトリをZIPでバックアップする。
2. リポジトリをGitHub Desktopまたは`git clone`でローカルへ取得する。
3. 既存の`site/`フォルダを削除する。
4. `PAYLOAD_TO_REPOSITORY_ROOT/`の中身をリポジトリ直下へコピーする。
5. 次を実行する。

```bash
node scripts/validate-site-v215.mjs
```

合格時は`"passed": true`、`"version": "2.15.0"`が表示される。

6. 変更内容を確認してpushする。

```bash
git status
git add -A
git commit -m "Update The Fourth Bedroom to Final Candidate 2.15"
git push origin main
```

7. GitHubの`Actions`で`Deploy GitHub Pages`が成功するまで確認する。
8. 公開URLを開き、必要なら強制再読込する。

## 公開後に確認する項目

- タイトル下部が`VERSION 2.15.0`
- タイトルコピーが「死んで知った真実を、現在の証拠だけで証明せよ。」
- 新規開始が可能
- 音を有効にしてBGM・環境音が再生される
- 第四版調査で可視光・斜光・赤外線が切り替わる
- 診断アトラスが開く
- 観察手帳で証拠接写を拡大できる
- スマートフォンで横スクロールが発生しない
- `つづきから`で旧セーブを読める

## キャッシュが古い場合

1. `Ctrl + Shift + R`または`Cmd + Shift + R`で強制再読込する。
2. それでも古い場合は、サイトデータまたはService Workerを削除して再度開く。
3. GitHub Actionsの最新デプロイが成功しているか確認する。
