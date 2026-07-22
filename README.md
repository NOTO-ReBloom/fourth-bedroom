# 『第四の寝室』Final Candidate 2.0

# 第四の寝室 — Narrative 1.9 / GitHub Pages版

フィンセント・ファン・ゴッホの《寝室》を題材にした、死に戻り型美術史サスペンスのブラウザゲームです。

Narrative 1.8で全編を**水瀬澄の限定視点で進むシネマティックADV**へ再構成し、Narrative 1.9では全台詞の話者、人物固有の声、沈黙、引用文の扱いを再監査しました。

## Narrative 1.9の主な変更

- 全700ノード・1621セグメントを再監査
- 自動分割で残っていた話者誤認を修正
- 会話、澄の知覚・内心、文書、システム表示を再分類
- 人物別の発話速度・間・文体を`delivery`として実装
- 画面表示や解釈ラベルを会話ログから除外
- 選択・調査・パズル・全死亡復帰・全エンディングを維持
- セグメント途中のセーブ、AUTO、既読SKIP、ログを維持
- Narrative 1.8の保存データを自動移行

## 公開済みサイトを更新する

[UPDATE_EXISTING_GITHUB.md](UPDATE_EXISTING_GITHUB.md) の手順に従い、差分パッケージの中身を既存リポジトリへ上書きします。

`main`へコミットすると、既存のGitHub Actionsが自動検査後にGitHub Pagesを更新します。

## 新しいリポジトリで公開する

1. GitHubで新しいリポジトリを作成します。
2. このフォルダの**中身すべて**を階層を保って追加します。
3. **Settings → Pages → Source**で**GitHub Actions**を選びます。
4. `main`へpushすると`Deploy GitHub Pages`が実行されます。

詳しい初回公開手順は [DEPLOY_TO_GITHUB.md](DEPLOY_TO_GITHUB.md) を参照してください。

## リポジトリ構成

- `site/` — 公開されるゲーム本体
- `site/data/game-data.js` — 全700ノードとNarrative 1.9本文
- `site/game.js` — セグメント表示・人物別テンポ・セーブ・操作エンジン
- `.github/workflows/deploy-pages.yml` — 自動検査・公開
- `scripts/validate-site.mjs` — 構造、話者所有権、全エンディング到達性の検査
- `docs/` — 文章設計、人物声設計、伏線対応表、QA記録
- `tests/` — クリアルート、話者監査、ブラウザ検証結果

## Narrative 1.9の設計資料

- [人物別の声と演技基準](docs/CHARACTER_VOICE_BIBLE.md)
- [台詞研磨・話者修正報告](docs/DIALOGUE_POLISH_REPORT_V19.md)
- [Narrative 1.9整合性監査](docs/NARRATIVE_CONSISTENCY_AUDIT_V19.md)
- [Narrative 1.9テスト結果](docs/TEST_REPORT_NARRATIVE_V19.md)
- [キーポイント保存対応表](docs/KEYPOINT_PRESERVATION_MATRIX.md)
- [限定視点化の基礎方針](docs/NARRATIVE_DIRECTION_V1_8.md)

## ローカル確認

```bash
python -m http.server 8000 --directory site
```

ブラウザで `http://localhost:8000/` を開きます。

## 保存データ

セーブデータとプレイ記録はブラウザの`localStorage`に保存されます。同じ公開URLで更新する場合、Narrative 1.8の保存をNarrative 1.9へ自動移行します。旧保存は削除しません。

## 権利・出典

史実上の作品画像とゲーム用素材の出典は、`site/CREDITS_AND_SOURCES.md`に記載しています。
