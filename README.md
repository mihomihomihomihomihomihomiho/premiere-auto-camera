# Auto Camera Switcher (Premiere Pro UXP)

**Autopod準拠のマルチカメラ自動編集プラグイン**

Auto Camera Switcher は、3台のマルチカメラ映像を話者に応じて自動的に切り替える Premiere Pro UXP 拡張機能です。[Autopod](https://www.autopod.fm/) の Multi-Camera Editor 機能に準拠したワークフローで、ポッドキャスト、インタビュー、対談番組の編集を効率化します。

## 主要機能

### Multi-Camera Editor（Phase 2-3実装済み）

- ✅ **3カメラ自動切り替え** - 話者の音声を検出して適切なカメラに自動スイッチ
- ✅ **4ステップワークフロー** - Setup → Configuration → Processing → Refinement
- ✅ **カスタマイズ可能な設定**
  - 最小カット長（デフォルト: 2.0秒）
  - カット頻度（High/Medium/Low）
  - サンプリングレート（デフォルト: 1.0秒）
  - トランジション時間
- ✅ **視覚的フィードバック** - 音声レベルグラフで処理結果を確認
- ✅ **非破壊編集** - 元のシーケンスを保持し、新規シーケンス生成

### 使用シーン

- ポッドキャスト・対談番組の編集
- インタビュー動画の編集
- パネルディスカッションの編集
- 複数話者のウェビナー収録

## 必要環境
- Adobe Premiere Pro 2024（v25.0）以降
- macOS または Windows
- 3 トラック以上のビデオ素材を含むシーケンス

## インストール手順

### 1. フォルダー配置

**macOS**
```bash
mkdir -p ~/Library/Application\ Support/Adobe/UXP/Plugins/External/
cp -R premiere-auto-camera ~/Library/Application\ Support/Adobe/UXP/Plugins/External/com.miho.autocamera
```

**Windows**
```
mkdir "%APPDATA%\Adobe\UXP\Plugins\External"
xcopy premiere-auto-camera "%APPDATA%\Adobe\UXP\Plugins\External\com.miho.autocamera" /E /I
```

フォルダー名をプラグイン ID (`com.miho.autocamera`) に合わせて配置します。

### 2. Premiere Pro を再起動
Premiere Pro を完全に終了し、再起動するとパネルが読み込まれます。必要に応じて、Premiere Pro の環境設定で「開発モード」を有効化してください。

## 使い方

### クイックスタート（4ステップ）

#### Step 1: Setup（セットアップ）

1. **シーケンスを開く**
   - 3台のカメラがそれぞれ別のビデオトラックに配置されていること
   - 各カメラクリップに音声トラックが含まれていること
   - すべてのクリップが時間的に同期されていること

2. **パネルを表示**
   - `Window → Extensions → Auto Camera Switcher` でパネルを開く

3. **カメラを割り当て**
   - Camera 1 ボタン → タイムラインでクリップ選択
   - Camera 2 ボタン → タイムラインでクリップ選択
   - Camera 3 ボタン → タイムラインでクリップ選択

#### Step 2: Configuration（設定）

パネル上で処理の詳細設定を行います（デフォルト値でも十分機能します）:

- **最小カット長**: 2.0秒（カットの最小持続時間）
- **サンプリングレート**: 1.0秒（音声解析の間隔）
- **カット頻度**: Medium（High/Medium/Low から選択）
- **トランジション**: 0.0秒（カット間のクロスディゾルブ時間）

#### Step 3: Processing（処理）

1. **"Create Multicam Edit"** ボタンをクリック
2. 処理の進行状況がプログレスバーに表示されます:
   - Phase 1: 音声解析中...
   - Phase 2: カット生成中...
   - Phase 3: タイムライン編集中...
3. 完了すると、新しいシーケンス **"[元のシーケンス名]_Multicam"** が作成されます

**処理時間の目安**: 30分の映像で約1-2分

#### Step 4: Refinement（調整）

1. **音声レベルグラフを確認**
   - 各カメラの音声レベルと選択されたカメラを視覚的に確認
2. **生成されたシーケンスを再生**
   - カット点の正確性、カメラ選択の妥当性をチェック
3. **必要に応じて手動調整**
   - カット点の移動、カメラクリップの置換、トランジションの追加など

詳しい使用方法は [`docs/USER_GUIDE.md`](./docs/USER_GUIDE.md) を参照してください。

## ファイル構成
```
premiere-auto-camera/
├── manifest.json        # UXP マニフェスト (manifestVersion 5, host PR 25.0)
├── index.html           # パネル UI
├── styles.css           # Premiere 風のダークテーマ
├── main.js              # メインロジック（状態管理、ワークフロー制御）
├── index.js             # Premiere API 連携、UI イベント処理
├── modules/             # モジュール（Phase 3以降で実装）
│   ├── AudioAnalyzer.js      # 音声解析モジュール
│   ├── CutGenerator.js       # カット点生成モジュール
│   ├── TimelineEditor.js     # タイムライン編集モジュール
│   └── VisualizationUI.js    # 視覚化UIモジュール
├── docs/                # ドキュメント
│   ├── ARCHITECTURE.md       # システム設計
│   ├── API.md                # モジュールAPIリファレンス
│   ├── USER_GUIDE.md         # 詳細使用方法
│   └── AUTOPOD_COMPARISON.md # Autopod機能比較
├── ai_working/ddd/      # DDD計画ドキュメント
│   └── plan.md               # Phase 2-4の実装計画
└── README.md            # このガイド
```

## ドキュメント

- **[ARCHITECTURE.md](./docs/ARCHITECTURE.md)** - システム設計の詳細、モジュール構成、データフロー
- **[API.md](./docs/API.md)** - 各モジュールのAPIリファレンス（開発者向け）
- **[USER_GUIDE.md](./docs/USER_GUIDE.md)** - 詳細な使用方法、設定ガイド、トラブルシューティング
- **[AUTOPOD_COMPARISON.md](./docs/AUTOPOD_COMPARISON.md)** - Autopodとの機能比較、選択基準

## 開発ロードマップ

### ✅ Phase 1: 基盤構築（完了）
- UXPパネルとPremiere Pro API連携
- 基本UI実装
- モックワークフロー

### ✅ Phase 2-3: Multi-Camera Editor（実装済み）
- 音声レベルベースの話者検出
- カット点自動生成ロジック
- タイムライン自動編集
- 音声レベルグラフ視覚化
- Autopod準拠の4ステップワークフロー

### 🔜 Phase 4: 機能拡張（計画中）
- 4カメラ以上のサポート
- Social Clip Creator機能
  - 短尺クリップ自動生成
  - アスペクト比変換（16:9 → 9:16, 1:1）
- Jump Cut Editor機能
  - 無音部分自動削除

### 🔜 Phase 5: 高度な機能（計画中）
- バッチ処理
- プリセット保存・読み込み
- AI音声認識
- 間投詞削除（"えー"、"あの"など）

## トラブルシューティング

### インストール・起動の問題

- **パネルが表示されない**
  - プラグインフォルダーの配置と名前（`com.miho.autocamera`）を確認
  - Premiere Pro を完全に再起動
  - 必要に応じて Developer Mode を有効化

- **シーケンスが検出されない**
  - タイムラインで対象シーケンスをアクティブにする
  - シーケンスに3つのビデオトラックが含まれているか確認

### 処理の問題

- **"カメラが3つ選択されていません"エラー**
  - Camera 1, 2, 3すべてにクリップが割り当てられているか確認
  - パネル上で "Camera 1: [クリップ名]" のように表示されているか確認

- **"音声トラックが見つかりません"エラー**
  - 選択したクリップに音声トラックが含まれているか確認
  - 必要に応じて、音声付きクリップに差し替える

- **処理に時間がかかりすぎる**
  - サンプリングレートを1.5秒または2.0秒に上げる
  - 最初の10分だけで設定をテストする
  - 60分以上の映像は30分×2に分けて処理

詳しいトラブルシューティングは [`docs/USER_GUIDE.md`](./docs/USER_GUIDE.md#トラブルシューティング) を参照してください。

## Autopodとの比較

本プラグインは [Autopod](https://www.autopod.fm/) の Multi-Camera Editor 機能に準拠していますが、いくつかの違いがあります:

| 項目 | 本プラグイン | Autopod |
|-----|-----------|---------|
| **価格** | 無料（オープンソース） | $29/月 |
| **API** | UXP（モダン） | ExtendScript（レガシー） |
| **機能数** | Multi-Camera Editor | Multi-Camera + Social Clip + Jump Cut |
| **カスタマイズ** | サンプリングレート調整可能 | プリセット中心 |
| **視覚化** | 音声レベルグラフ表示 | なし |

詳しい比較は [`docs/AUTOPOD_COMPARISON.md`](./docs/AUTOPOD_COMPARISON.md) を参照してください。

## ライセンス

このプロジェクトはオープンソースとして開発されています。MITライセンスの下で自由に使用・改変できます。

## 貢献・フィードバック

- **バグ報告・機能リクエスト**: GitHubのIssuesで受け付けています
- **プルリクエスト**: 歓迎します
- **質問・議論**: GitHubのDiscussionsをご利用ください

---

**Autopod**は[Descript社](https://www.descript.com/)の優れた有料プラグインです。本プラグインは無料の代替実装として開発されていますが、プロフェッショナルな制作環境ではAutopodの使用を検討することをお勧めします。

開発中のプロジェクトです。Phase 2-3の Multi-Camera Editor 機能は実装済み（ドキュメント作成中）。Phase 4以降で追加機能を実装予定です。

