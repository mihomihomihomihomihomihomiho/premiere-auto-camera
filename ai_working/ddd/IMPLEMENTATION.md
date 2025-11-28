# Implementation Plan - Multi-Camera Editor

**Document Version**: 1.0
**Created**: 2025-11-28
**Status**: Phase 3 - Ready for Implementation (Phase 4)
**Related**: [plan.md](./plan.md), [docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md), [docs/API.md](../../docs/API.md)

---

## Table of Contents

1. [Current Codebase Analysis](#current-codebase-analysis)
2. [Implementation Strategy](#implementation-strategy)
3. [Module Implementation Details](#module-implementation-details)
4. [Implementation Order](#implementation-order)
5. [Testing Strategy](#testing-strategy)
6. [Milestones and Checkpoints](#milestones-and-checkpoints)
7. [Risk Mitigation](#risk-mitigation)

---

## Current Codebase Analysis

### Existing Files Structure

```
premiere-auto-camera/
├── manifest.json        # UXP manifest (v5, Premiere Pro 25.0+)
├── index.html           # Basic UI (34 lines, 2 sections)
├── styles.css           # Premiere Pro dark theme styling
├── main.js              # Main logic (467 lines, Phase 1 complete)
├── index.js             # [Legacy/Unused - 257 lines]
├── docs/                # Phase 2 documentation (完了)
│   ├── ARCHITECTURE.md
│   ├── API.md
│   ├── USER_GUIDE.md
│   └── AUTOPOD_COMPARISON.md
├── ai_working/ddd/
│   ├── plan.md          # DDD Plan v2.0 (Autopod準拠)
│   └── IMPLEMENTATION.md  # This document
└── README.md            # Updated with Multi-Camera Editor features
```

### main.js Analysis (Phase 1 Implementation)

**Current Functionality**:

```javascript
// State management (lines 7-9)
const state = {
  cameras: { 1: null, 2: null, 3: null }
};

// Key functions:
- initUI()                    // UI initialization
- getActiveSequence()         // Premiere Pro API access (async/legacy compatibility)
- getVideoTracksList()        // Video tracks access (extensive compatibility layer)
- setupCamera(num)            // Assign camera to track
- analyze()                   // **MOCK** - Phase 1 placeholder
- updateStatus/updateProgress // UI feedback
- delay()                     // Utility
```

**What Works Well**:
- ✅ Robust Premiere Pro API compatibility layer (async + legacy API)
- ✅ Clean state management foundation
- ✅ Good UI feedback (status, progress)
- ✅ Error handling basics

**What Needs to Change**:
- ❌ `analyze()` is entirely mock - needs full replacement
- ❌ No configuration UI (Step 2: Configuration)
- ❌ No visualization UI (Step 4: Refinement)
- ❌ State doesn't include `analysisResult`, `cuts`, `settings`

### index.html Analysis

**Current Structure**:

```html
<div class="panel">
  <section class="camera-setup">  <!-- Step 1: Setup -->
    <button id="cam1-btn">Camera 1</button>
    <button id="cam2-btn">Camera 2</button>
    <button id="cam3-btn">Camera 3</button>
  </section>

  <section class="analysis">  <!-- Step 3: Processing (partial) -->
    <button id="analyze-btn">Analyze and Generate Switches</button>
    <div id="progress"></div>
  </section>

  <div id="status"></div>
</div>
```

**Missing Elements for Autopod Workflow**:
- ❌ Step 2: Configuration section (settings inputs)
- ❌ Step 4: Refinement section (Canvas for visualization)
- ❌ Settings UI (minCutDuration, sampleRate, cutFrequency, transitionDuration)

### Dependencies and Permissions

**manifest.json** (current):
```json
{
  "manifestVersion": 5,
  "host": { "app": "PR", "minVersion": "25.0" },
  "permissions": {
    "localFileSystem": "request",
    "clipboard": "readAndWrite"
  }
}
```

**Conclusion**: Current permissions sufficient for Phase 3-4 (no external file access needed for audio metadata).

---

## Implementation Strategy

### Guiding Principles

1. **Ruthless Simplicity**
   - Start with simplest working implementation
   - Avoid premature optimization
   - No future-proofing

2. **Vertical Slice First**
   - Complete one full workflow (Setup → Config → Processing → Refinement)
   - Don't horizontally expand until core works

3. **Modular Design (Bricks and Studs)**
   - Each module is self-contained
   - Interfaces (studs) enable regeneration
   - Modules can be tested in isolation

4. **Test Early, Test Often**
   - Write tests alongside implementation
   - Integration test the full flow
   - Validate with real Premiere Pro

### Implementation Phases

**Phase 4: Code Implementation** (This plan's target)

```
Week 1: Core Modules
├── Day 1-2: AudioAnalyzer + tests
├── Day 3-4: CutGenerator + tests
└── Day 5: VisualizationUI

Week 2: Integration
├── Day 6-7: TimelineEditor + tests
├── Day 8: main.js integration
├── Day 9: UI updates (Configuration + Refinement)
└── Day 10: Integration testing

Week 3: Polish & Testing
├── Day 11-12: User testing with real Premiere Pro
├── Day 13: Bug fixes
├── Day 14: Performance optimization
└── Day 15: Final validation
```

**Phase 5: Testing & Verification**
- Comprehensive testing
- User acceptance testing
- Documentation verification

---

## Module Implementation Details

### Module 1: AudioAnalyzer

**File**: `modules/AudioAnalyzer.js`

**Purpose**: Extract audio metadata and identify active speaker at each timestamp

**Core Algorithm** (Volume-based detection):

```javascript
class AudioAnalyzer {
  constructor() {
    this.progressCallback = null;
  }

  /**
   * Main analysis function
   * @param {Object} sequence - Premiere Pro sequence
   * @param {Object} cameras - {1: {trackIndex, trackName}, 2: {...}, 3: {...}}
   * @param {Object} options - {sampleRate: 1.0}
   * @returns {Promise<AnalysisResult>}
   */
  async analyzeSequence(sequence, cameras, options = {sampleRate: 1.0}) {
    const sampleRate = options.sampleRate || 1.0;

    // Get sequence duration
    const duration = await this.getSequenceDuration(sequence);

    // Get audio tracks for each camera
    const audioTracks = await this.getAudioTracksForCameras(sequence, cameras);

    // Sample audio levels at regular intervals
    const timeline = {};
    const totalSamples = Math.ceil(duration / sampleRate);

    for (let i = 0; i < totalSamples; i++) {
      const timestamp = i * sampleRate;

      // Get audio level for each camera at this timestamp
      const levels = await Promise.all([
        this.getAudioLevelAtTime(audioTracks[1], timestamp),
        this.getAudioLevelAtTime(audioTracks[2], timestamp),
        this.getAudioLevelAtTime(audioTracks[3], timestamp)
      ]);

      // Determine active camera (highest level)
      const activeCamera = this.determineActiveCamera(levels);

      timeline[timestamp] = {
        camera1: levels[0],
        camera2: levels[1],
        camera3: levels[2],
        activeCamera: activeCamera
      };

      // Report progress
      if (this.progressCallback) {
        const progress = ((i + 1) / totalSamples) * 100;
        this.progressCallback(progress, `Analyzing audio: ${Math.round(progress)}%`);
      }
    }

    return {
      timeline: timeline,
      duration: duration,
      sampleRate: sampleRate
    };
  }

  /**
   * Get audio level at specific timestamp
   * @param {Object} audioTrack - Premiere Pro audio track
   * @param {number} timestamp - Time in seconds
   * @returns {Promise<number>} Audio level 0.0-1.0
   */
  async getAudioLevelAtTime(audioTrack, timestamp) {
    // Implementation depends on Premiere Pro API
    // Possible approaches:
    // 1. Use audioTrack.getAudioChannelMapping() if available
    // 2. Use audioTrack.getAudioLevels(timestamp, timestamp + sampleRate)
    // 3. Fallback: Use clip.getVolume() as proxy

    // For now, pseudocode:
    try {
      // Get clip at this timestamp
      const clip = await this.getClipAtTime(audioTrack, timestamp);
      if (!clip) return 0.0;

      // Get audio metadata (volume, gain, etc.)
      const volume = clip.audioChannelMapping?.volume || 1.0;

      // Normalize to 0.0-1.0 range
      return Math.min(1.0, Math.max(0.0, volume));

    } catch (error) {
      console.warn(`AudioAnalyzer: Failed to get level at ${timestamp}s:`, error);
      return 0.0;
    }
  }

  /**
   * Determine which camera is active based on audio levels
   * @param {number[]} levels - [camera1Level, camera2Level, camera3Level]
   * @returns {1|2|3} Active camera number
   */
  determineActiveCamera(levels) {
    const maxLevel = Math.max(...levels);

    // If all silent, default to camera 1
    if (maxLevel < 0.1) return 1;

    // Return camera with highest level
    return levels.indexOf(maxLevel) + 1;
  }

  onProgress(callback) {
    this.progressCallback = callback;
  }
}
```

**Critical Technical Challenge**:
Accessing audio metadata via UXP API. Need to verify:
- Does `audioTrack.getAudioLevels()` exist?
- Can we access `clip.audioChannelMapping`?
- Fallback: Use `clip.getVolume()` as proxy

**PoC Required**: Test audio data access in Phase 4, Day 1

---

### Module 2: CutGenerator

**File**: `modules/CutGenerator.js`

**Purpose**: Generate optimal cut points from analysis result

**Core Algorithm** (Minimum cut duration + frequency threshold):

```javascript
class CutGenerator {
  /**
   * Generate cuts from analysis result
   * @param {AnalysisResult} analysisResult
   * @param {CutOptions} options - {minCutDuration: 2.0, cutFrequency: 'medium', transitionDuration: 0.0}
   * @returns {Cut[]}
   */
  generateCuts(analysisResult, options = {}) {
    const {
      minCutDuration = 2.0,
      cutFrequency = 'medium',
      transitionDuration = 0.0
    } = options;

    // Convert cutFrequency to threshold
    const threshold = this.frequencyToThreshold(cutFrequency);

    const cuts = [];
    let currentCut = null;

    // Sort timestamps
    const timestamps = Object.keys(analysisResult.timeline)
      .map(Number)
      .sort((a, b) => a - b);

    for (const timestamp of timestamps) {
      const data = analysisResult.timeline[timestamp];
      const activeCamera = data.activeCamera;

      if (!currentCut) {
        // Start first cut
        currentCut = {
          startTime: timestamp,
          endTime: timestamp,
          camera: activeCamera
        };
      } else if (activeCamera !== currentCut.camera) {
        // Camera changed - should we create new cut?
        const currentDuration = timestamp - currentCut.startTime;

        if (currentDuration >= minCutDuration) {
          // Commit current cut
          currentCut.endTime = timestamp;
          cuts.push(currentCut);

          // Start new cut
          currentCut = {
            startTime: timestamp,
            endTime: timestamp,
            camera: activeCamera
          };
        } else {
          // Too short, extend current cut (ignore camera change)
          currentCut.endTime = timestamp;
        }
      } else {
        // Same camera, extend cut
        currentCut.endTime = timestamp;
      }
    }

    // Commit final cut
    if (currentCut) {
      currentCut.endTime = analysisResult.duration;
      cuts.push(currentCut);
    }

    // Apply frequency threshold (optional: merge short alternating cuts)
    const optimizedCuts = this.applyFrequencyThreshold(cuts, threshold);

    return optimizedCuts;
  }

  /**
   * Convert cutFrequency setting to threshold value
   * @param {'low'|'medium'|'high'} frequency
   * @returns {number} Threshold (higher = fewer cuts)
   */
  frequencyToThreshold(frequency) {
    const thresholds = {
      'high': 0.6,   // Frequent cuts (aggressive)
      'medium': 0.7, // Balanced (default)
      'low': 0.8     // Fewer cuts (conservative)
    };
    return thresholds[frequency] || thresholds['medium'];
  }

  /**
   * Apply frequency threshold to reduce cut count
   * @param {Cut[]} cuts
   * @param {number} threshold
   * @returns {Cut[]}
   */
  applyFrequencyThreshold(cuts, threshold) {
    // For now, simple implementation: return as-is
    // Phase 5: Implement smart merging based on threshold
    return cuts;
  }
}
```

**Testing Strategy**:
- Unit test: Different cutFrequency values
- Unit test: Minimum cut duration enforcement
- Edge case: Very short cuts (<0.5s)
- Edge case: Entire sequence on one camera

---

### Module 3: TimelineEditor

**File**: `modules/TimelineEditor.js`

**Purpose**: Apply cuts to Premiere Pro timeline (create new sequence)

**Core Algorithm** (New sequence creation + clip placement):

```javascript
class TimelineEditor {
  constructor() {
    this.progressCallback = null;
  }

  /**
   * Apply cuts to create multicam sequence
   * @param {Object} sequence - Original sequence
   * @param {Cut[]} cuts - Array of cut points
   * @param {Object} cameras - Camera track info
   * @returns {Promise<EditResult>}
   */
  async applyEdits(sequence, cuts, cameras) {
    try {
      // Create new sequence
      const newSequenceName = `${sequence.name}_Multicam`;
      const newSequence = await this.createNewSequence(sequence, newSequenceName);

      let cutsApplied = 0;
      const totalCuts = cuts.length;

      // Get source clips for each camera
      const cameraClips = await this.getCameraClips(sequence, cameras);

      // Apply each cut
      for (const cut of cuts) {
        await this.applyCut(newSequence, cameraClips, cut);
        cutsApplied++;

        if (this.progressCallback) {
          const progress = (cutsApplied / totalCuts) * 100;
          this.progressCallback(progress, `Applying cuts: ${cutsApplied}/${totalCuts}`);
        }
      }

      return {
        success: true,
        newSequenceName: newSequenceName,
        cutsApplied: cutsApplied
      };

    } catch (error) {
      return {
        success: false,
        newSequenceName: null,
        cutsApplied: 0,
        errors: [error.message]
      };
    }
  }

  /**
   * Create new sequence based on template
   * @param {Object} templateSequence
   * @param {string} name
   * @returns {Promise<Object>} New sequence
   */
  async createNewSequence(templateSequence, name) {
    // Use Premiere Pro API to create sequence
    const ppro = require('premierepro');
    const project = await ppro.Project.getActiveProject();

    // Create sequence with same settings as template
    const newSequence = await project.createSequence(
      name,
      templateSequence.getSettings()
    );

    return newSequence;
  }

  /**
   * Apply single cut to sequence
   * @param {Object} sequence
   * @param {Object} cameraClips - {1: clip, 2: clip, 3: clip}
   * @param {Cut} cut
   */
  async applyCut(sequence, cameraClips, cut) {
    const sourceClip = cameraClips[cut.camera];

    // Get video track 1 (destination)
    const videoTrack = await sequence.getVideoTrack(0);

    // Add clip segment to timeline
    await videoTrack.insertClip(
      sourceClip,
      cut.startTime,  // in point
      cut.endTime,    // out point
      cut.startTime   // timeline position
    );
  }

  onProgress(callback) {
    this.progressCallback = callback;
  }
}
```

**Critical Technical Challenge**:
- `project.createSequence()` - verify API exists
- `videoTrack.insertClip()` - verify method signature
- Clip trimming/segment extraction

**PoC Required**: Test sequence creation in Phase 4, Day 6

---

### Module 4: VisualizationUI

**File**: `modules/VisualizationUI.js`

**Purpose**: Render audio level graph on Canvas

**Core Algorithm** (Canvas bar chart):

```javascript
class VisualizationUI {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.analysisResult = null;
  }

  /**
   * Render analysis result to canvas
   * @param {AnalysisResult} analysisResult
   */
  render(analysisResult) {
    this.analysisResult = analysisResult;

    const width = this.canvas.width;
    const height = this.canvas.height;

    // Clear canvas
    this.ctx.fillStyle = '#1e1e1e';
    this.ctx.fillRect(0, 0, width, height);

    // Get timestamps
    const timestamps = Object.keys(analysisResult.timeline)
      .map(Number)
      .sort((a, b) => a - b);

    const barWidth = width / timestamps.length;
    const maxHeight = height - 40;  // Leave room for labels

    // Draw bars for each timestamp
    timestamps.forEach((timestamp, index) => {
      const data = analysisResult.timeline[timestamp];
      const x = index * barWidth;

      // Draw camera 1 (blue)
      this.drawBar(x, data.camera1, maxHeight, '#3498db', 0);

      // Draw camera 2 (green)
      this.drawBar(x, data.camera2, maxHeight, '#2ecc71', maxHeight / 3);

      // Draw camera 3 (orange)
      this.drawBar(x, data.camera3, maxHeight, '#e67e22', (maxHeight / 3) * 2);

      // Highlight active camera
      if (data.activeCamera === 1) {
        this.ctx.fillStyle = '#3498db';
      } else if (data.activeCamera === 2) {
        this.ctx.fillStyle = '#2ecc71';
      } else {
        this.ctx.fillStyle = '#e67e22';
      }
      this.ctx.fillRect(x, height - 10, barWidth, 5);
    });

    // Draw legend
    this.drawLegend(width, height);
  }

  /**
   * Draw single bar
   * @param {number} x - X position
   * @param {number} level - Audio level (0.0-1.0)
   * @param {number} maxHeight - Maximum bar height
   * @param {string} color - Bar color
   * @param {number} yOffset - Vertical offset
   */
  drawBar(x, level, maxHeight, color, yOffset) {
    const barHeight = (level * maxHeight) / 3;  // Divide by 3 for 3 cameras
    const y = yOffset + (maxHeight / 3) - barHeight;

    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, barWidth - 1, barHeight);
  }

  /**
   * Draw legend
   */
  drawLegend(width, height) {
    this.ctx.font = '10px -apple-system, sans-serif';
    this.ctx.fillStyle = '#d4d4d4';

    this.ctx.fillText('Camera 1', 10, 20);
    this.ctx.fillText('Camera 2', 10, height / 3 + 20);
    this.ctx.fillText('Camera 3', 10, (height / 3) * 2 + 20);
    this.ctx.fillText('Active', width - 60, height - 20);
  }
}
```

**Testing Strategy**:
- Visual test: Does graph render correctly?
- Visual test: Are active cameras highlighted?
- Edge case: Empty analysis result

---

## Implementation Order

### Week 1: Core Modules

#### Day 1-2: AudioAnalyzer + PoC

**Goals**:
1. **PoC**: Verify audio metadata access
2. Implement `AudioAnalyzer` class
3. Write unit tests

**Tasks**:
- [ ] Create `modules/AudioAnalyzer.js`
- [ ] PoC: Test `audioTrack.getAudioLevels()` or equivalent
- [ ] Implement `getSequenceDuration()`
- [ ] Implement `getAudioTracksForCameras()`
- [ ] Implement `getAudioLevelAtTime()`
- [ ] Implement `determineActiveCamera()`
- [ ] Create `tests/audio-analyzer.test.js`
- [ ] Test with sample sequence

**Success Criteria**:
- ✅ Can access audio metadata via UXP API
- ✅ Returns valid `AnalysisResult` object
- ✅ Tests pass

**Risks**:
- ⚠️ UXP API may not expose audio levels directly
- **Mitigation**: Fallback to `clip.getVolume()` as proxy

#### Day 3-4: CutGenerator

**Goals**:
1. Implement `CutGenerator` class
2. Write comprehensive unit tests

**Tasks**:
- [ ] Create `modules/CutGenerator.js`
- [ ] Implement `generateCuts()`
- [ ] Implement `frequencyToThreshold()`
- [ ] Implement `applyFrequencyThreshold()`
- [ ] Create `tests/cut-generator.test.js`
- [ ] Test all cut frequency options
- [ ] Test minimum cut duration enforcement

**Success Criteria**:
- ✅ Generates valid `Cut[]` array
- ✅ Respects minimum cut duration
- ✅ Cut frequency affects output
- ✅ Tests pass

#### Day 5: VisualizationUI

**Goals**:
1. Implement Canvas-based visualization
2. Visual testing

**Tasks**:
- [ ] Create `modules/VisualizationUI.js`
- [ ] Implement `render()`
- [ ] Implement `drawBar()`
- [ ] Implement `drawLegend()`
- [ ] Visual test with sample data
- [ ] Update `index.html` - add `<canvas id="vis-canvas">`
- [ ] Update `styles.css` - canvas styling

**Success Criteria**:
- ✅ Graph renders correctly
- ✅ Active cameras are highlighted
- ✅ Legend is readable

---

### Week 2: Integration

#### Day 6-7: TimelineEditor + PoC

**Goals**:
1. **PoC**: Verify sequence creation API
2. Implement `TimelineEditor` class
3. Write unit tests

**Tasks**:
- [ ] Create `modules/TimelineEditor.js`
- [ ] PoC: Test `project.createSequence()`
- [ ] PoC: Test `videoTrack.insertClip()`
- [ ] Implement `applyEdits()`
- [ ] Implement `createNewSequence()`
- [ ] Implement `applyCut()`
- [ ] Create `tests/timeline-editor.test.js`
- [ ] Test with sample sequence

**Success Criteria**:
- ✅ Can create new sequence
- ✅ Can insert clips at specific times
- ✅ Returns valid `EditResult`
- ✅ Tests pass

**Risks**:
- ⚠️ Sequence creation API may differ from expectation
- **Mitigation**: Research UXP docs, test early

#### Day 8: main.js Integration

**Goals**:
1. Replace mock `analyze()` with real implementation
2. Integrate all 4 modules
3. Extend state management

**Tasks**:
- [ ] Update `state` object:
  ```javascript
  const state = {
    cameras: {1: null, 2: null, 3: null},
    analysisResult: null,
    cuts: null,
    isAnalyzing: false,
    isEditing: false,
    currentStep: 'setup',  // 'setup' | 'config' | 'processing' | 'refinement'
    settings: {
      minCutDuration: 2.0,
      sampleRate: 1.0,
      cutFrequency: 'medium',
      transitionDuration: 0.0
    }
  };
  ```
- [ ] Import modules:
  ```javascript
  import AudioAnalyzer from './modules/AudioAnalyzer.js';
  import CutGenerator from './modules/CutGenerator.js';
  import TimelineEditor from './modules/TimelineEditor.js';
  import VisualizationUI from './modules/VisualizationUI.js';
  ```
- [ ] Rewrite `analyze()` function:
  ```javascript
  async function analyze() {
    state.isAnalyzing = true;
    updateProgress('Initializing...');

    // Step 1: Audio analysis
    const analyzer = new AudioAnalyzer();
    analyzer.onProgress((progress, msg) => updateProgress(msg));
    state.analysisResult = await analyzer.analyzeSequence(
      sequence,
      state.cameras,
      {sampleRate: state.settings.sampleRate}
    );

    // Step 2: Cut generation
    const generator = new CutGenerator();
    state.cuts = generator.generateCuts(state.analysisResult, {
      minCutDuration: state.settings.minCutDuration,
      cutFrequency: state.settings.cutFrequency,
      transitionDuration: state.settings.transitionDuration
    });

    // Step 3: Timeline editing
    const editor = new TimelineEditor();
    editor.onProgress((progress, msg) => updateProgress(msg));
    const result = await editor.applyEdits(sequence, state.cuts, state.cameras);

    // Step 4: Visualization
    const vis = new VisualizationUI(document.getElementById('vis-canvas'));
    vis.render(state.analysisResult);

    state.isAnalyzing = false;
    state.currentStep = 'refinement';
    updateStatus(`Complete! Created ${result.newSequenceName}`, 'success');
  }
  ```

**Success Criteria**:
- ✅ Full workflow executes without errors
- ✅ New sequence is created
- ✅ Visualization appears

#### Day 9: UI Updates (Configuration + Refinement)

**Goals**:
1. Add Configuration section (Step 2)
2. Add Refinement section (Step 4)
3. Update button labels (Autopod-style)

**Tasks**:
- [ ] Update `index.html`:
  ```html
  <!-- Step 2: Configuration -->
  <section class="configuration">
    <h3>Settings</h3>
    <label>Minimum Cut Duration (seconds):
      <input id="min-cut-duration" type="number" value="2.0" step="0.5" min="0.5">
    </label>
    <label>Sample Rate (seconds):
      <input id="sample-rate" type="number" value="1.0" step="0.5" min="0.5">
    </label>
    <label>Cut Frequency:
      <select id="cut-frequency">
        <option value="high">High</option>
        <option value="medium" selected>Medium</option>
        <option value="low">Low</option>
      </select>
    </label>
    <label>Transition Duration (seconds):
      <input id="transition-duration" type="number" value="0.0" step="0.1" min="0.0">
    </label>
  </section>

  <!-- Step 3: Processing (update button label) -->
  <section class="processing">
    <h3>Process</h3>
    <button id="analyze-btn" class="primary-btn" disabled>Create Multicam Edit</button>
    <div id="progress"></div>
  </section>

  <!-- Step 4: Refinement -->
  <section class="refinement">
    <h3>Results</h3>
    <canvas id="vis-canvas" width="600" height="300"></canvas>
  </section>
  ```
- [ ] Update `styles.css`:
  - Configuration section styling
  - Canvas container styling
  - Refinement section layout
- [ ] Update `main.js`:
  - Read settings from inputs
  - Update `state.settings` on input change

**Success Criteria**:
- ✅ All 4 steps visible in UI
- ✅ Settings can be adjusted
- ✅ Button label is "Create Multicam Edit"

#### Day 10: Integration Testing

**Goals**:
1. Test complete workflow
2. Fix integration issues

**Tasks**:
- [ ] Create `tests/integration.test.js`
- [ ] Test full workflow: Setup → Config → Processing → Refinement
- [ ] Test different settings combinations
- [ ] Test error scenarios (no sequence, no cameras, etc.)

**Success Criteria**:
- ✅ Integration tests pass
- ✅ No critical bugs

---

### Week 3: Polish & Testing

#### Day 11-12: User Testing (Premiere Pro)

**Goals**:
1. Test with real Premiere Pro sequences
2. Identify usability issues
3. Performance testing

**Test Scenarios**:
- [ ] 2-person interview (10 minutes, 3 cameras)
- [ ] 3-person panel discussion (20 minutes, 3 cameras)
- [ ] Podcast (60 minutes, 3 cameras)

**Metrics to Collect**:
- Processing time (target: <2 min for 30-min video)
- Cut accuracy (target: 80%+ correct camera)
- User satisfaction

#### Day 13: Bug Fixes

**Goals**:
1. Fix bugs found in user testing
2. Address performance issues

#### Day 14: Performance Optimization

**Goals**:
1. Optimize audio analysis (if slow)
2. Optimize timeline editing (if slow)
3. Improve UI responsiveness

**Techniques**:
- Reduce sample rate dynamically for long videos
- Batch clip insertions
- Progress updates every N operations (not every operation)

#### Day 15: Final Validation

**Goals**:
1. Verify all success criteria
2. Documentation sync check
3. Prepare for Phase 5 (official testing)

**Checklist**:
- [ ] All modules implemented
- [ ] All tests passing
- [ ] Documentation matches code
- [ ] No critical bugs
- [ ] Performance acceptable

---

## Testing Strategy

### Unit Tests

**AudioAnalyzer** (`tests/audio-analyzer.test.js`):
```javascript
describe('AudioAnalyzer', () => {
  it('should return valid AnalysisResult structure', () => {});
  it('should respect sampleRate option', () => {});
  it('should determine active camera correctly', () => {});
  it('should handle missing audio tracks gracefully', () => {});
});
```

**CutGenerator** (`tests/cut-generator.test.js`):
```javascript
describe('CutGenerator', () => {
  it('should enforce minimum cut duration', () => {});
  it('should generate fewer cuts with "low" frequency', () => {});
  it('should generate more cuts with "high" frequency', () => {});
  it('should handle single-camera sequences', () => {});
});
```

**TimelineEditor** (`tests/timeline-editor.test.js`):
```javascript
describe('TimelineEditor', () => {
  it('should create new sequence', () => {});
  it('should apply all cuts', () => {});
  it('should return EditResult with correct cutsApplied count', () => {});
  it('should handle errors gracefully', () => {});
});
```

### Integration Tests

**Full Workflow** (`tests/integration.test.js`):
```javascript
describe('Multi-Camera Editor Workflow', () => {
  it('should complete full workflow: Setup → Config → Processing → Refinement', () => {});
  it('should respect settings from Configuration step', () => {});
  it('should create new sequence with correct name', () => {});
  it('should render visualization after processing', () => {});
});
```

### User Acceptance Testing

**Manual Test Cases**:

1. **Happy Path Test**
   - [ ] Open 3-camera sequence in Premiere Pro
   - [ ] Assign Camera 1, 2, 3
   - [ ] Adjust settings (minCutDuration: 3.0, cutFrequency: medium)
   - [ ] Click "Create Multicam Edit"
   - [ ] Verify: New sequence created
   - [ ] Verify: Visualization appears
   - [ ] Verify: Cuts are reasonable

2. **Edge Cases**
   - [ ] No cameras assigned → Error message
   - [ ] Only 2 cameras assigned → Error message
   - [ ] Very short sequence (<10 seconds) → Should work
   - [ ] Very long sequence (>60 minutes) → Performance acceptable

3. **Error Scenarios**
   - [ ] No active sequence → Clear error message
   - [ ] Sequence with no audio tracks → Clear error message

---

## Milestones and Checkpoints

### Milestone 1: Core Modules Complete (End of Week 1)

**Deliverables**:
- ✅ AudioAnalyzer implemented + tested
- ✅ CutGenerator implemented + tested
- ✅ VisualizationUI implemented + visual test
- ✅ Unit tests passing

**Gate Criteria**:
- All module interfaces match API.md
- Unit tests have 80%+ coverage
- No critical bugs

### Milestone 2: Integration Complete (End of Week 2)

**Deliverables**:
- ✅ TimelineEditor implemented + tested
- ✅ main.js integrated with all modules
- ✅ UI updated (4 steps visible)
- ✅ Integration tests passing

**Gate Criteria**:
- Full workflow executes without errors
- New sequence is created in Premiere Pro
- Visualization renders correctly

### Milestone 3: User-Ready (End of Week 3)

**Deliverables**:
- ✅ User testing complete
- ✅ Bugs fixed
- ✅ Performance optimized
- ✅ Documentation verified

**Gate Criteria**:
- Processing time: <2 min for 30-min video
- Cut accuracy: 80%+ correct camera selection
- No critical bugs
- User satisfaction: Positive feedback

---

## Risk Mitigation

### Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|-----------|
| **Audio metadata inaccessible via UXP API** | High | Medium | PoC on Day 1; fallback to `clip.getVolume()` |
| **Sequence creation API different than expected** | High | Low | PoC on Day 6; research UXP docs early |
| **Performance issues with long videos** | Medium | Medium | Dynamic sample rate adjustment; progress feedback |
| **Cut quality below expectations** | Medium | Medium | Settings allow user to adjust; document expected 80% accuracy |

### Schedule Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **PoC takes longer than expected** | Medium | Allocate 2 days for AudioAnalyzer PoC; escalate early if blocked |
| **Integration issues** | Medium | Reserve Day 10 for integration debugging |
| **User testing reveals major issues** | High | Day 13 buffer for bug fixes; cut scope if necessary |

### Scope Management

**In Scope for Phase 3-4**:
- ✅ 3-camera support only
- ✅ Volume-based speaker detection
- ✅ Autopod-style 4-step workflow
- ✅ Basic visualization (Canvas graph)

**Out of Scope (Phase 5+)**:
- ❌ 4+ camera support
- ❌ AI-based speaker detection
- ❌ Social Clip Creator
- ❌ Jump Cut Editor
- ❌ Advanced visualization (interactive timeline)

---

## Next Steps

**Immediate Actions**:
1. ✅ Review this implementation plan
2. ➡️ Start Phase 4: Code Implementation
3. ➡️ Day 1: AudioAnalyzer PoC + implementation

**Commands**:
- To start implementation: `/ddd:4-code`
- To review plan: Re-read this document + `plan.md`

---

**Implementation Plan Status**: ✅ Complete - Ready for Phase 4
