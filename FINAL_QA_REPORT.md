# Final QA Report — 2.3

## 静的検証

`node scripts/validate-site.mjs`

- 必須ファイル：PASS
- 相対パス／GitHub Pagesサブパス：PASS
- 参照ファイル切れ：なし
- GAME_DATA：700ノード
- 重複ノードID：なし
- 全遷移先：存在
- 全ゲームオーバー復帰先：存在
- 限定視点・話者所有権監査：PASS
- 5エンディング到達シミュレーション：PASS
- 必須死亡 `GO01 → GO04 → GO26`：維持
- Final Candidate 2.2との正規化JSON比較：`evidence`／`nodes`／`gameovers`／`endings`が同一ハッシュ
- 物語本文、証拠、死亡復帰規則、エンディング内容の変更：なし
- 検証対象：131ファイル、約13.8 MiB

## 人物アセット検証

`python scripts/validate-character-assets.py`

- 架空人物：6名
- 表情：各13種
- 合計：78ファイル
- 画像サイズ：全て720×960
- 透明背景：PASS
- 四隅の透明性：PASS
- 単一人物シルエット：PASS
- ファイル重複：なし
- 同一人物内の顔構造保持：PASS
- 非通常表情の差分量：PASS
- ゲーム本体からQAコンタクトシート参照：なし

詳細は`tests/character_asset_validation_v23.json`を参照。物語データの比較結果は`tests/game_data_integrity_v23.json`を参照。

## Chromium検証

`python tests/chromium_final_v23.py`

- VERSION 2.3表示：PASS
- 78人物画像の読込・デコード：PASS
- 6人物の代表シーン表示：PASS
- フィンセント／ゴーギャンの別系列表示：PASS
- 会話時の話者名表示：PASS
- 心の声で名前欄を出さない：PASS
- 心の声に「内心」等の説明ラベルを出さない：PASS
- 観察文で名前欄を出さない：PASS
- 発話者フォーカス：PASS
- 1440×900：水平オーバーフローなし
- 390×844：水平オーバーフローなし
- モバイル2人物表示：PASS
- 人物の顔と文章パネルの干渉：なし
- JavaScript例外：なし
- コンソールエラー：なし

## 全ルート検証

同一の選択経路で最終選択だけを変え、次の5到達点を確認した。

- `endBad1`
- `endBad2`
- `endBad3`
- `endNormal`
- `a631`（TRUE END）

全ルートで死亡列は`GO01 → GO04 → GO26`のまま。詳細は`tests/browser_final_v23.json`を参照。

## セーブ互換性

保存キーはFinal Candidate 2.1／2.2と同じ名前空間を維持している。既存のオートセーブと手動3枠をそのまま読み込む。
