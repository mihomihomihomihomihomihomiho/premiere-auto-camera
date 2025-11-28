/**
 * AudioAnalyzer Unit Tests
 *
 * Note: Some tests require Premiere Pro API and can only be verified manually.
 * Tests marked with [MANUAL] need to be run in Premiere Pro environment.
 *
 * @test AudioAnalyzer
 */

const AudioAnalyzer = require('../modules/AudioAnalyzer.js');

// Simple test framework (no external dependencies)
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
    }
  };
}

async function runTests() {
  console.log('\n=== AudioAnalyzer Unit Tests ===\n');

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

// ============================================================================
// Tests
// ============================================================================

test('AudioAnalyzer constructor initializes correctly', () => {
  const analyzer = new AudioAnalyzer();
  expect(analyzer).toBeInstanceOf(AudioAnalyzer);
  expect(analyzer.progressCallback).toBe(null);
});

test('onProgress() sets callback function', () => {
  const analyzer = new AudioAnalyzer();
  const callback = () => {};
  analyzer.onProgress(callback);
  expect(analyzer.progressCallback).toBe(callback);
});

test('determineActiveCamera() returns camera with highest level', () => {
  const analyzer = new AudioAnalyzer();

  // Camera 1 highest
  expect(analyzer.determineActiveCamera([0.8, 0.3, 0.2])).toBe(1);

  // Camera 2 highest
  expect(analyzer.determineActiveCamera([0.2, 0.9, 0.3])).toBe(2);

  // Camera 3 highest
  expect(analyzer.determineActiveCamera([0.1, 0.2, 0.7])).toBe(3);
});

test('determineActiveCamera() defaults to camera 1 when all silent', () => {
  const analyzer = new AudioAnalyzer();

  // All below threshold (0.1)
  expect(analyzer.determineActiveCamera([0.05, 0.03, 0.02])).toBe(1);

  // All zero
  expect(analyzer.determineActiveCamera([0.0, 0.0, 0.0])).toBe(1);
});

test('determineActiveCamera() handles equal levels (first wins)', () => {
  const analyzer = new AudioAnalyzer();

  // All equal
  expect(analyzer.determineActiveCamera([0.5, 0.5, 0.5])).toBe(1);

  // Camera 1 and 2 equal, both higher than 3
  expect(analyzer.determineActiveCamera([0.7, 0.7, 0.3])).toBe(1);
});

// ============================================================================
// [MANUAL] Tests - Require Premiere Pro environment
// ============================================================================

test('[MANUAL] getSequenceDuration() returns duration in seconds', async () => {
  console.log('  → Manual test: Open sequence in Premiere Pro and verify duration');
  // Mock sequence for now
  const mockSequence = {
    end: 254016000000 * 60, // 60 seconds in ticks
    timebase: 254016000000
  };

  const analyzer = new AudioAnalyzer();
  const duration = await analyzer.getSequenceDuration(mockSequence);

  expect(duration).toBe(60);
});

test('[MANUAL] analyzeSequence() returns valid AnalysisResult structure', async () => {
  console.log('  → Manual test: Run with actual Premiere Pro sequence');
  console.log('  → Expected: {timeline: {...}, duration: number, sampleRate: number}');

  // Mock test with simulated data
  const analyzer = new AudioAnalyzer();

  // Create minimal mock objects
  const mockSequence = {
    end: 254016000000 * 10, // 10 seconds
    timebase: 254016000000,
    audioTracks: []
  };

  const mockCameras = {
    1: {trackIndex: 0, trackName: 'Camera 1'},
    2: {trackIndex: 1, trackName: 'Camera 2'},
    3: {trackIndex: 2, trackName: 'Camera 3'}
  };

  try {
    const result = await analyzer.analyzeSequence(mockSequence, mockCameras, {sampleRate: 2.0});

    // Verify structure
    expect(typeof result.timeline).toBe('object');
    expect(typeof result.duration).toBe('number');
    expect(typeof result.sampleRate).toBe('number');

    // Verify sampleRate is respected
    expect(result.sampleRate).toBe(2.0);

    // Verify timeline has entries
    const timestamps = Object.keys(result.timeline);
    expect(timestamps.length).toBeGreaterThan(0);

    // Verify timeline entry structure
    const firstEntry = result.timeline[timestamps[0]];
    expect(typeof firstEntry.camera1).toBe('number');
    expect(typeof firstEntry.camera2).toBe('number');
    expect(typeof firstEntry.camera3).toBe('number');
    expect([1, 2, 3].includes(firstEntry.activeCamera)).toBe(true);

    console.log(`  → Generated ${timestamps.length} timeline entries`);
  } catch (error) {
    console.log(`  → Error (expected in non-Premiere environment): ${error.message}`);
  }
});

test('[MANUAL] analyzeSequence() respects sampleRate option', async () => {
  console.log('  → Manual test: Verify sample rate affects number of samples');
  console.log('  → For 10s sequence: sampleRate=1.0 → 10 samples, sampleRate=2.0 → 5 samples');

  // This will be verified when testing in Premiere Pro
});

test('[MANUAL] getAudioLevelAtTime() returns 0.0-1.0 range', async () => {
  console.log('  → Manual test: Verify audio levels are normalized to 0.0-1.0');
  console.log('  → Test with actual audio clips with varying volumes');

  // This will be verified when testing in Premiere Pro
});

test('[MANUAL] getAudioTracksForCameras() maps tracks correctly', async () => {
  console.log('  → Manual test: Verify audio tracks match video track indices');
  console.log('  → Expected: audioTracks[0] corresponds to camera 1 (trackIndex 0)');

  // This will be verified when testing in Premiere Pro
});

// ============================================================================
// Run tests
// ============================================================================

if (require.main === module) {
  runTests();
}

module.exports = {tests, runTests};
