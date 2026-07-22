# 既存の fourth-bedroom を Final Candidate 2.0へ更新する

1. `FOURTH_BEDROOM_FINAL_CANDIDATE_V2_0_PATCH_ONLY.zip`を解凍する。
2. 解凍したフォルダの中にある`site`フォルダを含む全項目を選択する。
3. GitHubの`NOTO-ReBloom/fourth-bedroom`を開く。
4. `Add file` → `Upload files`。
5. ブラウザへドラッグし、同名ファイルを上書きする。
6. Commit messageへ `Update to Final Candidate 2.0` と入力してコミットする。
7. `Actions`でデプロイが緑色になるまで待つ。
8. `https://noto-rebloom.github.io/fourth-bedroom/`を開き、`Ctrl + Shift + R`で強制再読み込みする。

## 上書きされる主要項目
- `site/game.js`
- `site/styles.css`
- `site/index.html`
- `site/data/game-data.js`
- `site/assets/characters/*.webp`

`.github/workflows/deploy-pages.yml`の変更は不要。
