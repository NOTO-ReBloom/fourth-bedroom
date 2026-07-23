# GitHub Actions検証スクリプト修正

## 発見した問題

Final Candidate 2.15完全版に含まれていた`.github/workflows/deploy-pages.yml`は、`scripts/validate-site.mjs`を実行する設定だった。
しかし、この標準ファイルは2.12.0を期待する旧判定を含んでおり、2.15.0の正常なサイトを失敗扱いした。

## 今回の修正

- ワークフローを`node scripts/validate-site-v215.mjs`へ変更
- `scripts/validate-site.mjs`自体も2.15専用版へ同期
- 修正後の独立検証で合格を確認

ゲーム本体のシナリオ・画像・音源・セーブ仕様は変更していない。
