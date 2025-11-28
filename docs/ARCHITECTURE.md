# Architecture: Auto Camera Switcher - Multi-Camera Editor

**Version**: 2.0
**Last Updated**: 2025-11-28
**Status**: Production

---

## Overview

Auto Camera Switcher - Multi-Camera Editorは、Premiere Pro用のUXP拡張機能として実装された、マルチカメラ映像の自動編集ツールです。Autopod Multi-Camera Editorの核となる機能に準拠し、3台のカメラ映像を話者の音声に基づいて自動的に切り替えます。

### 設計原則

本システムは以下の設計原則に基づいて構築されています：

1. **Ruthless Simplicity** - 必要最小限の機能から開始
2. **Modular Design** - 明確なモジュール境界と再生成可能性
3. **Autopod準拠** - 実績のあるワークフローとUXに準拠
4. **垂直スライス** - 完全なエンドツーエンドフローを優先

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Auto Camera Switcher - Multi-Camera Editor (UXP Extension) │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Presentation Layer                                  │   │
│  │  ┌──────────────────────────────────────────────┐  │   │
│  │  │  UI Workflow (Autopod-like)                  │  │   │
│  │  │  ┌────────┬────────┬──────────┬──────────┐  │  │   │
│  │  │  │ Setup  │ Config │Processing│Refinement│  │  │   │
│  │  │  └────────┴────────┴──────────┴──────────┘  │  │   │
│  │  └──────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                  │
│                           ▼                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Business Logic Layer                                │   │
│  │  ┌─────────────────────────────────────────────┐   │   │
│  │  │  Multi-Camera Editor Module                 │   │   │
│  │  │                                              │   │   │
│  │  │  ┌──────────────┐  ┌──────────────┐        │   │   │
│  │  │  │AudioAnalyzer │  │CutGenerator  │        │   │   │
│  │  │  │              │  │              │        │   │   │
│  │  │  │- Volume      │  │- Cut Point   │        │   │   │
│  │  │  │  Detection   │  │  Calculation │        │   │   │
│  │  │  │- Speaker ID  │  │- Optimization│        │   │   │
│  │  │  └──────────────┘  └──────────────┘        │   │   │
│  │  │                                              │   │   │
│  │  │  ┌──────────────┐  ┌──────────────┐        │   │   │
│  │  │  │TimelineEditor│  │Visualization │        │   │   │
│  │  │  │              │  │UI            │        │   │   │
│  │  │  │- Sequence    │  │- Graph       │        │   │   │
│  │  │  │  Creation    │  │  Rendering   │        │   │   │
│  │  │  │- Clip        │  │- Timeline    │        │   │   │
│  │  │  │  Placement   │  │  Display     │        │   │   │
│  │  │  └──────────────┘  └──────────────┘        │   │   │
│  │  └─────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                  │
│                           ▼                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Integration Layer                                   │   │
│  │  ┌─────────────────────────────────────────────┐   │   │
│  │  │  Premiere Pro API Helpers                   │   │   │
│  │  │  - Sequence Access                          │   │   │
│  │  │  - Track Manipulation                       │   │   │
│  │  │  - Clip Operations                          │   │   │
│  │  │  - Error Handling                           │   │   │
│  │  └─────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                  │
│                           ▼                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Premiere Pro UXP API                                │   │
│  │  - Project & Sequence Management                    │   │
│  │  - Track & Clip API                                 │   │
│  │  - Audio Metadata Access                            │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## User Workflow (Autopod-like)

本システムは、Autopodと同様の4ステップワークフローを提供します：

### 1. Setup（セットアップ）

**目的**: カメラとオーディオトラックの割り当て

**ユーザー操作**:
1. Premiere Proでシーケンスを開く
2. Auto Camera Switcherパネルを開く
3. "Camera 1"ボタンをクリック → Video Track 1を割り当て
4. "Camera 2"ボタンをクリック → Video Track 2を割り当て
5. "Camera 3"ボタンをクリック → Video Track 3を割り当て

**システム動作**:
- アクティブシーケンスを取得
- ビデオトラックのリストを取得
- 各カメラにトラック情報を保存
- UI上でボタンをアクティブ表示

**完了条件**: 3つのカメラすべてが設定済み

---

### 2. Configuration（設定）

**目的**: 解析およびカット生成のパラメータ設定

**ユーザー操作**:
1. 最小カット長を設定（デフォルト: 2.0秒）
2. サンプリングレートを設定（デフォルト: 1.0秒）
3. カット頻度を選択（Low / Medium / High）

**システム動作**:
- 設定値をstateに保存
- UIで現在の設定を表示

**設定項目**:

| 設定項目 | デフォルト値 | 説明 |
|---------|------------|------|
| 最小カット長 | 2.0秒 | この長さ未満のカットは生成しない |
| サンプリングレート | 1.0秒 | 音量チェックの間隔 |
| カット頻度 | Medium | Low: 保守的 / Medium: バランス / High: 積極的 |

---

### 3. Processing（処理）

**目的**: 音声解析とカット点生成

**ユーザー操作**:
1. "Create Multicam Edit"ボタンをクリック

**システム動作**:

```
1. AudioAnalyzer.analyzeSequence()
   ├─ シーケンスの全オーディオトラックを取得
   ├─ サンプリングレート（1.0秒）ごとに音量レベルを測定
   ├─ 各タイムスタンプで最大音量のカメラを判定
   └─ AnalysisResultを生成

2. VisualizationUI.render()
   ├─ AnalysisResultからグラフを生成
   ├─ Canvasに音量レベルをプロット
   └─ アクティブカメラを色分け表示

3. CutGenerator.generateCuts()
   ├─ AnalysisResultを解釈
   ├─ 連続する同一カメラ区間を抽出
   ├─ 最小カット長フィルターを適用
   ├─ カット頻度設定に基づいて最適化
   └─ Cut[]を生成

4. TimelineEditor.applyEdits()
   ├─ 新規シーケンスを作成
   ├─ 各Cutに基づいてクリップを配置
   └─ EditResultを返す
```

**進捗表示**:
- 解析中: "Analyzing audio tracks..."
- 可視化中: "Generating visualization..."
- カット生成中: "Generating cut points..."
- 編集適用中: "Creating new sequence..."

**完了条件**: 新規シーケンスが作成され、カットが適用されている

---

### 4. Refinement（調整）

**目的**: 解析結果の確認と視覚的検証

**ユーザー操作**:
1. グラフで音量レベルとカメラ切り替えを確認
2. 生成されたシーケンスを再生
3. 必要に応じて手動で微調整（将来実装）

**システム動作**:
- Canvas上にグラフを表示
- タイムライン表示でカット点を可視化
- ステータスメッセージで結果を報告

**可視化要素**:
- 音量レベルのグラフ（3本の線）
- アクティブカメラの背景色
- カット点のマーカー

---

## Module Architecture

### Module Boundaries

システムは4つの自己完結モジュール（Bricks）から構成されます：

#### 1. AudioAnalyzer

**ファイル**: `src/audio-analyzer.js`

**責務**:
- Premiere Pro APIから音声トラックのメタデータを取得
- 指定されたサンプリングレートで音量レベルを測定
- 各タイムスタンプでのアクティブカメラを判定

**入力**:
- `sequence`: Premiere Pro Sequenceオブジェクト
- `cameras`: カメラトラック情報の配列 `[{trackIndex, trackName}, ...]`
- `options`: `{sampleRate: number}` （秒単位）

**出力**: `AnalysisResult`

```javascript
{
  timeline: {
    0: {camera1: 0.5, camera2: 0.2, camera3: 0.1, activeCamera: 1},
    1: {camera1: 0.3, camera2: 0.8, camera3: 0.1, activeCamera: 2},
    // ... タイムスタンプごと
  },
  duration: 300,  // 秒
  sampleRate: 1.0  // 秒
}
```

**依存**: Premiere Pro API

**テスト**: `tests/audio-analyzer.test.js`

---

#### 2. CutGenerator

**ファイル**: `src/cut-generator.js`

**責務**:
- AnalysisResultを解釈してカット点を計算
- 最小カット長フィルターを適用
- カット頻度設定に基づいて最適化

**入力**:
- `analysisResult`: AudioAnalyzerからの出力
- `options`: `{minCutDuration: number, cutFrequency: string}`

**出力**: `Cut[]`

```javascript
[
  {startTime: 0, endTime: 5.2, camera: 1},
  {startTime: 5.2, endTime: 12.8, camera: 2},
  {startTime: 12.8, endTime: 18.0, camera: 1},
  // ...
]
```

**依存**: なし（純粋な計算ロジック）

**テスト**: `tests/cut-generator.test.js`

---

#### 3. TimelineEditor

**ファイル**: `src/timeline-editor.js`

**責務**:
- 新規シーケンスの作成
- Cut[]に基づいてクリップを配置
- カット点の適用

**入力**:
- `sequence`: 元のPremiere Pro Sequence
- `cuts`: CutGeneratorからの出力
- `cameras`: カメラトラック情報

**出力**: `EditResult`

```javascript
{
  success: true,
  newSequenceName: "Auto Camera Edit - 2025-11-28 14:30",
  cutsApplied: 15,
  errors: []
}
```

**依存**: Premiere Pro API

**テスト**: `tests/timeline-editor.test.js`

---

#### 4. VisualizationUI

**ファイル**: `src/visualization.js`

**責務**:
- AnalysisResultからグラフを生成
- HTML Canvasに音量レベルをプロット
- アクティブカメラを色分け表示

**入力**: `analysisResult`

**出力**: Canvas描画（副作用）

**依存**: DOM API

**テスト**: なし（視覚的検証のみ）

---

## Data Flow

### Complete Flow Diagram

```
User Input (Setup)
    │
    ▼
[Camera Assignment] → state.cameras = {1: track1, 2: track2, 3: track3}
    │
    ▼
User Input (Configuration)
    │
    ▼
[Settings] → state.settings = {minCutDuration, sampleRate, cutFrequency}
    │
    ▼
User Click "Create Multicam Edit"
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│ AudioAnalyzer.analyzeSequence(sequence, cameras, opts)  │
│   Input: Sequence, Camera Tracks, SampleRate           │
│   Process:                                              │
│     - Get audio tracks from sequence                    │
│     - Sample volume every 1.0 second                    │
│     - Determine active camera (max volume)              │
│   Output: AnalysisResult                                │
└─────────────────────────────────────────────────────────┘
    │
    ├──────────────────────────────────┐
    │                                  │
    ▼                                  ▼
┌─────────────────────┐    ┌─────────────────────────┐
│ VisualizationUI     │    │ CutGenerator            │
│   Input: Analysis   │    │   Input: AnalysisResult │
│   Output: Graph     │    │   Process:              │
│   (Canvas)          │    │     - Extract segments  │
└─────────────────────┘    │     - Apply minCutDur   │
                            │     - Optimize cuts     │
                            │   Output: Cut[]         │
                            └─────────────────────────┘
                                       │
                                       ▼
                            ┌──────────────────────────┐
                            │ TimelineEditor           │
                            │   Input: Cut[], Cameras  │
                            │   Process:               │
                            │     - Create new seq     │
                            │     - Place clips        │
                            │   Output: EditResult     │
                            └──────────────────────────┘
                                       │
                                       ▼
                            [New Sequence in Timeline]
```

---

## State Management

### Global State

```javascript
const state = {
  // Camera assignments
  cameras: {
    1: null | {trackIndex: number, trackName: string},
    2: null | {trackIndex: number, trackName: string},
    3: null | {trackIndex: number, trackName: string}
  },

  // Analysis results
  analysisResult: null | AnalysisResult,
  cuts: null | Cut[],

  // UI state
  isAnalyzing: boolean,
  isEditing: boolean,
  currentStep: 'setup' | 'config' | 'processing' | 'refinement',

  // User settings (Configuration)
  settings: {
    minCutDuration: 2.0,      // seconds
    sampleRate: 1.0,           // seconds
    cutFrequency: 'medium',    // 'low' | 'medium' | 'high'
    transitionDuration: 0.0    // seconds (future)
  }
};
```

### State Transitions

```
Initial State: currentStep = 'setup'
    │
    ├─ User assigns Camera 1 → cameras[1] = {...}
    ├─ User assigns Camera 2 → cameras[2] = {...}
    ├─ User assigns Camera 3 → cameras[3] = {...}
    │
    ▼ (all cameras assigned)
currentStep = 'config'
    │
    ├─ User adjusts minCutDuration
    ├─ User adjusts sampleRate
    ├─ User selects cutFrequency
    │
    ▼ (user clicks "Create Multicam Edit")
currentStep = 'processing'
    │
    ├─ isAnalyzing = true
    ├─ AudioAnalyzer runs → analysisResult = {...}
    ├─ CutGenerator runs → cuts = [...]
    ├─ isAnalyzing = false
    ├─ isEditing = true
    ├─ TimelineEditor runs
    ├─ isEditing = false
    │
    ▼
currentStep = 'refinement'
    │
    └─ VisualizationUI displays graph
```

---

## Technology Stack

### Platform
- **Premiere Pro**: v25.0以降
- **UXP**: Unified Extensibility Platform（最新API）
- **Manifest Version**: 5

### Languages
- **JavaScript**: ES6+（UXP環境）
- **HTML5**: UI構造
- **CSS3**: スタイリング

### APIs Used
- **Premiere Pro UXP API**:
  - `Project.getActiveProject()`
  - `Project.getActiveSequence()`
  - `Sequence.getVideoTracks()`
  - `Track` API（音声メタデータ取得）
  - `Sequence` 作成・編集API

### Development Tools
- **Testing**: Jest（ユニットテスト）
- **Linting**: ESLint
- **Build**: なし（UXPはバンドル不要）

---

## Performance Considerations

### 解析速度

**目標**: 5分の映像を30秒以内で解析

**最適化戦略**:
1. **サンプリングレート調整**: デフォルト1.0秒（必要に応じて変更可能）
2. **非同期処理**: async/awaitで進捗表示を維持
3. **バッチ処理**: トラックごとに一括取得

### メモリ使用

**制約**: Premiere Proのパフォーマンスに影響を与えない

**戦略**:
1. **データ最小化**: 必要な情報のみを保持
2. **段階的処理**: 全データをメモリに保持しない
3. **ガベージコレクション**: 不要なデータを即座に解放

---

## Error Handling

### エラー分類

**1. User Errors（ユーザーエラー）**:
- カメラが3つ未満
- アクティブシーケンスなし
- オーディオトラックなし

**対応**: UIで明確なエラーメッセージを表示

**2. API Errors（APIエラー）**:
- Premiere Pro API呼び出し失敗
- トラックアクセス不可

**対応**: エラーログ + ユーザーへの通知

**3. Processing Errors（処理エラー）**:
- 音量データ取得失敗
- カット生成失敗

**対応**: 部分的な結果を保存 + エラー報告

### Error Recovery

```javascript
try {
  const analysisResult = await AudioAnalyzer.analyzeSequence(...);
  // ...
} catch (error) {
  console.error('[Auto Camera] Analysis failed:', error);
  updateStatus(`Error: ${error.message}`, 'error');
  // Reset state
  state.isAnalyzing = false;
  analyzeBtn.disabled = false;
}
```

---

## Security Considerations

### Permissions

**Manifest.json**:
```json
{
  "requiredPermissions": {
    "localFileSystem": "request",
    "clipboard": "readAndWrite"
  }
}
```

- **localFileSystem**: 将来の拡張（設定ファイル保存等）のため
- **clipboard**: なし（現在未使用）

### Data Privacy

- **音声データ**: Premiere Pro内で処理、外部送信なし
- **ユーザー設定**: ローカル保存のみ
- **解析結果**: セッション内のみ、永続化なし

---

## Testing Strategy

### Unit Tests

各モジュールを独立してテスト：

- `tests/audio-analyzer.test.js`
- `tests/cut-generator.test.js`
- `tests/timeline-editor.test.js`

### Integration Tests

完全なフロー：

- `tests/integration.test.js`

### User Acceptance Testing

実際のPremiere Pro環境でテスト：

1. Setup → Configuration → Processing → Refinement
2. 複数のカメラ切り替えシナリオ
3. エラーケース

---

## Future Enhancements

### Phase 4以降の拡張可能性

**Multi-Camera Editorの高度化**:
- より精度の高い話者検出（外部音声解析ツール統合）
- リアルタイムプレビュー
- カット点の手動調整UI
- テンプレート機能（設定の保存・読み込み）
- 4-10カメラ対応

**Autopodの他機能**:
- **Social Clip Creator**: ソーシャルメディアクリップ自動生成
- **Jump Cut Editor**: 無音部分の自動削除

---

## References

- [Premiere Pro UXP API Documentation](https://developer.adobe.com/premiere-pro/)
- [Autopod Multi-Camera Editor](https://www.autopod.fm/)
- [DDD Plan](../ai_working/ddd/plan.md)

---

**Document Status**: ✅ Complete
**Next**: [API.md](API.md) - Module Interface Specifications
