# 既存GitHub PagesをFinal Candidate 2.3へ更新する

## 上書き手順

1. `FOURTH_BEDROOM_FINAL_CANDIDATE_V2_3_PATCH_ONLY.zip`を解凍する。
2. 解凍したフォルダの**中身すべて**を選択する。
3. GitHubの`NOTO-ReBloom/fourth-bedroom`リポジトリを開く。
4. `Add file` → `Upload files`を選ぶ。
5. ファイルとフォルダを階層を保ったままドラッグする。
6. 同名ファイルの上書きを確認し、`Commit changes`を押す。
7. `Actions`の`Deploy GitHub Pages`が緑色になるまで待つ。
8. 公開URLを開き、タイトル下部が`VERSION 2.3.0`になったことを確認する。
9. 古い表示が残る場合は`Ctrl + Shift + R`で強制再読み込みする。スマートフォンではタブを閉じて再度開く。

## 追加される主なファイル

- `site/assets/characters/expressions/`以下の78枚
- `scripts/generate-character-variants.py`
- `scripts/validate-character-assets.py`
- `tests/chromium_final_v23.py`
- `docs/CHARACTER_ART_BIBLE_V23.md`
- `docs/CHARACTER_ASSET_MANIFEST_V23.json`

## 上書きされる主なファイル

- `site/index.html`
- `site/styles.css`
- `site/game.js`
- `site/data/game-data.js`
- `site/site.webmanifest`
- `site/service-worker.js`
- `scripts/validate-site.mjs`
- `README.md`
- `FINAL_CANDIDATE_REPORT.md`
- `FINAL_QA_REPORT.md`

## 更新後の確認

- 公開URL：`https://noto-rebloom.github.io/fourth-bedroom/`
- VERSION：2.3.0
- 水瀬澄の通常／疲労／恐怖で顔が切り替わる
- モバイルで人物と文章パネルが重ならない
- 続きから既存セーブを読み込める

差分ZIPはファイル削除を必要としない。旧人物マスターは再生成用として残るが、ゲーム本体からは参照されない。
