# 第四の寝室 — Final Candidate 2.3

死に戻り型美術史サスペンス『第四の寝室』のGitHub Pages公開用完成候補版です。Final Candidate 2.2の物語・分岐・表示文法を維持し、架空人物6名の人物画を「人物ごとの単独透過画像＋表情差分」へ置き換えました。

## 起動

`site/index.html`を静的サーバーまたはGitHub Pagesで公開します。

```bash
python -m http.server 8000 --directory site
```

## 主な仕様

- 全700ノード、TRUE／NORMAL／BAD END 3種の計5エンディング
- 必須死亡 `GO01 → GO04 → GO26` と死に戻り規則を維持
- 水瀬澄の限定視点
- 会話／心の声／観察／文書／システム表示の分離
- セーブ、AUTO、既読SKIP、観察手帳、会話ログ
- PC・スマートフォン対応
- GitHub Pagesサブパス対応、サービスワーカー対応
- 架空人物6名 × 13表情、計78枚の単独透過WebP
- フィンセントとゴーギャンは史実上の自画像を用いる別系列表示

## 検証

```bash
node scripts/validate-site.mjs
python scripts/validate-character-assets.py
python tests/chromium_final_v23.py
```

## 既存サイトの更新

`UPDATE_EXISTING_GITHUB.md`に従い、差分ZIPの中身を既存リポジトリへ上書きしてください。保存キーはFinal Candidate 2.1／2.2と同じ名前空間を維持しています。
