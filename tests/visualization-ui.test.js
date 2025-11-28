/**
 * VisualizationUI Unit Tests
 *
 * Note: Visual rendering tests require manual verification in browser.
 * These tests verify basic functionality and error handling.
 *
 * @test VisualizationUI
 */

const VisualizationUI = require('../modules/VisualizationUI.js');

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
    toBeNull() {
      if (actual !== null) {
        throw new Error(`Expected null, got ${actual}`);
      }
    }
  };
}

async function runTests() {
  console.log('\n=== VisualizationUI Unit Tests ===\n');

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

// Helper to create mock canvas
function createMockCanvas() {
  const canvas = {
    width: 800,
    height: 300,
    getContext: function() {
      return {
        fillStyle: '',
        font: '',
        textAlign: 'left',
        fillRect: function() {},
        fillText: function() {},
        clearRect: function() {}
      };
    }
  };
  return canvas;
}

// Helper to create mock analysis result
function createMockAnalysisResult() {
  return {
    timeline: {
      0: {camera1: 0.8, camera2: 0.2, camera3: 0.1, activeCamera: 1},
      1: {camera1: 0.9, camera2: 0.1, camera3: 0.1, activeCamera: 1},
      2: {camera1: 0.2, camera2: 0.9, camera3: 0.1, activeCamera: 2},
      3: {camera1: 0.1, camera2: 0.8, camera3: 0.2, activeCamera: 2},
      4: {camera1: 0.1, camera2: 0.2, camera3: 0.9, activeCamera: 3}
    },
    duration: 5,
    sampleRate: 1.0
  };
}

// ============================================================================
// Constructor Tests
// ============================================================================

test('VisualizationUI constructor initializes correctly', () => {
  const canvas = createMockCanvas();
  const viz = new VisualizationUI(canvas);

  expect(viz).toBeInstanceOf(VisualizationUI);
  expect(viz.canvas).toBe(canvas);
  expect(viz.analysisResult).toBeNull();
});

test('VisualizationUI constructor throws error without canvas', () => {
  let errorThrown = false;
  try {
    new VisualizationUI(null);
  } catch (error) {
    errorThrown = true;
    expect(error.message).toBe('Canvas element is required');
  }
  expect(errorThrown).toBeTruthy();
});

// ============================================================================
// render() Tests
// ============================================================================

test('render() accepts valid analysis result', () => {
  const canvas = createMockCanvas();
  const viz = new VisualizationUI(canvas);
  const analysisResult = createMockAnalysisResult();

  // Should not throw
  viz.render(analysisResult);

  expect(viz.analysisResult).toBe(analysisResult);
});

test('render() handles empty timeline gracefully', () => {
  const canvas = createMockCanvas();
  const viz = new VisualizationUI(canvas);

  const emptyResult = {
    timeline: {},
    duration: 0,
    sampleRate: 1.0
  };

  // Should not throw
  viz.render(emptyResult);
});

test('render() handles invalid input gracefully', () => {
  const canvas = createMockCanvas();
  const viz = new VisualizationUI(canvas);

  // Should not throw
  viz.render(null);
  viz.render(undefined);
  viz.render({});
});

// ============================================================================
// getStatistics() Tests
// ============================================================================

test('getStatistics() returns null before rendering', () => {
  const canvas = createMockCanvas();
  const viz = new VisualizationUI(canvas);

  const stats = viz.getStatistics();
  expect(stats).toBeNull();
});

test('getStatistics() returns correct statistics after rendering', () => {
  const canvas = createMockCanvas();
  const viz = new VisualizationUI(canvas);
  const analysisResult = createMockAnalysisResult();

  viz.render(analysisResult);

  const stats = viz.getStatistics();

  expect(stats.duration).toBe(5);
  expect(stats.sampleRate).toBe(1.0);
  expect(stats.totalSamples).toBe(5);

  // Camera activity counts
  expect(stats.cameraActivity[1]).toBe(2);  // Timestamps 0, 1
  expect(stats.cameraActivity[2]).toBe(2);  // Timestamps 2, 3
  expect(stats.cameraActivity[3]).toBe(1);  // Timestamp 4

  // Percentages
  expect(stats.camera1Percentage).toBe('40.0');
  expect(stats.camera2Percentage).toBe('40.0');
  expect(stats.camera3Percentage).toBe('20.0');
});

// ============================================================================
// clear() Tests
// ============================================================================

test('clear() does not throw', () => {
  const canvas = createMockCanvas();
  const viz = new VisualizationUI(canvas);

  // Should not throw
  viz.clear();
});

// ============================================================================
// Edge Cases
// ============================================================================

test('render() handles single timestamp', () => {
  const canvas = createMockCanvas();
  const viz = new VisualizationUI(canvas);

  const singleTimestamp = {
    timeline: {
      0: {camera1: 0.8, camera2: 0.2, camera3: 0.1, activeCamera: 1}
    },
    duration: 1,
    sampleRate: 1.0
  };

  // Should not throw
  viz.render(singleTimestamp);

  const stats = viz.getStatistics();
  expect(stats.totalSamples).toBe(1);
});

test('render() handles many timestamps', () => {
  const canvas = createMockCanvas();
  const viz = new VisualizationUI(canvas);

  const timeline = {};
  for (let i = 0; i < 100; i++) {
    timeline[i] = {
      camera1: Math.random(),
      camera2: Math.random(),
      camera3: Math.random(),
      activeCamera: (i % 3) + 1
    };
  }

  const manyTimestamps = {
    timeline: timeline,
    duration: 100,
    sampleRate: 1.0
  };

  // Should not throw
  viz.render(manyTimestamps);

  const stats = viz.getStatistics();
  expect(stats.totalSamples).toBe(100);
});

// ============================================================================
// Manual Visual Tests (documented, not automated)
// ============================================================================

test('[MANUAL] Visual rendering requires browser testing', () => {
  console.log('  → Manual test: Open index.html in browser');
  console.log('  → Expected: Bar chart with 3 colored sections');
  console.log('  → Expected: Active camera indicator at bottom');
  console.log('  → Expected: Legend labels visible');
  console.log('  → Expected: Bars scale correctly with audio levels');
});

// ============================================================================
// Run tests
// ============================================================================

if (require.main === module) {
  runTests();
}

module.exports = {tests, runTests};
