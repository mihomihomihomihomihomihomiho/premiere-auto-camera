# DDD Plan: Auto Camera Switcher - Multi-Camera Editor

**Document Version**: 2.0
**Last Updated**: 2025-11-28
**Status**: Planning Complete - Autopod準拠版 - Ready for Implementation

---

## Problem Statement

### 何を解決するか

マルチカメラ編集において、話者に応じたカメラ切り替えを手作業で行うと、以下の問題が発生します：

- **時間消費**: 数時間かかる単調な作業
- **一貫性の欠如**: 疲労による判断ミスやばらつき
- **クリエイティブ時間の不足**: 本質的な編集作業に集中できない

### ユーザー価値

**主要な価値提供：**
1. **時間短縮**: 編集時間を数時間から数分に削減（80-90%削減）
2. **品質向上**: 一貫性のあるプロフェッショナルなカメラワーク
3. **集中力**: クリエイティブな編集判断に時間を使える

**対象ユーザー：**
- ポッドキャスト制作者
- ウェビナー・オンラインイベント編集者
- インタビュー動画制作者
- マルチカメラ映像の編集者全般

---

## Autopodとの関係

### Autopodの構成

Autopodは3つの独立した機能モジュール：
1. **Multi-Camera Editor** - マルチカメラ自動編集
2. **Social Clip Creator** - ソーシャルメディアクリップ自動生成
3. **Jump Cut Editor** - 無音部分の自動削除

### 私たちの実装範囲

**Phase 2-3: Multi-Camera Editor機能のみ**
- Autopodの核となる機能に集中
- 3カメラ対応（AutopodのMVP版）
- Autopod風のワークフローとUX

**Phase 4以降（オプション）:**
- Social Clip Creator機能
- Jump Cut Editor機能

**技術的差異：**
- Autopod: ExtendScript + CEP
- 私たち: UXP（Premiere Pro 25.0以降の新API）

---

## Proposed Solution

### Autopod準拠のワークフロー

#### **1. Setup（セットアップ）**
- シーケンスをタイムラインに配置
- カメラ1-3をボタンで設定
- オーディオトラックが含まれていることを確認

#### **2. Configuration（設定）**
- 最小カット長（デフォルト: 2.0秒）
- サンプリングレート（デフォルト: 1.0秒）
- カット頻度の調整（オプション）

#### **3. Processing（処理）**
- "Create Multicam Edit"ボタンで解析・編集実行
- 進捗表示（リアルタイム更新）
- 解析結果の可視化

#### **4. Refinement（調整）**
- 生成されたシーケンスの確認
- グラフで解析結果を可視化
- 手動での微調整が可能（将来実装）

### 段階的実装アプローチ

**Phase 2: MVP - シンプル音量ベース検出**
- Setup + Configuration UI実装
- 音声トラックのメタデータから音量レベルを取得
- 1秒ごとにサンプリング
- 最大音量のカメラを選択
- Processing: 解析結果を可視化

**Phase 3: 自動カット生成と編集**
- Refinement: タイムラインへの自動カット適用
- 新規シーケンス作成
- カット点の最適化

**Phase 4（将来）: 拡張機能**
- 高度な話者検出
- Social Clip Creator
- Jump Cut Editor

---

## Alternatives Considered

### アプローチA: 完全UXP内実装

**概要**: すべての音声解析をUXP JavaScript内で完結

**却下理由**:
- UXP APIでの音声データアクセスが限定的
- 技術的実現困難性が高い
- パフォーマンス制約

### アプローチB: ハイブリッド（UXP + 外部解析）

**概要**: 外部プロセスで音声解析、UXPでタイムライン操作

**却下理由**:
- 初期セットアップが複雑
- "Start minimal"の原則に反する
- Phase 2で実用性を検証してから追加すべき

### アプローチC: 段階的実装（採用）

**採用理由**:
- ✅ 哲学原則に完全準拠（Ruthless Simplicity）
- ✅ Autopod風のUXで早期に動くプロトタイプ
- ✅ リスク低減（段階的な複雑化）
- ✅ MVP段階でも実用的価値を提供

---

## Architecture & Design

### システム全体構成

```
┌─────────────────────────────────────────────────────┐
│  Auto Camera Switcher - Multi-Camera Editor         │
│  ┌──────────────────────────────────────────────┐  │
│  │  UI Layer (Autopod-like Workflow)            │  │
│  │  ┌────────┬──────────┬──────────┬─────────┐ │  │
│  │  │ Setup  │ Config   │Processing│Refine   │ │  │
│  │  └────────┴──────────┴──────────┴─────────┘ │  │
│  └──────────────────────────────────────────────┘  │
│         │                                            │
│         ▼                                            │
│  ┌─────────────────────────────┐                   │
│  │ Multi-Camera Editor Module  │                   │
│  │ ┌─────────────────────────┐ │                   │
│  │ │ AudioAnalyzer           │ │                   │
│  │ │ - Volume Detection      │ │                   │
│  │ │ - Speaker Identification│ │                   │
│  │ └─────────────────────────┘ │                   │
│  │ ┌─────────────────────────┐ │                   │
│  │ │ CutGenerator            │ │                   │
│  │ │ - Cut Point Calculation │ │                   │
│  │ │ - Optimization          │ │                   │
│  │ └─────────────────────────┘ │                   │
│  │ ┌─────────────────────────┐ │                   │
│  │ │ TimelineEditor          │ │                   │
│  │ │ - Sequence Creation     │ │                   │
│  │ │ - Clip Placement        │ │                   │
│  │ └─────────────────────────┘ │                   │
│  │ ┌─────────────────────────┐ │                   │
│  │ │ VisualizationUI         │ │                   │
│  │ │ - Graph Rendering       │ │                   │
│  │ │ - Timeline Display      │ │                   │
│  │ └─────────────────────────┘ │                   │
│  └─────────────────────────────┘                   │
│         │                                            │
│         ▼                                            │
│  ┌─────────────────────────────┐                   │
│  │ Premiere Pro API            │                   │
│  │ - Sequence Access           │                   │
│  │ - Track Manipulation        │                   │
│  │ - Clip Operations           │                   │
│  └─────────────────────────────┘                   │
└─────────────────────────────────────────────────────┘
```

### Key Interfaces（Studs）

#### 1. AudioAnalyzer Interface

```javascript
/**
 * 音声解析エンジンのインターフェース
 * Autopod Multi-Camera Editorの音声検出機能に相当
 */
interface AudioAnalyzer {
  /**
   * シーケンス全体の音量データを解析
   * @param sequence - Premiere Pro シーケンスオブジェクト
   * @param cameras - カメラトラック情報の配列
   * @param options - 解析オプション（サンプリングレート等）
   * @returns 解析結果（タイムスタンプ付き音量データ）
   */
  analyzeSequence(sequence, cameras, options: AnalysisOptions): Promise<AnalysisResult>;

  /**
   * 解析進捗を報告するコールバックを設定
   */
  onProgress(callback: (progress: number, message: string) => void): void;
}

interface AnalysisOptions {
  sampleRate: number;  // サンプリングレート（秒）デフォルト: 1.0
}

interface AnalysisResult {
  // タイムスタンプ（秒）をキーとした音量データ
  timeline: {
    [timestamp: number]: {
      camera1: number,  // 音量レベル 0.0-1.0
      camera2: number,
      camera3: number,
      activeCamera: 1 | 2 | 3  // この時点でアクティブなカメラ
    }
  };
  duration: number;  // 解析した総時間（秒）
  sampleRate: number;  // サンプリングレート（秒）
}
```

#### 2. CutGenerator Interface

```javascript
/**
 * カット生成エンジンのインターフェース
 * Autopodのカット最適化アルゴリズムに相当
 */
interface CutGenerator {
  /**
   * 解析結果からカット点を生成
   * @param analysisResult - AudioAnalyzerからの解析結果
   * @param options - カット生成オプション
   * @returns カット点のリスト
   */
  generateCuts(analysisResult: AnalysisResult, options: CutOptions): Cut[];
}

interface CutOptions {
  minCutDuration: number;  // 最小カット長（秒）デフォルト: 2.0
  transitionDuration: number;  // トランジション長（秒）デフォルト: 0.0
  cutFrequency: 'low' | 'medium' | 'high';  // カット頻度 デフォルト: 'medium'
}

interface Cut {
  startTime: number;  // 開始時刻（秒）
  endTime: number;    // 終了時刻（秒）
  camera: 1 | 2 | 3;  // 使用するカメラ
}
```

#### 3. TimelineEditor Interface

```javascript
/**
 * タイムライン編集エンジンのインターフェース
 * Autopodのシーケンス生成機能に相当
 */
interface TimelineEditor {
  /**
   * カット情報に基づいてシーケンスを編集
   * @param sequence - Premiere Pro シーケンス
   * @param cuts - カット点のリスト
   * @param cameras - カメラトラック情報
   * @returns 編集結果
   */
  applyEdits(sequence, cuts: Cut[], cameras): Promise<EditResult>;

  /**
   * 編集進捗を報告するコールバックを設定
   */
  onProgress(callback: (progress: number, message: string) => void): void;
}

interface EditResult {
  success: boolean;
  newSequenceName: string;  // 作成された新規シーケンス名
  cutsApplied: number;  // 適用されたカット数
  errors?: string[];  // エラーがあれば
}
```

### Module Boundaries（Bricks）

#### Module 1: AudioAnalyzer

**責務**:
- 音声トラックのメタデータ取得
- 音量レベルの測定
- タイムスタンプ付きデータの生成
- 話者（アクティブカメラ）の判定

**入力**: Premiere Pro Sequence、カメラトラック情報、AnalysisOptions
**出力**: AnalysisResult
**依存**: Premiere Pro API

**ファイル**: `src/audio-analyzer.js`

---

#### Module 2: CutGenerator

**責務**:
- 解析結果の解釈
- カット点の最適化（最小カット長、カット頻度の適用）
- カットリストの生成

**入力**: AnalysisResult、CutOptions
**出力**: Cut[]
**依存**: なし（純粋な計算）

**ファイル**: `src/cut-generator.js`

---

#### Module 3: TimelineEditor

**責務**:
- 新規シーケンスまたはトラックの作成
- クリップの配置
- カット点の適用

**入力**: Sequence、Cut[]、カメラ情報
**出力**: EditResult
**依存**: Premiere Pro API

**ファイル**: `src/timeline-editor.js`

---

#### Module 4: VisualizationUI

**責務**:
- 解析結果のグラフ表示
- タイムライン上の音量レベル表示
- アクティブカメラの可視化

**入力**: AnalysisResult
**出力**: HTML Canvas描画
**依存**: DOM API

**ファイル**: `src/visualization.js`、追加CSS

---

### Data Models

#### State Management

```javascript
// 拡張されたグローバルstate
const state = {
  cameras: {
    1: null,
    2: null,
    3: null
  },

  // Phase 2で追加
  analysisResult: null,  // AnalysisResult | null
  cuts: null,  // Cut[] | null

  // UI状態
  isAnalyzing: false,
  isEditing: false,
  currentStep: 'setup',  // 'setup' | 'config' | 'processing' | 'refinement'

  // 設定（Configuration）
  settings: {
    minCutDuration: 2.0,  // 秒
    sampleRate: 1.0,  // 秒（1秒ごとにサンプリング）
    cutFrequency: 'medium',  // 'low' | 'medium' | 'high'
    transitionDuration: 0.0,  // 秒
  }
};
```

---

## Files to Change

### Non-Code Files (Phase 2: Documentation)

- [ ] `README.md` - Multi-Camera Editor機能の説明、Autopod風ワークフロー追加
- [ ] `docs/ARCHITECTURE.md` (新規作成) - システムアーキテクチャ図と設計説明
- [ ] `docs/API.md` (新規作成) - 各モジュールのインターフェース仕様
- [ ] `docs/USER_GUIDE.md` (新規作成) - Autopod風の詳細な使用手順
- [ ] `docs/AUTOPOD_COMPARISON.md` (新規作成) - Autopodとの機能比較

### Code Files (Phase 4: Implementation)

#### 新規作成ファイル

- [ ] `src/audio-analyzer.js` - 音声解析エンジン（AudioAnalyzer実装）
- [ ] `src/cut-generator.js` - カット生成エンジン（CutGenerator実装）
- [ ] `src/timeline-editor.js` - タイムライン編集エンジン（TimelineEditor実装）
- [ ] `src/visualization.js` - 解析結果可視化コンポーネント
- [ ] `src/utils/premiere-api-helpers.js` - Premiere Pro API ヘルパー関数
- [ ] `tests/audio-analyzer.test.js` - AudioAnalyzerのテスト
- [ ] `tests/cut-generator.test.js` - CutGeneratorのテスト
- [ ] `tests/integration.test.js` - 統合テスト

#### 既存ファイルの変更

- [ ] `main.js` - Autopod風ワークフロー実装
  - モック処理を削除
  - AudioAnalyzer、CutGenerator、TimelineEditorの統合
  - 4ステップワークフローの実装（Setup → Config → Processing → Refinement）
  - 進捗報告の実装

- [ ] `index.html` - Autopod風UIに改修
  - Setup: カメラ設定セクション（既存）
  - Configuration: 設定パネル追加（最小カット長、カット頻度など）
  - Processing: "Create Multicam Edit"ボタン、進捗表示
  - Refinement: Canvas要素追加（グラフ表示用）

- [ ] `styles.css` - Autopod風スタイル
  - 4ステップワークフローに対応したレイアウト
  - Configuration設定パネルのスタイル
  - VisualizationのCanvas containerスタイル
  - グラフ表示のスタイル

- [ ] `manifest.json` - パーミッション確認
  - 現状のパーミッションで十分かを確認

---

## Philosophy Alignment

### Ruthless Simplicity

**適用：**
- ✅ **Start minimal**: Phase 2はMulti-Camera Editorのみ。他機能は将来
- ✅ **Avoid future-proofing**: Social Clip Creator、Jump Cut Editorは現時点で実装しない
- ✅ **Minimize abstractions**: 4つの明確なモジュールのみ
- ✅ **Question everything**: Autopodの核となる機能のみに集中

**実践例：**
- Phase 2では高度な話者認識は実装しない
- シンプルな音量比較のみ
- UIも必要最小限（Autopod風の4ステップ）

### Modular Design (Bricks and Studs)

**Bricks（自己完結モジュール）：**
1. `AudioAnalyzer` - 音声データ解析
2. `CutGenerator` - カット点生成
3. `TimelineEditor` - タイムライン編集
4. `VisualizationUI` - 結果可視化

**Studs（接続ポイント）：**
- `AnalysisResult` - Analyzer → Generator, Visualization
- `Cut[]` - Generator → Editor
- Premiere Pro API - すべてのモジュールが共通で使用

**再生成可能性：**
- 各モジュールは独立してテスト・再実装可能
- インターフェースが変わらない限り、他モジュールに影響なし

### 実装における原則

**垂直スライス優先：**
- Phase 2で1つの完全なフロー（Setup → Config → Processing → Refinement）を実装
- 横展開（Social Clip Creator等）はPhase 4以降

**反復的実装：**
- まず動くものを作る（80/20の原則）
- ユーザーフィードバックで改善

**エラーハンドリング：**
- 一般的なエラーのみ堅牢に処理
- エッジケースは後回し

---

## Test Strategy

### Unit Tests

**AudioAnalyzer（`tests/audio-analyzer.test.js`）：**
- [ ] 音量データの正しい取得
- [ ] サンプリングレートの適用
- [ ] アクティブカメラの正しい判定
- [ ] エラーケース：音声トラックなし

**CutGenerator（`tests/cut-generator.test.js`）：**
- [ ] 最小カット長の適用
- [ ] カット頻度設定の反映
- [ ] カット点の最適化
- [ ] 連続する同一カメラの統合
- [ ] エッジケース：非常に短いカット

**TimelineEditor（`tests/timeline-editor.test.js`）：**
- [ ] 新規シーケンス作成
- [ ] クリップの正しい配置
- [ ] カット数のカウント
- [ ] エラーハンドリング

### Integration Tests

**統合テスト（`tests/integration.test.js`）：**
- [ ] 完全なフロー：Setup → Config → Processing → Refinement
- [ ] 複数カメラの切り替え
- [ ] 進捗報告の正常動作
- [ ] Premiere Pro APIとの連携

### User Testing（実際のPremiere Pro環境）

**Autopod風テストシナリオ：**
1. [ ] **Setup**: 3カメラのテスト映像を準備、カメラ1-3を設定
2. [ ] **Configuration**: 最小カット長を3秒に設定、カット頻度を"high"に設定
3. [ ] **Processing**: "Create Multicam Edit"ボタンをクリック、進捗確認
4. [ ] **Refinement**: 可視化結果を確認（グラフが正しく表示されるか）
5. [ ] 生成されたシーケンスを再生して確認
6. [ ] 期待通りのカメラ切り替えが行われているか

**成功基準：**
- Autopod風の4ステップワークフローが機能すること
- 解析が完了すること
- グラフが表示されること
- 新規シーケンスが作成されること
- カメラ切り替えが発生していること
- 明らかな誤作動がないこと

---

## Implementation Approach

### Phase 2: Documentation（ドキュメント更新）

**目的**: コードを書く前に、すべての仕様をドキュメント化

**ファイル作成・更新順序：**
1. `docs/ARCHITECTURE.md` - システム全体設計（Autopod準拠）
2. `docs/API.md` - 各モジュールのインターフェース詳細
3. `docs/USER_GUIDE.md` - Autopod風の使用手順
4. `docs/AUTOPOD_COMPARISON.md` - Autopodとの機能比較
5. `README.md` - 更新（Multi-Camera Editor機能の追加）

**内容：**
- すべてを「既に実装済み」の体裁で記述（Retcon Writing）
- Autopodとの類似点・差異を明記
- 具体的なコード例を含める
- 想定されるエラーとその対処法

### Phase 3: Code Implementation Planning

**目的**: 実装の詳細計画と順序決定

**タスク：**
1. コードベース調査（既存コードの構造確認）
2. 実装順序の決定（依存関係を考慮）
3. 各モジュールの詳細設計
4. テスト戦略の具体化

### Phase 4: Code Implementation

**実装順序（依存関係を考慮）：**

**ステップ1: ヘルパー関数とユーティリティ**
- [ ] `src/utils/premiere-api-helpers.js`
  - Premiere Pro API のラッパー関数
  - エラーハンドリングの共通化

**ステップ2: AudioAnalyzer（コア機能）**
- [ ] `src/audio-analyzer.js`
  - 音声メタデータ取得
  - 音量レベル測定
  - アクティブカメラ判定
- [ ] `tests/audio-analyzer.test.js`

**ステップ3: CutGenerator（ビジネスロジック）**
- [ ] `src/cut-generator.js`
  - カット点生成ロジック
  - カット頻度設定の適用
  - 最適化アルゴリズム
- [ ] `tests/cut-generator.test.js`

**ステップ4: VisualizationUI（可視化）**
- [ ] `src/visualization.js`
  - Canvas描画
  - グラフレンダリング
- [ ] `index.html` - Canvas要素追加（Refinementステップ）
- [ ] `styles.css` - 可視化スタイル

**ステップ5: TimelineEditor（編集実行）**
- [ ] `src/timeline-editor.js`
  - シーケンス作成
  - クリップ配置
- [ ] `tests/timeline-editor.test.js`

**ステップ6: 統合（main.jsの更新）**
- [ ] `main.js`
  - Autopod風4ステップワークフロー実装
  - モジュール統合
  - 進捗報告
- [ ] `tests/integration.test.js`

**ステップ7: UI改善（Autopod風）**
- [ ] `index.html` - 4ステップUI完成（Setup, Config, Processing, Refinement）
- [ ] `styles.css` - Autopod風スタイル調整

### Phase 5: Testing & Verification

**実施内容：**
1. ユニットテストの実行
2. 統合テストの実行
3. 実際のPremiere Pro環境でのテスト
4. Autopod風ワークフローの検証

---

## Success Criteria

### 機能要件（Autopod Multi-Camera Editor準拠）

✅ **Phase 2-3完了の条件：**
- [ ] **Setup**: 3カメラを簡単に設定できる
- [ ] **Configuration**: 最小カット長、カット頻度を設定できる
- [ ] **Processing**: "Create Multicam Edit"で自動解析・編集実行
- [ ] **Refinement**: 解析結果をグラフで確認できる
- [ ] 新規シーケンスにカットが適用されている
- [ ] Autopod風のUX（4ステップワークフロー）

### 品質要件

✅ **コード品質：**
- [ ] すべてのモジュールがインターフェースを実装
- [ ] ユニットテストが80%以上のカバレッジ
- [ ] コードが哲学原則に準拠（Ruthless Simplicity）
- [ ] ドキュメントとコードが一致

✅ **ユーザー体験：**
- [ ] 解析時間が妥当（5分の映像を30秒以内で処理）
- [ ] Autopod風の直感的なUI
- [ ] エラーメッセージが明確

### パフォーマンス要件

- **解析速度**: 5分の映像を30秒以内で解析
- **UI応答性**: 解析中もUIがフリーズしない（進捗表示が更新される）
- **メモリ使用**: Premiere Proのパフォーマンスに影響を与えない

---

## Risks and Mitigation

### 技術的リスク

**リスク1: Premiere Pro APIでの音声データアクセス制限**
- **影響**: 音量レベルが取得できない可能性
- **緩和策**:
  - 早期に技術検証（PoC）を実施
  - 代替案：波形データから推定
  - 最悪の場合：Phase 4で外部ツール統合

**リスク2: パフォーマンス問題**
- **影響**: 長時間の映像で処理が遅い
- **緩和策**:
  - サンプリングレートの調整可能化（Configuration）
  - 進捗表示で体感速度を改善
  - 非同期処理の徹底

**リスク3: カット品質が期待以下**
- **影響**: ユーザーが手動で大幅に修正が必要
- **緩和策**:
  - 最小カット長、カット頻度の設定でノイズを削減
  - Refinementステップでユーザーが結果を確認・調整できる

---

## Next Steps

### Phase 1完了確認

✅ **完了項目：**
- Problem Framing
- Reconnaissance
- Design Proposals
- Detailed Plan作成（Autopod準拠版）
- Philosophy Alignment確認
- User Review（Option A選択）

### Phase 2へ進む準備

➡️ **次のコマンド：** `/ddd:2-docs`

**Phase 2で実施すること：**
1. `docs/ARCHITECTURE.md`作成（Autopod準拠）
2. `docs/API.md`作成
3. `docs/USER_GUIDE.md`作成（Autopod風ワークフロー）
4. `docs/AUTOPOD_COMPARISON.md`作成
5. `README.md`更新（Multi-Camera Editor機能）

**注意事項：**
- コードは一切書かない
- すべて「既に実装済み」として記述
- Autopodとの類似点・差異を明記
- 具体的なコード例を含める

---

## Notes

### 将来の拡張可能性（Phase 4以降）

このMulti-Camera Editor MVPの後、以下の機能を検討可能：

**Autopodの他機能：**
- **Social Clip Creator**: 複数アスペクト比のソーシャルメディアクリップ自動生成
- **Jump Cut Editor**: 無音部分の自動削除

**Multi-Camera Editorの高度化：**
- 外部音声解析ツール（FFmpeg + librosa）との統合
- より精度の高い話者検出
- リアルタイムプレビュー
- カット点の手動調整UI
- テンプレート機能（設定の保存・読み込み）

**カメラ数の拡張：**
- 4-10カメラ対応（Autopod並み）

ただし、これらは現時点では実装しない（Avoid future-proofing）。

---

**Plan Status**: ✅ Complete - Autopod準拠版 - Ready for `/ddd:2-docs`
