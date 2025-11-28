# API Reference: Multi-Camera Editor Modules

**Version**: 2.0
**Last Updated**: 2025-11-28

---

## Overview

このドキュメントは、Auto Camera Switcher - Multi-Camera Editorを構成する4つのモジュールのAPI仕様を定義します。各モジュールは明確なインターフェース（Studs）を持ち、独立して実装・テスト・再生成が可能です。

---

## Module 1: AudioAnalyzer

**ファイル**: `src/audio-analyzer.js`

**概要**: Premiere Pro APIから音声データを取得し、音量レベルに基づいてアクティブカメラを判定します。

### Interface

```javascript
class AudioAnalyzer {
  /**
   * コンストラクタ
   */
  constructor()

  /**
   * シーケンス全体の音声を解析
   * @param {Object} sequence - Premiere Pro Sequenceオブジェクト
   * @param {Array} cameras - カメラトラック情報
   * @param {Object} options - 解析オプション
   * @returns {Promise<AnalysisResult>} 解析結果
   */
  async analyzeSequence(sequence, cameras, options)

  /**
   * 進捗コールバックを設定
   * @param {Function} callback - (progress: number, message: string) => void
   */
  onProgress(callback)
}
```

### Types

#### AnalysisOptions

```javascript
{
  sampleRate: number  // サンプリングレート（秒）デフォルト: 1.0
}
```

#### AnalysisResult

```javascript
{
  timeline: {
    [timestamp: number]: {
      camera1: number,      // 音量レベル 0.0-1.0
      camera2: number,
      camera3: number,
      activeCamera: 1 | 2 | 3  // アクティブなカメラ
    }
  },
  duration: number,      // 解析した総時間（秒）
  sampleRate: number     // 使用したサンプリングレート（秒）
}
```

### Methods

#### `constructor()`

AudioAnalyzerインスタンスを生成します。

**使用例**:
```javascript
const analyzer = new AudioAnalyzer();
```

---

#### `async analyzeSequence(sequence, cameras, options)`

シーケンス全体の音声を解析し、タイムスタンプごとの音量データとアクティブカメラを返します。

**Parameters**:

| Name | Type | Description |
|------|------|-------------|
| `sequence` | `Object` | Premiere Pro Sequenceオブジェクト |
| `cameras` | `Array<{trackIndex: number, trackName: string}>` | カメラトラック情報の配列（長さ3） |
| `options` | `AnalysisOptions` | 解析オプション |

**Returns**: `Promise<AnalysisResult>`

**Throws**:
- `Error`: シーケンスがnull、またはカメラが3つ未満の場合
- `Error`: オーディオトラックが見つからない場合

**使用例**:
```javascript
const analyzer = new AudioAnalyzer();
const cameras = [
  {trackIndex: 0, trackName: 'Camera 1'},
  {trackIndex: 1, trackName: 'Camera 2'},
  {trackIndex: 2, trackName: 'Camera 3'}
];
const options = {sampleRate: 1.0};

try {
  const result = await analyzer.analyzeSequence(sequence, cameras, options);
  console.log(`Analyzed ${result.duration} seconds`);
  console.log(`Timeline entries: ${Object.keys(result.timeline).length}`);
} catch (error) {
  console.error('Analysis failed:', error);
}
```

**実装の詳細**:
1. シーケンスの全オーディオトラックを取得
2. サンプリングレート（デフォルト1.0秒）ごとに音量レベルを測定
3. 各タイムスタンプで3つのカメラの音量を比較
4. 最大音量のカメラを`activeCamera`として記録
5. AnalysisResultオブジェクトを生成して返す

---

#### `onProgress(callback)`

解析進捗を報告するコールバック関数を設定します。

**Parameters**:

| Name | Type | Description |
|------|------|-------------|
| `callback` | `Function` | `(progress: number, message: string) => void` |

**Progress値**: 0.0-1.0（0%～100%）

**使用例**:
```javascript
const analyzer = new AudioAnalyzer();
analyzer.onProgress((progress, message) => {
  console.log(`${(progress * 100).toFixed(0)}%: ${message}`);
  updateProgressBar(progress);
});

const result = await analyzer.analyzeSequence(sequence, cameras, options);
```

**進捗メッセージ例**:
- "Initializing audio analysis..."
- "Analyzing audio track 1 of 3..."
- "Processing timestamp 45.0s / 180.0s..."
- "Analysis complete"

---

## Module 2: CutGenerator

**ファイル**: `src/cut-generator.js`

**概要**: AnalysisResultを解釈し、最適化されたカット点のリストを生成します。

### Interface

```javascript
class CutGenerator {
  /**
   * コンストラクタ
   */
  constructor()

  /**
   * 解析結果からカット点を生成
   * @param {AnalysisResult} analysisResult - AudioAnalyzerの出力
   * @param {CutOptions} options - カット生成オプション
   * @returns {Cut[]} カット点のリスト
   */
  generateCuts(analysisResult, options)
}
```

### Types

#### CutOptions

```javascript
{
  minCutDuration: number,         // 最小カット長（秒）デフォルト: 2.0
  transitionDuration: number,     // トランジション長（秒）デフォルト: 0.0
  cutFrequency: 'low' | 'medium' | 'high'  // カット頻度 デフォルト: 'medium'
}
```

#### Cut

```javascript
{
  startTime: number,   // 開始時刻（秒）
  endTime: number,     // 終了時刻（秒）
  camera: 1 | 2 | 3    // 使用するカメラ
}
```

### Methods

#### `constructor()`

CutGeneratorインスタンスを生成します。

**使用例**:
```javascript
const generator = new CutGenerator();
```

---

#### `generateCuts(analysisResult, options)`

AnalysisResultからカット点を生成し、最適化されたCut配列を返します。

**Parameters**:

| Name | Type | Description |
|------|------|-------------|
| `analysisResult` | `AnalysisResult` | AudioAnalyzerからの解析結果 |
| `options` | `CutOptions` | カット生成オプション |

**Returns**: `Cut[]`

**Throws**:
- `Error`: analysisResultがnullまたは無効な場合

**使用例**:
```javascript
const generator = new CutGenerator();
const options = {
  minCutDuration: 2.0,
  transitionDuration: 0.0,
  cutFrequency: 'medium'
};

const cuts = generator.generateCuts(analysisResult, options);
console.log(`Generated ${cuts.length} cuts`);

cuts.forEach((cut, index) => {
  console.log(`Cut ${index + 1}: ${cut.startTime}s - ${cut.endTime}s (Camera ${cut.camera})`);
});
```

**出力例**:
```javascript
[
  {startTime: 0.0, endTime: 5.2, camera: 1},
  {startTime: 5.2, endTime: 12.8, camera: 2},
  {startTime: 12.8, endTime: 18.0, camera: 1},
  {startTime: 18.0, endTime: 25.5, camera: 3},
  // ...
]
```

**実装の詳細**:

1. **セグメント抽出**: タイムラインから連続する同一カメラ区間を抽出
2. **最小カット長フィルター**: `minCutDuration`未満のセグメントを統合
3. **カット頻度最適化**:
   - `low`: 保守的（長めのカット、頻繁な切り替えを避ける）
   - `medium`: バランス（適度なカット長）
   - `high`: 積極的（短めのカット、頻繁に切り替え）

**カット頻度の影響**:

| 設定 | 最小カット長調整 | 説明 |
|-----|--------------|------|
| `low` | × 1.5 | 最小カット長を1.5倍に（例: 2.0s → 3.0s） |
| `medium` | × 1.0 | 設定値そのまま |
| `high` | × 0.7 | 最小カット長を0.7倍に（例: 2.0s → 1.4s） |

---

## Module 3: TimelineEditor

**ファイル**: `src/timeline-editor.js`

**概要**: Cut配列に基づいて新規シーケンスを作成し、クリップを配置します。

### Interface

```javascript
class TimelineEditor {
  /**
   * コンストラクタ
   */
  constructor()

  /**
   * カット情報に基づいてシーケンスを編集
   * @param {Object} sequence - 元のPremiere Pro Sequence
   * @param {Cut[]} cuts - CutGeneratorからのカット点リスト
   * @param {Array} cameras - カメラトラック情報
   * @returns {Promise<EditResult>} 編集結果
   */
  async applyEdits(sequence, cuts, cameras)

  /**
   * 編集進捗を報告するコールバックを設定
   * @param {Function} callback - (progress: number, message: string) => void
   */
  onProgress(callback)
}
```

### Types

#### EditResult

```javascript
{
  success: boolean,          // 編集が成功したか
  newSequenceName: string,   // 作成された新規シーケンス名
  cutsApplied: number,       // 適用されたカット数
  errors: string[]           // エラーがあれば（空配列ならエラーなし）
}
```

### Methods

#### `constructor()`

TimelineEditorインスタンスを生成します。

**使用例**:
```javascript
const editor = new TimelineEditor();
```

---

#### `async applyEdits(sequence, cuts, cameras)`

Cut配列に基づいて新規シーケンスを作成し、クリップを配置します。

**Parameters**:

| Name | Type | Description |
|------|------|-------------|
| `sequence` | `Object` | 元のPremiere Pro Sequenceオブジェクト |
| `cuts` | `Cut[]` | CutGeneratorからのカット点リスト |
| `cameras` | `Array<{trackIndex: number, trackName: string}>` | カメラトラック情報 |

**Returns**: `Promise<EditResult>`

**Throws**:
- `Error`: シーケンス作成に失敗した場合
- `Error`: クリップ配置に失敗した場合

**使用例**:
```javascript
const editor = new TimelineEditor();
const cameras = [
  {trackIndex: 0, trackName: 'Camera 1'},
  {trackIndex: 1, trackName: 'Camera 2'},
  {trackIndex: 2, trackName: 'Camera 3'}
];

try {
  const result = await editor.applyEdits(sequence, cuts, cameras);

  if (result.success) {
    console.log(`Success! Created: ${result.newSequenceName}`);
    console.log(`Applied ${result.cutsApplied} cuts`);
  } else {
    console.error('Edit failed:', result.errors);
  }
} catch (error) {
  console.error('Editor error:', error);
}
```

**出力例**:
```javascript
{
  success: true,
  newSequenceName: "Auto Camera Edit - 2025-11-28 14:30:15",
  cutsApplied: 15,
  errors: []
}
```

**実装の詳細**:

1. **新規シーケンス作成**:
   - 名前: `"Auto Camera Edit - [日時]"`
   - 元のシーケンスと同じ設定（フレームレート、解像度等）

2. **クリップ配置**:
   - 各Cutに対してループ
   - 対応するカメラトラックからクリップを取得
   - startTime～endTimeの範囲を新規シーケンスに配置

3. **エラーハンドリング**:
   - 部分的な失敗でも成功したカットは保持
   - エラー詳細を`errors`配列に追加

---

#### `onProgress(callback)`

編集進捗を報告するコールバック関数を設定します。

**Parameters**:

| Name | Type | Description |
|------|------|-------------|
| `callback` | `Function` | `(progress: number, message: string) => void` |

**Progress値**: 0.0-1.0（0%～100%）

**使用例**:
```javascript
const editor = new TimelineEditor();
editor.onProgress((progress, message) => {
  console.log(`${(progress * 100).toFixed(0)}%: ${message}`);
});

const result = await editor.applyEdits(sequence, cuts, cameras);
```

**進捗メッセージ例**:
- "Creating new sequence..."
- "Placing cut 1 of 15..."
- "Placing cut 5 of 15..."
- "Edit complete"

---

## Module 4: VisualizationUI

**ファイル**: `src/visualization.js`

**概要**: AnalysisResultからグラフを生成し、HTML Canvasに描画します。

### Interface

```javascript
class VisualizationUI {
  /**
   * コンストラクタ
   * @param {HTMLCanvasElement} canvas - 描画先のCanvas要素
   */
  constructor(canvas)

  /**
   * AnalysisResultをグラフとして描画
   * @param {AnalysisResult} analysisResult - AudioAnalyzerからの結果
   */
  render(analysisResult)

  /**
   * Canvasをクリア
   */
  clear()
}
```

### Methods

#### `constructor(canvas)`

VisualizationUIインスタンスを生成します。

**Parameters**:

| Name | Type | Description |
|------|------|-------------|
| `canvas` | `HTMLCanvasElement` | 描画先のCanvas要素 |

**使用例**:
```javascript
const canvas = document.getElementById('visualization-canvas');
const viz = new VisualizationUI(canvas);
```

---

#### `render(analysisResult)`

AnalysisResultをグラフとして描画します。

**Parameters**:

| Name | Type | Description |
|------|------|-------------|
| `analysisResult` | `AnalysisResult` | AudioAnalyzerからの解析結果 |

**Returns**: `void`

**使用例**:
```javascript
const viz = new VisualizationUI(canvas);
viz.render(analysisResult);
```

**描画内容**:
- **X軸**: 時間（秒）
- **Y軸**: 音量レベル（0.0-1.0）
- **線グラフ**: 3本（Camera 1, 2, 3）
- **背景色**: アクティブカメラを示す色分け

**色設定**:
- Camera 1: 青（#0e639c）
- Camera 2: 緑（#4caf50）
- Camera 3: 赤（#f44336）
- アクティブカメラ背景: 半透明の対応色

---

#### `clear()`

Canvasをクリアします。

**Returns**: `void`

**使用例**:
```javascript
viz.clear();
```

---

## Helper Module: Premiere API Helpers

**ファイル**: `src/utils/premiere-api-helpers.js`

**概要**: Premiere Pro APIのラッパー関数とエラーハンドリングを提供します。

### Functions

#### `async getActiveSequence()`

アクティブなシーケンスを取得します。

**Returns**: `Promise<Object | null>` - Sequenceオブジェクトまたはnull

**使用例**:
```javascript
import {getActiveSequence} from './utils/premiere-api-helpers.js';

const sequence = await getActiveSequence();
if (!sequence) {
  console.error('No active sequence');
}
```

---

#### `async getVideoTracks(sequence)`

シーケンスからビデオトラックのリストを取得します。

**Parameters**:

| Name | Type | Description |
|------|------|-------------|
| `sequence` | `Object` | Premiere Pro Sequenceオブジェクト |

**Returns**: `Promise<Array>` - ビデオトラックの配列

**Throws**: `Error` - トラック取得に失敗した場合

**使用例**:
```javascript
import {getVideoTracks} from './utils/premiere-api-helpers.js';

const tracks = await getVideoTracks(sequence);
console.log(`Found ${tracks.length} video tracks`);
```

---

#### `async getAudioTracks(sequence)`

シーケンスからオーディオトラックのリストを取得します。

**Parameters**:

| Name | Type | Description |
|------|------|-------------|
| `sequence` | `Object` | Premiere Pro Sequenceオブジェクト |

**Returns**: `Promise<Array>` - オーディオトラックの配列

**Throws**: `Error` - トラック取得に失敗した場合

---

## Usage Examples

### Complete Workflow

```javascript
import {AudioAnalyzer} from './src/audio-analyzer.js';
import {CutGenerator} from './src/cut-generator.js';
import {TimelineEditor} from './src/timeline-editor.js';
import {VisualizationUI} from './src/visualization.js';
import {getActiveSequence} from './src/utils/premiere-api-helpers.js';

// 1. Setup
const sequence = await getActiveSequence();
const cameras = [
  {trackIndex: 0, trackName: 'Camera 1'},
  {trackIndex: 1, trackName: 'Camera 2'},
  {trackIndex: 2, trackName: 'Camera 3'}
];

// 2. Configuration
const analysisOptions = {sampleRate: 1.0};
const cutOptions = {
  minCutDuration: 2.0,
  transitionDuration: 0.0,
  cutFrequency: 'medium'
};

// 3. Processing
const analyzer = new AudioAnalyzer();
analyzer.onProgress((progress, message) => {
  console.log(`Analysis: ${(progress * 100).toFixed(0)}% - ${message}`);
});

const analysisResult = await analyzer.analyzeSequence(
  sequence,
  cameras,
  analysisOptions
);

const generator = new CutGenerator();
const cuts = generator.generateCuts(analysisResult, cutOptions);

const editor = new TimelineEditor();
editor.onProgress((progress, message) => {
  console.log(`Editing: ${(progress * 100).toFixed(0)}% - ${message}`);
});

const result = await editor.applyEdits(sequence, cuts, cameras);

// 4. Refinement
const canvas = document.getElementById('visualization-canvas');
const viz = new VisualizationUI(canvas);
viz.render(analysisResult);

console.log(`Complete! Created: ${result.newSequenceName}`);
console.log(`Applied ${result.cutsApplied} cuts`);
```

---

## Error Codes

### Common Errors

| Code | Message | Cause | Solution |
|------|---------|-------|----------|
| `ERR_NO_SEQUENCE` | "No active sequence found" | シーケンスが開かれていない | シーケンスを開いてから実行 |
| `ERR_INSUFFICIENT_CAMERAS` | "Need at least 3 cameras" | カメラが3つ未満 | 3つのカメラを設定 |
| `ERR_NO_AUDIO` | "No audio tracks found" | オーディオトラックがない | オーディオ付き映像を使用 |
| `ERR_ANALYSIS_FAILED` | "Audio analysis failed" | 音声解析中のエラー | ログを確認、APIアクセス権限確認 |
| `ERR_EDIT_FAILED` | "Timeline editing failed" | シーケンス編集中のエラー | ログを確認、Premiere Pro再起動 |

---

## Testing

各モジュールは独立してテスト可能です。

### Unit Test Example

```javascript
// tests/cut-generator.test.js
import {CutGenerator} from '../src/cut-generator.js';

describe('CutGenerator', () => {
  test('generates cuts from analysis result', () => {
    const generator = new CutGenerator();
    const analysisResult = {
      timeline: {
        0: {camera1: 0.8, camera2: 0.2, camera3: 0.1, activeCamera: 1},
        1: {camera1: 0.7, camera2: 0.2, camera3: 0.1, activeCamera: 1},
        2: {camera1: 0.1, camera2: 0.9, camera3: 0.1, activeCamera: 2},
        // ...
      },
      duration: 10,
      sampleRate: 1.0
    };

    const cuts = generator.generateCuts(analysisResult, {
      minCutDuration: 2.0,
      transitionDuration: 0.0,
      cutFrequency: 'medium'
    });

    expect(cuts.length).toBeGreaterThan(0);
    expect(cuts[0]).toHaveProperty('startTime');
    expect(cuts[0]).toHaveProperty('endTime');
    expect(cuts[0]).toHaveProperty('camera');
  });
});
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-11-27 | Initial API specification |
| 2.0 | 2025-11-28 | Updated for Autopod compliance |

---

**Document Status**: ✅ Complete
**Next**: [USER_GUIDE.md](USER_GUIDE.md) - User Documentation
