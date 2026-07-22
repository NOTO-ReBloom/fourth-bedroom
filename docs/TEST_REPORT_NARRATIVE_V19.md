# Test Report — Narrative 1.9

## 総合結果

**PASS**

## 静的検証

実行：

```bash
node scripts/validate-site.mjs
node --check site/game.js
node --check site/data/game-data.js
```

確認項目：

- 公開対象46ファイル
- ローカル参照43件
- 全700ノード
- 重複ノードIDなし
- 存在しない遷移先なし
- 空の`script`セグメントなし
- 旧ゴーギャン表記なし
- 澄の一人称に不適切な男性代名詞なし
- 歴史層へのクレール混入なし
- 重要台詞の話者所有権
- 引用ラベルの非会話化
- 5エンディングの到達性

結果：

```text
Validated 46 files, 43 local references, 700 nodes (7.73 MiB).
```

## データ監査

`tests/dialogue_attribution_audit_v19.json`

- 1621セグメント
- 602会話
- 重要話者所有権17件：全PASS
- 引用ラベル非会話化7件：全PASS

`tests/clearability_routes_v19.json`

- BAD END 1：PASS
- BAD END 2：PASS
- BAD END 3：PASS
- NORMAL END：PASS
- TRUE END：PASS

## Chromium検証

検証環境ではローカルURLへの直接遷移が管理ポリシーで遮断されたため、配布版と同一のHTML、CSS、JavaScript、ゲームデータをChromiumの空ページへ注入して検査した。

確認項目：

- Narrative 1.9タイトル
- データバージョン1.9.0
- v19保存名前空間
- v18保存移行設定
- 人物別`delivery`
- フィンセント／クレール／澄の表示切替
- 観測整合則の補正発話
- 最終セグメント前に選択肢が出ないこと
- 最終セグメント後に選択肢が出ること
- 390×844表示で水平オーバーフローなし
- JavaScript例外なし
- コンソールエラーなし

結果：PASS

詳細：`tests/browser_narrative_v19.json`

スクリーンショット：`tests/narrative_v19_mobile.png`

## セーブ互換性

- 新規保存：`fourth-bedroom-production-v19-*`
- 移行元：`fourth-bedroom-production-v18-*`
- v18のオートセーブ、手動3枠を初回起動時に複製
- 旧データは削除しない
- セグメント途中の位置を維持

## ZIP検証

完全パッケージと差分パッケージを生成し、`unzip -t`で全エントリを検査した。

- 完全パッケージ：約8.2 MiB — PASS
- 差分パッケージ：約197 KiB — PASS
- 階層維持 — PASS
- `.github/workflows/deploy-pages.yml`を含む — PASS
- `site/index.html`を含む — PASS
- 差分ZIPのパスが既存GitHubリポジトリへそのまま重なる — PASS
- SHA-256一覧を再生成 — PASS
