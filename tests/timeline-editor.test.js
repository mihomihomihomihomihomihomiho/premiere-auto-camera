/**
 * TimelineEditor Unit Tests
 *
 * Note: Premiere Pro API tests require actual Premiere Pro environment.
 * These tests use mocks to verify logic and error handling.
 *
 * @test TimelineEditor
 */

const TimelineEditor = require('../modules/TimelineEditor.js');

// Simple test framework
const tests = [];
let passCount = 0;
let failCount = 0;

function test(name, fn) {
  tests.push({name, fn});
}

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`Expected ${expected}, got ${actual}`);
      }
    },
    toBeGreaterThan(expected) {
      if (actual <= expected) {
        throw new Error(`Expected ${actual} > ${expected}`);
      }
    },
    toBeLessThan(expected) {
      if (actual >= expected) {
        throw new Error(`Expected ${actual} < ${expected}`);
      }
    },
    toEqual(expected) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    },
    toBeInstanceOf(expectedClass) {
      if (!(actual instanceof expectedClass)) {
        throw new Error(`Expected instance of ${expectedClass.name}`);
      }
    },
    toBeTruthy() {
      if (!actual) {
        throw new Error(`Expected truthy value, got ${actual}`);
      }
    },
    toContain(substring) {
      if (!actual.includes(substring)) {
        throw new Error(`Expected to contain "${substring}"`);
      }
    }
  };
}

async function runTests() {
  console.log('\n=== TimelineEditor Unit Tests ===\n');

  for (const {name, fn} of tests) {
    try {
      await fn();
      console.log(`✓ ${name}`);
      passCount++;
    } catch (error) {
      console.error(`✗ ${name}`);
      console.error(`  Error: ${error.message}`);
      failCount++;
    }
  }

  console.log(`\n=== Test Results ===`);
  console.log(`Passed: ${passCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`Total: ${tests.length}`);

  if (failCount > 0) {
    process.exit(1);
  }
}

// Helper to create mock sequence
function createMockSequence(name = 'Test Sequence') {
  return {
    name: name,
    videoTracks: [
      {
        index: 0,
        clips: [
          {name: 'Camera 1 Clip', start: 0, end: 1000}
        ]
      },
      {
        index: 1,
        clips: [
          {name: 'Camera 2 Clip', start: 0, end: 1000}
        ]
      },
      {
        index: 2,
        clips: [
          {name: 'Camera 3 Clip', start: 0, end: 1000}
        ]
      }
    ],
    audioTracks: [],
    getSettings: () => ({
      videoFrameRate: {numerator: 30000, denominator: 1001},
      videoWidth: 1920,
      videoHeight: 1080
    }),
    getVideoTrack: async (index) => ({
      index: index,
      clips: [],
      insertClip: async () => {}
    })
  };
}

// Helper to create mock cameras
function createMockCameras() {
  return {
    1: {trackIndex: 0, trackName: 'Camera 1'},
    2: {trackIndex: 1, trackName: 'Camera 2'},
    3: {trackIndex: 2, trackName: 'Camera 3'}
  };
}

// Helper to create mock cuts
function createMockCuts() {
  return [
    {startTime: 0, endTime: 2, camera: 1},
    {startTime: 2, endTime: 4, camera: 2},
    {startTime: 4, endTime: 6, camera: 3}
  ];
}

// ============================================================================
// Constructor Tests
// ============================================================================

test('TimelineEditor constructor initializes correctly', () => {
  const editor = new TimelineEditor();
  expect(editor).toBeInstanceOf(TimelineEditor);
  expect(editor.progressCallback).toBe(null);
});

test('onProgress() sets callback function', () => {
  const editor = new TimelineEditor();
  const callback = () => {};
  editor.onProgress(callback);
  expect(editor.progressCallback).toBe(callback);
});

// ============================================================================
// applyEdits() Tests
// ============================================================================

test('applyEdits() returns success result structure', async () => {
  const editor = new TimelineEditor();
  const sequence = createMockSequence();
  const cuts = createMockCuts();
  const cameras = createMockCameras();

  const result = await editor.applyEdits(sequence, cuts, cameras);

  expect(result.success).toBeTruthy();
  expect(result.newSequenceName).toContain('_Multicam');
  expect(result.cutsApplied).toBe(3);
});

test('applyEdits() creates sequence with correct name', async () => {
  const editor = new TimelineEditor();
  const sequence = createMockSequence('My Video');
  const cuts = createMockCuts();
  const cameras = createMockCameras();

  const result = await editor.applyEdits(sequence, cuts, cameras);

  expect(result.newSequenceName).toBe('My Video_Multicam');
});

test('applyEdits() applies all cuts', async () => {
  const editor = new TimelineEditor();
  const sequence = createMockSequence();
  const cuts = createMockCuts();
  const cameras = createMockCameras();

  const result = await editor.applyEdits(sequence, cuts, cameras);

  expect(result.cutsApplied).toBe(cuts.length);
});

test('applyEdits() reports progress', async () => {
  const editor = new TimelineEditor();
  const sequence = createMockSequence();
  const cuts = createMockCuts();
  const cameras = createMockCameras();

  const progressReports = [];
  editor.onProgress((progress, message) => {
    progressReports.push({progress, message});
  });

  await editor.applyEdits(sequence, cuts, cameras);

  expect(progressReports.length).toBe(3);
  expect(progressReports[0].progress).toBeGreaterThan(0);
  expect(progressReports[2].progress).toBe(100);
});

test('applyEdits() handles errors gracefully', async () => {
  const editor = new TimelineEditor();

  // Create sequence that will cause error
  const badSequence = {
    name: 'Bad Sequence',
    videoTracks: null,  // Will cause error
    getSettings: () => ({}),
    getVideoTrack: async () => ({})
  };

  const cuts = createMockCuts();
  const cameras = createMockCameras();

  const result = await editor.applyEdits(badSequence, cuts, cameras);

  expect(result.success).toBe(false);
  expect(result.cutsApplied).toBe(0);
  expect(result.errors.length).toBeGreaterThan(0);
});

// ============================================================================
// createNewSequence() Tests
// ============================================================================

test('createNewSequence() creates sequence with correct name', async () => {
  const editor = new TimelineEditor();
  const template = createMockSequence();

  const newSequence = await editor.createNewSequence(template, 'New Sequence');

  expect(newSequence.name).toBe('New Sequence');
});

test('createNewSequence() preserves sequence settings', async () => {
  const editor = new TimelineEditor();
  const template = createMockSequence();

  const newSequence = await editor.createNewSequence(template, 'New Sequence');

  const settings = newSequence.getSettings();
  expect(settings.videoWidth).toBe(1920);
  expect(settings.videoHeight).toBe(1080);
});

// ============================================================================
// getCameraClips() Tests
// ============================================================================

test('getCameraClips() retrieves clips for all cameras', async () => {
  const editor = new TimelineEditor();
  const sequence = createMockSequence();
  const cameras = createMockCameras();

  const cameraClips = await editor.getCameraClips(sequence, cameras);

  expect(Object.keys(cameraClips).length).toBe(3);
  expect(cameraClips[1]).toBeTruthy();
  expect(cameraClips[2]).toBeTruthy();
  expect(cameraClips[3]).toBeTruthy();
});

test('getCameraClips() throws error if track not found', async () => {
  const editor = new TimelineEditor();
  const sequence = createMockSequence();

  // Camera with invalid track index
  const badCameras = {
    1: {trackIndex: 99, trackName: 'Invalid Camera'}
  };

  let errorThrown = false;
  try {
    await editor.getCameraClips(sequence, badCameras);
  } catch (error) {
    errorThrown = true;
    expect(error.message).toContain('Track 99 not found');
  }

  expect(errorThrown).toBeTruthy();
});

test('getCameraClips() throws error if no clips in track', async () => {
  const editor = new TimelineEditor();

  // Sequence with empty track
  const emptySequence = {
    name: 'Empty Sequence',
    videoTracks: [
      {index: 0, clips: []}  // Empty clips array
    ]
  };

  const cameras = {
    1: {trackIndex: 0, trackName: 'Camera 1'}
  };

  let errorThrown = false;
  try {
    await editor.getCameraClips(emptySequence, cameras);
  } catch (error) {
    errorThrown = true;
    expect(error.message).toContain('No clips found');
  }

  expect(errorThrown).toBeTruthy();
});

// ============================================================================
// applyCut() Tests
// ============================================================================

test('applyCut() does not throw with valid inputs', async () => {
  const editor = new TimelineEditor();
  const sequence = createMockSequence();
  const cameras = createMockCameras();
  const cameraClips = await editor.getCameraClips(sequence, cameras);

  const cut = {startTime: 0, endTime: 2, camera: 1};

  // Should not throw
  await editor.applyCut(sequence, cameraClips, cut);
});

test('applyCut() throws error if camera clip not found', async () => {
  const editor = new TimelineEditor();
  const sequence = createMockSequence();

  // Empty camera clips
  const emptyCameraClips = {};

  const cut = {startTime: 0, endTime: 2, camera: 1};

  let errorThrown = false;
  try {
    await editor.applyCut(sequence, emptyCameraClips, cut);
  } catch (error) {
    errorThrown = true;
    expect(error.message).toContain('No clip found for camera');
  }

  expect(errorThrown).toBeTruthy();
});

// ============================================================================
// Edge Cases
// ============================================================================

test('applyEdits() handles empty cuts array', async () => {
  const editor = new TimelineEditor();
  const sequence = createMockSequence();
  const emptyCuts = [];
  const cameras = createMockCameras();

  const result = await editor.applyEdits(sequence, emptyCuts, cameras);

  expect(result.success).toBeTruthy();
  expect(result.cutsApplied).toBe(0);
});

test('applyEdits() handles single cut', async () => {
  const editor = new TimelineEditor();
  const sequence = createMockSequence();
  const singleCut = [{startTime: 0, endTime: 5, camera: 1}];
  const cameras = createMockCameras();

  const result = await editor.applyEdits(sequence, singleCut, cameras);

  expect(result.success).toBeTruthy();
  expect(result.cutsApplied).toBe(1);
});

test('applyEdits() handles many cuts', async () => {
  const editor = new TimelineEditor();
  const sequence = createMockSequence();
  const cameras = createMockCameras();

  // Create 50 cuts
  const manyCuts = [];
  for (let i = 0; i < 50; i++) {
    manyCuts.push({
      startTime: i * 2,
      endTime: (i + 1) * 2,
      camera: (i % 3) + 1
    });
  }

  const result = await editor.applyEdits(sequence, manyCuts, cameras);

  expect(result.success).toBeTruthy();
  expect(result.cutsApplied).toBe(50);
});

// ============================================================================
// Manual Tests (documented)
// ============================================================================

test('[MANUAL] Sequence creation requires Premiere Pro testing', () => {
  console.log('  → Manual test: Run in Premiere Pro environment');
  console.log('  → Expected: New sequence appears in project panel');
  console.log('  → Expected: Sequence name ends with "_Multicam"');
  console.log('  → Expected: Clips are correctly trimmed and placed');
});

// ============================================================================
// Run tests
// ============================================================================

if (require.main === module) {
  runTests();
}

module.exports = {tests, runTests};
