// Auto Camera Switcher - Phase 1: UI and Basic Integration
// UXP extension for Premiere Pro

console.log('[Auto Camera] Extension loaded');

// State management
const state = {
  cameras: { 1: null, 2: null, 3: null }
};

// DOM elements
let cam1Btn, cam2Btn, cam3Btn, analyzeBtn, progressDiv, statusDiv;

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('[Auto Camera] Initializing...');

  // Get DOM elements
  cam1Btn = document.getElementById('cam1-btn');
  cam2Btn = document.getElementById('cam2-btn');
  cam3Btn = document.getElementById('cam3-btn');
  analyzeBtn = document.getElementById('analyze-btn');
  progressDiv = document.getElementById('progress');
  statusDiv = document.getElementById('status');

  // Set up event listeners
  cam1Btn.addEventListener('click', () => setupCamera(1));
  cam2Btn.addEventListener('click', () => setupCamera(2));
  cam3Btn.addEventListener('click', () => setupCamera(3));
  analyzeBtn.addEventListener('click', analyze);

  console.log('[Auto Camera] Event listeners attached');
  updateStatus('Ready. Assign camera tracks to begin.', 'info');
});

/**
 * Get the active sequence from Premiere Pro
 * @returns {Object|null} Active sequence or null if none
 */
async function getActiveSequence() {
  try {
    console.log('[Auto Camera] Attempting to access Premiere API...');
    const ppro = require('premierepro');
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

    console.log('[Auto Camera] Active sequence found:', sequence.name);
    return sequence;
  } catch (error) {
    console.error('[Auto Camera] Error accessing Premiere API:', error);
    return null;
  }
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

    // Get video tracks
    const videoTracks = await sequence.getVideoTracks();
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
 * Mock audio analysis workflow (Phase 1)
 * Phase 2 will implement actual audio processing
 */
async function analyze() {
  console.log('[Auto Camera] Starting analysis...');

  try {
    // Verify all cameras assigned
    if (!allCamerasAssigned()) {
      updateStatus('Error: Assign all 3 cameras before analyzing.', 'error');
      return;
    }

    // Disable analyze button during processing
    analyzeBtn.disabled = true;

    // Get sequence info
    const sequence = await getActiveSequence();
    if (!sequence) {
      updateStatus('Error: No active sequence found.', 'error');
      analyzeBtn.disabled = false;
      return;
    }

    console.log('[Auto Camera] Sequence info:', {
      name: sequence.name
    });

    // Mock analysis with progress updates
    updateProgress('Initializing audio analysis...');
    await delay(800);

    updateProgress('Extracting audio from sequence...');
    await delay(1200);

    updateProgress('Analyzing speech patterns...');
    await delay(1500);

    updateProgress('Identifying active speakers...');
    await delay(1000);

    updateProgress('Generating camera switch points...');
    await delay(1200);

    // Complete
    updateProgress('');
    updateStatus('✓ Analysis complete! (Mock data - Phase 1)', 'success');

    console.log('[Auto Camera] Mock analysis completed successfully');

    // Re-enable analyze button
    analyzeBtn.disabled = false;

  } catch (error) {
    console.error('[Auto Camera] Error during analysis:', error);
    updateStatus(`Error: ${error.message}`, 'error');
    updateProgress('');
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
