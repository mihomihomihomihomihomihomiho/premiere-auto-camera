// Auto Camera Switcher - Phase 4: Full Implementation
// UXP extension for Premiere Pro

console.log('[Auto Camera] Extension loaded');

// Import modules
const AudioAnalyzer = require('./modules/AudioAnalyzer.js');
const CutGenerator = require('./modules/CutGenerator.js');
const TimelineEditor = require('./modules/TimelineEditor.js');
const VisualizationUI = require('./modules/VisualizationUI.js');

console.log('[Auto Camera] Modules imported successfully');

// State management
const state = {
  cameras: { 1: null, 2: null, 3: null },
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

// DOM elements
let cam1Btn, cam2Btn, cam3Btn, analyzeBtn, progressDiv, statusDiv;

function ensureMarkup() {
  // If HTML didn't render (seen as blank panel), inject fallback markup.
  if (document.querySelector('.panel')) {
    return;
  }
  console.warn('[Auto Camera] No UI found in DOM. Injecting fallback markup.');
  document.body.innerHTML = `
    <style>
      body { margin:0; padding:0; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif; background:#1e1e1e; color:#d4d4d4; font-size:13px; }
      .panel { padding:16px; }
      h2 { margin:0 0 20px 0; font-size:16px; font-weight:600; color:#fff; }
      h3 { margin:0 0 12px 0; font-size:13px; font-weight:500; color:#d4d4d4; }
      .camera-setup { margin-bottom:24px; padding-bottom:20px; border-bottom:1px solid #3e3e3e; }
      .camera-btn { display:block; width:100%; padding:10px; margin-bottom:8px; background:#2d2d2d; color:#d4d4d4; border:1px solid #3e3e3e; border-radius:4px; cursor:pointer; font-size:13px; text-align:left; }
      .camera-btn:hover { background:#3e3e3e; border-color:#0e639c; }
      .camera-btn.active { background:#0e639c; color:#fff; border-color:#0e639c; }
      .hint { margin:12px 0 0 0; font-size:12px; color:#858585; font-style:italic; }
      .analysis { margin-bottom:20px; }
      .primary-btn { display:block; width:100%; padding:12px; background:#0e639c; color:#fff; border:none; border-radius:4px; cursor:pointer; font-size:13px; font-weight:500; }
      .primary-btn:hover { background:#1177bb; }
      .primary-btn:disabled { background:#3e3e3e; color:#858585; cursor:not-allowed; }
      .progress-display { margin-top:12px; padding:8px; background:#252525; border-radius:4px; min-height:20px; font-size:12px; color:#d4d4d4; display:none; }
      .progress-display.visible { display:block; }
      .status { padding:8px; background:#252525; border-radius:4px; font-size:12px; min-height:20px; display:none; }
      .status.visible { display:block; }
      .status.error { background:#5a1d1d; color:#f48771; }
      .status.success { background:#1e3a1e; color:#89d185; }
      .status.info { background:#1e2a3a; color:#89c4f4; }
    </style>
    <div class="panel">
      <h2>Auto Camera Switcher</h2>
      <section class="camera-setup">
        <h3>Assign Camera Tracks</h3>
        <button id="cam1-btn" class="camera-btn">Camera 1</button>
        <button id="cam2-btn" class="camera-btn">Camera 2</button>
        <button id="cam3-btn" class="camera-btn">Camera 3</button>
        <p class="hint">Click each button to bind a camera to a video track (top three tracks).</p>
      </section>
      <section class="analysis">
        <h3>Analyze Audio</h3>
        <button id="analyze-btn" class="primary-btn" disabled>Analyze and Generate Switches</button>
        <div id="progress" class="progress-display"></div>
      </section>
      <div id="status" class="status info"></div>
    </div>
  `;
}

function initUI() {
  console.log('[Auto Camera] Initializing UI...');
  ensureMarkup();

  // Get DOM elements
  cam1Btn = document.getElementById('cam1-btn');
  cam2Btn = document.getElementById('cam2-btn');
  cam3Btn = document.getElementById('cam3-btn');
  analyzeBtn = document.getElementById('analyze-btn');
  progressDiv = document.getElementById('progress');
  statusDiv = document.getElementById('status');

  if (!cam1Btn || !cam2Btn || !cam3Btn || !analyzeBtn || !progressDiv || !statusDiv) {
    console.warn('[Auto Camera] UI elements not found; retrying...');
    setTimeout(initUI, 100);
    return;
  }

  // Set up event listeners
  cam1Btn.addEventListener('click', () => setupCamera(1));
  cam2Btn.addEventListener('click', () => setupCamera(2));
  cam3Btn.addEventListener('click', () => setupCamera(3));
  analyzeBtn.addEventListener('click', analyze);

  console.log('[Auto Camera] Event listeners attached');
  updateStatus('Ready. Assign camera tracks to begin.', 'info');
}

// Initialize when DOM is ready (or immediately if already ready)
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  initUI();
} else {
  document.addEventListener('DOMContentLoaded', initUI);
  // Also kick off a fallback init in case DOMContentLoaded never fires in host
  setTimeout(initUI, 200);
}

/**
 * Get the active sequence from Premiere Pro
 * @returns {Object|null} Active sequence or null if none
 */
async function getActiveSequence() {
  try {
    console.log('[Auto Camera] Attempting to access Premiere API...');
    // Prefer new async API; fall back to legacy app.project.activeSequence
    const ppro = require('premierepro');
    if (ppro?.Project?.getActiveProject) {
      const project = await ppro.Project.getActiveProject();
      if (!project) {
        console.warn('[Auto Camera] No active project found');
        return null;
      }
      const sequence = await project.getActiveSequence();
      if (!sequence) {
        console.warn('[Auto Camera] No active sequence found');
        return null;
      }
      console.log('[Auto Camera] Active sequence found (async API):', sequence.name);
      try {
        console.log('[Auto Camera] Sequence keys (async API):', Object.keys(sequence || {}));
      } catch (e) {
        console.warn('[Auto Camera] Could not list sequence keys (async API):', e);
      }
      return sequence;
    }

    // Legacy API shape
    const app = require('premierepro')?.app;
    if (!app?.project?.activeSequence) {
      console.warn('[Auto Camera] No active sequence found (legacy API)');
      return null;
    }
    console.log('[Auto Camera] Active sequence found (legacy API):', app.project.activeSequence.name);
    try {
      console.log('[Auto Camera] Sequence keys (legacy API):', Object.keys(app.project.activeSequence || {}));
    } catch (e) {
      console.warn('[Auto Camera] Could not list sequence keys (legacy API):', e);
    }
    return app.project.activeSequence;
  } catch (error) {
    console.error('[Auto Camera] Error accessing Premiere API:', error);
    return null;
  }
}

/**
 * Retrieve video tracks with compatibility across API shapes.
 * Supports getVideoTracks(), sequence.videoTracks (array/array-like), or numTracks/getItemAt.
 */
async function getVideoTracksList(sequence) {
  const logShape = (label, obj) => {
    try {
      console.log(`[Auto Camera] ${label}: type=${typeof obj}, keys=${obj ? Object.keys(obj) : 'n/a'}, numTracks=${obj?.numTracks}, length=${obj?.length}`);
    } catch (e) {
      console.warn(`[Auto Camera] Could not inspect ${label}:`, e);
    }
  };
  const logProps = (label, obj) => {
    try {
      const props = Object.getOwnPropertyNames(Object.getPrototypeOf(obj || {}));
      console.log(`[Auto Camera] ${label} proto props:`, props);
    } catch (e) {
      console.warn(`[Auto Camera] Could not list proto props for ${label}:`, e);
    }
  };
  const resolveMaybePromise = async (val) => {
    if (val && typeof val.then === 'function') {
      return await val;
    }
    return val;
  };

  // If async API returned an opaque sequence with no tracks, hop to legacy sequence early
  if (!sequence?.videoTracks && typeof sequence?.getVideoTracks !== 'function') {
    try {
      const legacySeq = require('premierepro')?.app?.project?.activeSequence;
      logShape('legacy seq (early fallback)', legacySeq);
      logProps('legacy seq (early fallback)', legacySeq);
      if (legacySeq) {
        sequence = legacySeq;
      }
    } catch (e) {
      console.warn('[Auto Camera] Failed legacy seq early fallback:', e);
    }
  }

  // Newer async API: getVideoTracks()
  if (sequence && typeof sequence.getVideoTracks === 'function') {
    const tracks = await sequence.getVideoTracks();
    logShape('tracks from getVideoTracks()', tracks);
    if (Array.isArray(tracks)) return tracks;
    if (tracks && typeof tracks.length === 'number') return Array.from(tracks);
  }

  // Some builds expose getVideoTrackAt / getVideoTrackCount
  if (sequence && typeof sequence.getVideoTrackAt === 'function') {
    try {
      const count = await resolveMaybePromise(
        typeof sequence.getVideoTrackCount === 'function'
          ? sequence.getVideoTrackCount()
          : (typeof sequence.numTracks === 'number' ? sequence.numTracks : 0)
      );
      console.log('[Auto Camera] sequence.getVideoTrackAt exists, count=', count);
      if (count && count > 0) {
        const tracks = await Promise.all(
          Array.from({ length: count }, (_, i) => resolveMaybePromise(sequence.getVideoTrackAt(i)))
        );
        return tracks.filter(Boolean);
      }
    } catch (e) {
      console.warn('[Auto Camera] getVideoTrackAt fallback failed:', e);
    }
  }

  // Some builds expose getVideoTrack / getVideoTrackCount
  if (sequence && typeof sequence.getVideoTrack === 'function') {
    try {
      const count = await resolveMaybePromise(
        typeof sequence.getVideoTrackCount === 'function'
          ? sequence.getVideoTrackCount()
          : 0
      );
      console.log('[Auto Camera] sequence.getVideoTrack exists, count=', count);
      if (count && count > 0) {
        const tracks = await Promise.all(
          Array.from({ length: count }, (_, i) => resolveMaybePromise(sequence.getVideoTrack(i)))
        );
        return tracks.filter(Boolean);
      }
    } catch (e) {
      console.warn('[Auto Camera] getVideoTrack fallback failed:', e);
    }
  }

  const tracks = sequence?.videoTracks;
  logShape('sequence.videoTracks', tracks);
  logProps('sequence', sequence);
  if (Array.isArray(tracks)) return tracks;
  if (tracks && typeof tracks.length === 'number') {
    return Array.from({ length: tracks.length }, (_, i) => tracks[i]);
  }
  if (tracks && typeof tracks.numTracks === 'number' && typeof tracks.getItemAt === 'function') {
    return Array.from({ length: tracks.numTracks }, (_, i) => tracks.getItemAt(i));
  }
  // Legacy API: app.project.activeSequence.videoTracks with numTracks/getItemAt
  if (sequence && typeof sequence.numTracks === 'number' && typeof sequence.getItemAt === 'function') {
    return Array.from({ length: sequence.numTracks }, (_, i) => sequence.getItemAt(i));
  }

  // Try legacy global app.project.activeSequence
  try {
    const legacyTracks = require('premierepro')?.app?.project?.activeSequence?.videoTracks;
    if (legacyTracks) {
      logShape('legacy app.project.activeSequence.videoTracks', legacyTracks);
      if (Array.isArray(legacyTracks)) return legacyTracks;
      if (legacyTracks && typeof legacyTracks.length === 'number') {
        return Array.from({ length: legacyTracks.length }, (_, i) => legacyTracks[i]);
      }
      if (legacyTracks && typeof legacyTracks.numTracks === 'number' && typeof legacyTracks.getItemAt === 'function') {
        return Array.from({ length: legacyTracks.numTracks }, (_, i) => legacyTracks.getItemAt(i));
      }
    }
  } catch (e) {
    console.warn('[Auto Camera] Error inspecting legacy app.project.activeSequence.videoTracks:', e);
  }

  // Log sequence shape before giving up
  logShape('sequence (fallback inspection)', sequence);

  throw new Error('Unable to read video tracks from sequence.');
}

/**
 * Assign a video track to a camera number
 * @param {number} num - Camera number (1, 2, or 3)
 */
async function setupCamera(num) {
  console.log(`[Auto Camera] Setting up camera ${num}...`);

  try {
    const sequence = await getActiveSequence();

    if (!sequence) {
      updateStatus('Error: No active sequence. Please open a sequence first.', 'error');
      return;
    }

    // Get video tracks (API compatibility handled inside helper)
    const videoTracks = await getVideoTracksList(sequence);
    console.log(`[Auto Camera] Found ${videoTracks.length} video tracks`);

    if (videoTracks.length < 3) {
      updateStatus(`Error: Need at least 3 video tracks. Found ${videoTracks.length}.`, 'error');
      return;
    }

    // For Phase 1, assign tracks sequentially (track index = camera number - 1)
    const trackIndex = num - 1;
    const track = videoTracks[trackIndex];

    // Store track reference
    state.cameras[num] = {
      trackIndex: trackIndex,
      trackName: track.name || `Video ${trackIndex + 1}`
    };

    console.log(`[Auto Camera] Camera ${num} assigned to track:`, state.cameras[num]);

    // Update UI
    updateCameraButton(num, true);
    updateStatus(`Camera ${num} assigned to ${state.cameras[num].trackName}`, 'success');

    // Enable analyze button if all cameras assigned
    if (allCamerasAssigned()) {
      analyzeBtn.disabled = false;
      console.log('[Auto Camera] All cameras assigned, analyze button enabled');
    }

  } catch (error) {
    console.error(`[Auto Camera] Error setting up camera ${num}:`, error);
    updateStatus(`Error: ${error.message}`, 'error');
  }
}

/**
 * Update camera button visual state
 * @param {number} num - Camera number
 * @param {boolean} active - Whether button should be active
 */
function updateCameraButton(num, active) {
  const button = document.getElementById(`cam${num}-btn`);

  if (active) {
    button.classList.add('active');
    if (state.cameras[num]) {
      button.textContent = `Camera ${num}: ${state.cameras[num].trackName}`;
    }
  } else {
    button.classList.remove('active');
    button.textContent = `Camera ${num}`;
  }
}

/**
 * Check if all cameras have been assigned
 * @returns {boolean} True if all 3 cameras assigned
 */
function allCamerasAssigned() {
  return state.cameras[1] !== null &&
         state.cameras[2] !== null &&
         state.cameras[3] !== null;
}

/**
 * Full audio analysis and editing workflow
 * Integrates: AudioAnalyzer → CutGenerator → TimelineEditor → VisualizationUI
 */
async function analyze() {
  console.log('[Auto Camera] Starting full analysis workflow...');

  try {
    // Verify all cameras assigned
    if (!allCamerasAssigned()) {
      updateStatus('Error: Assign all 3 cameras before analyzing.', 'error');
      return;
    }

    // Set state
    state.isAnalyzing = true;
    analyzeBtn.disabled = true;

    // Get sequence
    const sequence = await getActiveSequence();
    if (!sequence) {
      updateStatus('Error: No active sequence found.', 'error');
      state.isAnalyzing = false;
      analyzeBtn.disabled = false;
      return;
    }

    console.log('[Auto Camera] Sequence:', sequence.name);
    state.currentStep = 'processing';

    // Step 1: Audio Analysis
    updateProgress('Step 1/4: Analyzing audio levels...');
    const analyzer = new AudioAnalyzer();
    analyzer.onProgress((progress, msg) => {
      updateProgress(`Step 1/4: ${msg}`);
    });

    state.analysisResult = await analyzer.analyzeSequence(
      sequence,
      state.cameras,
      { sampleRate: state.settings.sampleRate }
    );

    console.log('[Auto Camera] Audio analysis complete:', {
      duration: state.analysisResult.duration,
      samples: Object.keys(state.analysisResult.timeline).length
    });

    // Step 2: Cut Generation
    updateProgress('Step 2/4: Generating camera switches...');
    const generator = new CutGenerator();

    state.cuts = generator.generateCuts(state.analysisResult, {
      minCutDuration: state.settings.minCutDuration,
      cutFrequency: state.settings.cutFrequency,
      transitionDuration: state.settings.transitionDuration
    });

    console.log('[Auto Camera] Cut generation complete:', {
      totalCuts: state.cuts.length
    });

    // Get statistics
    const stats = generator.getStatistics(state.cuts);
    console.log('[Auto Camera] Cut statistics:', stats);

    // Step 3: Timeline Editing
    updateProgress('Step 3/4: Creating multicam sequence...');
    const editor = new TimelineEditor();
    editor.onProgress((progress, msg) => {
      updateProgress(`Step 3/4: ${msg}`);
    });

    const editResult = await editor.applyEdits(sequence, state.cuts, state.cameras);

    if (!editResult.success) {
      throw new Error(editResult.errors ? editResult.errors.join(', ') : 'Timeline editing failed');
    }

    console.log('[Auto Camera] Timeline editing complete:', editResult);

    // Step 4: Visualization
    updateProgress('Step 4/4: Rendering visualization...');

    // Get or create canvas
    let canvas = document.getElementById('vis-canvas');
    if (!canvas) {
      console.log('[Auto Camera] Creating visualization canvas');
      const container = document.querySelector('.analysis');
      if (container) {
        canvas = document.createElement('canvas');
        canvas.id = 'vis-canvas';
        canvas.width = 800;
        canvas.height = 200;
        canvas.style.width = '100%';
        canvas.style.height = 'auto';
        canvas.style.marginTop = '12px';
        canvas.style.borderRadius = '4px';
        canvas.style.backgroundColor = '#1e1e1e';
        container.appendChild(canvas);
      }
    }

    if (canvas) {
      const vis = new VisualizationUI(canvas);
      vis.render(state.analysisResult);
      console.log('[Auto Camera] Visualization rendered');
    }

    // Complete
    updateProgress('');
    state.currentStep = 'refinement';
    state.isAnalyzing = false;

    updateStatus(
      `✓ Complete! Created "${editResult.newSequenceName}" with ${editResult.cutsApplied} cuts`,
      'success'
    );

    console.log('[Auto Camera] Full workflow completed successfully');

  } catch (error) {
    console.error('[Auto Camera] Error during analysis:', error);
    updateStatus(`Error: ${error.message}`, 'error');
    updateProgress('');
    state.isAnalyzing = false;
    state.currentStep = 'setup';
    analyzeBtn.disabled = false;
  }
}

/**
 * Update status display
 * @param {string} message - Status message
 * @param {string} type - Message type ('info', 'success', 'error')
 */
function updateStatus(message, type = 'info') {
  console.log(`[Auto Camera] Status (${type}): ${message}`);

  statusDiv.textContent = message;
  statusDiv.className = `status visible ${type}`;

  // Auto-hide after 5 seconds for success/info messages
  if (type !== 'error') {
    setTimeout(() => {
      statusDiv.classList.remove('visible');
    }, 5000);
  }
}

/**
 * Update progress display
 * @param {string} message - Progress message (empty to hide)
 */
function updateProgress(message) {
  if (message) {
    console.log(`[Auto Camera] Progress: ${message}`);
    progressDiv.textContent = message;
    progressDiv.classList.add('visible');
  } else {
    progressDiv.classList.remove('visible');
    progressDiv.textContent = '';
  }
}

/**
 * Utility: Promise-based delay
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise}
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Error handling for uncaught errors
window.addEventListener('error', (event) => {
  console.error('[Auto Camera] Uncaught error:', event.error);
  updateStatus(`Unexpected error: ${event.error.message}`, 'error');
});

console.log('[Auto Camera] Extension initialization complete');
