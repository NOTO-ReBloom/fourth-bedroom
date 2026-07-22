# 公開済みGitHub PagesをNarrative 1.9へ更新する

現在のリポジトリ`fourth-bedroom`へ、Narrative 1.9の差分ファイルを上書きする。

## 推奨：差分ZIPを使う

1. `FOURTH_BEDROOM_NARRATIVE_V1_9_PATCH_ONLY.zip`をダウンロードする。
2. ZIPを右クリックし、すべて展開する。
3. 展開したフォルダの**中身**をすべて選択する。
4. GitHubの`fourth-bedroom`リポジトリで **Add file → Upload files** を開く。
5. 選択したファイルとフォルダをブラウザへドラッグする。
6. 同名ファイルが更新対象として表示されたことを確認する。
7. **Commit changes**を押す。
8. **Actions → Deploy GitHub Pages**が緑色になるまで待つ。
9. 公開ページで強制再読み込みする。

Windows／Chrome：`Ctrl + Shift + R`

## 差分ZIPに含まれる主な更新ファイル

- `site/data/game-data.js`
- `site/game.js`
- `site/styles.css`
- `site/index.html`
- `scripts/validate-site.mjs`
- `README.md`
- `UPDATE_EXISTING_GITHUB.md`
- `docs/CHARACTER_VOICE_BIBLE.md`
- `docs/DIALOGUE_POLISH_REPORT_V19.md`
- `docs/NARRATIVE_CONSISTENCY_AUDIT_V19.md`
- `docs/TEST_REPORT_NARRATIVE_V19.md`
- `docs/CHANGELOG.md`
- `tests/dialogue_attribution_audit_v19.json`
- `tests/clearability_routes_v19.json`
- `tests/browser_narrative_v19.json`

`.github/workflows/deploy-pages.yml`は変更不要。

## 上書き後の確認

公開ページのタイトル画面下部に、次が表示されれば更新済み。

```text
CHARACTER VOICE & PERFORMANCE PASS · VERSION 1.9.0
```

古い表示のままなら、次を順番に行う。

1. GitHubの**Actions**で最新デプロイが緑色か確認する。
2. 公開ページを`Ctrl + Shift + R`で強制再読み込みする。
3. それでも変わらない場合は、ブラウザのサイトデータではなくキャッシュだけを削除する。

## セーブデータ

Narrative 1.8の保存は、初回起動時にNarrative 1.9へコピーされる。

- オートセーブ
- 手動スロット1
- 手動スロット2
- 手動スロット3

旧保存は削除しない。同じ公開URLであれば、既存の進行を引き継げる。

## 完全パッケージを使う場合

新しいリポジトリを作り直す場合や、現在のファイル構成に不安がある場合は、`FOURTH_BEDROOM_NARRATIVE_V1_9_GITHUB_READY.zip`を使う。解凍した中身すべてをリポジトリ直下へアップロードする。
