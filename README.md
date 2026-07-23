# 第四の寝室 — Final Candidate 2.16

Visual Narrative Continuity。章アート、結末サムネイル、セマンティックオーバーレイを統合し、長編の現在地と同じ空間の意味変化を視覚化した公開候補版です。

Visual Narrative Continuity。章アート、結末サムネイル、セマンティックオーバーレイを統合し、長編の現在地と同じ空間の意味変化を視覚化した公開候補版です。

死んで知った真実を、現在の証拠だけで証明する、美術調査サスペンスADV。

## 2.15の中心

- 第四版を同一座標の診断画像10モードで比較
- 可視光・斜光・赤外線をゲーム本編の調査へ直接統合
- 紫外線、X線、裏面、1948年層、1967年層、年代層分解、最終保存状態を証拠取得に応じて解放
- 基準画像との重ね合わせ、透明度、拡大率の操作
- 証拠接写17点を観察手帳と拡大ビューへ統合
- 調査・停止・救助など9場面へアクションカットインを追加
- 2.14までのイベントCG、年代層マップ、再開整理、人物協力、共同署名を維持

## 起動

`site/index.html`をWebサーバーから配信するか、リポジトリをGitHub Pagesへ公開してください。相対参照のみで構成され、`/fourth-bedroom/`サブパスに対応しています。

## 更新

2.14から更新する場合は、PATCH_ONLY ZIPの内容をリポジトリ直下へ上書きしてください。既存セーブはV215形式へ正規化され、V210〜V214の読込分岐を維持します。

## 検証

- 静的検証：`node scripts/validate-site-v215.mjs site`
- 2.14保護監査：`python scripts/audit-diagnostic-atlas-v215.py --baseline <V214/site> --current site`
- 診断アトラス：`python scripts/browser-diagnostic-atlas-v215.py`
- TRUE END通し：`PYTHONPATH=tests python tests/chromium_full_route_v215.py`
- GitHub Pages：`python tests/github_pages_subpath_v215.py`
