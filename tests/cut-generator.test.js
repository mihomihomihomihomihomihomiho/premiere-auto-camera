/**
 * CutGenerator Unit Tests
 *
 * Comprehensive tests for cut generation logic
 *
 * @test CutGenerator
 */

const CutGenerator = require('../modules/CutGenerator.js');

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
    toContain(expected) {
      if (!actual.includes(expected)) {
        throw new Error(`Expected to contain ${expected}`);
      }
    }
  };
}

async function runTests() {
  console.log('\n=== CutGenerator Unit Tests ===\n');

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

// Helper function to create mock analysis result
function createMockAnalysisResult(timeline, duration) {
  return {
    timeline: timeline,
    duration: duration || Math.max(...Object.keys(timeline).map(Number)) + 1,
    sampleRate: 1.0
  };
}

// ============================================================================
// Constructor and Basic Tests
// ============================================================================

test('CutGenerator constructor initializes correctly', () => {
  const generator = new CutGenerator();
  expect(generator).toBeInstanceOf(CutGenerator);
});

test('frequencyToThreshold() returns correct values', () => {
  const generator = new CutGenerator();

  expect(generator.frequencyToThreshold('high')).toBe(0.6);
  expect(generator.frequencyToThreshold('medium')).toBe(0.7);
  expect(generator.frequencyToThreshold('low')).toBe(0.8);

  // Default to medium for unknown values
  expect(generator.frequencyToThreshold('unknown')).toBe(0.7);
});

// ============================================================================
// generateCuts() Tests
// ============================================================================

test('generateCuts() generates single cut for single camera', () => {
  const generator = new CutGenerator();

  const timeline = {
    0: {camera1: 0.8, camera2: 0.2, camera3: 0.1, activeCamera: 1},
    1: {camera1: 0.9, camera2: 0.1, camera3: 0.1, activeCamera: 1},
    2: {camera1: 0.7, camera2: 0.2, camera3: 0.2, activeCamera: 1}
  };

  const analysisResult = createMockAnalysisResult(timeline, 3);
  const cuts = generator.generateCuts(analysisResult);

  expect(cuts.length).toBe(1);
  expect(cuts[0].camera).toBe(1);
  expect(cuts[0].startTime).toBe(0);
  expect(cuts[0].endTime).toBe(3);
});

test('generateCuts() enforces minimum cut duration', () => {
  const generator = new CutGenerator();

  const timeline = {
    0: {camera1: 0.8, camera2: 0.2, camera3: 0.1, activeCamera: 1},
    1: {camera1: 0.2, camera2: 0.9, camera3: 0.1, activeCamera: 2}, // Short switch
    2: {camera1: 0.9, camera2: 0.1, camera3: 0.1, activeCamera: 1},
    3: {camera1: 0.8, camera2: 0.2, camera3: 0.1, activeCamera: 1}
  };

  const analysisResult = createMockAnalysisResult(timeline, 4);
  const cuts = generator.generateCuts(analysisResult, {minCutDuration: 2.0});

  // Should ignore the 1-second camera 2 switch (too short)
  expect(cuts.length).toBe(1);
  expect(cuts[0].camera).toBe(1);
});

test('generateCuts() creates multiple cuts when duration allows', () => {
  const generator = new CutGenerator();

  const timeline = {
    0: {camera1: 0.8, camera2: 0.2, camera3: 0.1, activeCamera: 1},
    1: {camera1: 0.9, camera2: 0.1, camera3: 0.1, activeCamera: 1},
    2: {camera1: 0.2, camera2: 0.9, camera3: 0.1, activeCamera: 2},
    3: {camera1: 0.1, camera2: 0.8, camera3: 0.2, activeCamera: 2},
    4: {camera1: 0.1, camera2: 0.2, camera3: 0.9, activeCamera: 3},
    5: {camera1: 0.2, camera2: 0.1, camera3: 0.8, activeCamera: 3}
  };

  const analysisResult = createMockAnalysisResult(timeline, 6);
  const cuts = generator.generateCuts(analysisResult, {minCutDuration: 2.0});

  expect(cuts.length).toBe(3);
  expect(cuts[0].camera).toBe(1);
  expect(cuts[1].camera).toBe(2);
  expect(cuts[2].camera).toBe(3);
});

test('generateCuts() handles alternating cameras', () => {
  const generator = new CutGenerator();

  const timeline = {
    0: {camera1: 0.8, camera2: 0.2, camera3: 0.1, activeCamera: 1},
    1: {camera1: 0.9, camera2: 0.1, camera3: 0.1, activeCamera: 1},
    2: {camera1: 0.2, camera2: 0.9, camera3: 0.1, activeCamera: 2},
    3: {camera1: 0.1, camera2: 0.8, camera3: 0.2, activeCamera: 2},
    4: {camera1: 0.9, camera2: 0.1, camera3: 0.1, activeCamera: 1},
    5: {camera1: 0.8, camera2: 0.2, camera3: 0.1, activeCamera: 1}
  };

  const analysisResult = createMockAnalysisResult(timeline, 6);
  const cuts = generator.generateCuts(analysisResult, {minCutDuration: 2.0});

  expect(cuts.length).toBe(3);
  expect(cuts[0].camera).toBe(1);
  expect(cuts[1].camera).toBe(2);
  expect(cuts[2].camera).toBe(1);
});

test('generateCuts() with cutFrequency=high generates more cuts', () => {
  const generator = new CutGenerator();

  const timeline = {
    0: {camera1: 0.8, camera2: 0.2, camera3: 0.1, activeCamera: 1},
    1: {camera1: 0.9, camera2: 0.1, camera3: 0.1, activeCamera: 1},
    2: {camera1: 0.2, camera2: 0.9, camera3: 0.1, activeCamera: 2},
    3: {camera1: 0.9, camera2: 0.1, camera3: 0.1, activeCamera: 1},
    4: {camera1: 0.8, camera2: 0.2, camera3: 0.1, activeCamera: 1},
    5: {camera1: 0.2, camera2: 0.9, camera3: 0.1, activeCamera: 2},
    6: {camera1: 0.9, camera2: 0.1, camera3: 0.1, activeCamera: 1}
  };

  const analysisResult = createMockAnalysisResult(timeline, 7);

  const cutsHigh = generator.generateCuts(analysisResult, {
    minCutDuration: 1.0,
    cutFrequency: 'high'
  });

  const cutsLow = generator.generateCuts(analysisResult, {
    minCutDuration: 1.0,
    cutFrequency: 'low'
  });

  // High frequency should have more or equal cuts than low frequency
  expect(cutsHigh.length).toBeGreaterThan(cutsLow.length - 1);
});

// ============================================================================
// applyFrequencyThreshold() Tests
// ============================================================================

test('applyFrequencyThreshold() merges short intermediate cuts', () => {
  const generator = new CutGenerator();

  const cuts = [
    {startTime: 0, endTime: 3, camera: 1},
    {startTime: 3, endTime: 3.5, camera: 2},  // Short cut (0.5s < 2.0s minCutDuration)
    {startTime: 3.5, endTime: 6, camera: 1}
  ];

  const optimized = generator.applyFrequencyThreshold(cuts, 2.0);

  // Should merge camera 1 cuts (before and after short camera 2)
  expect(optimized.length).toBe(1);
  expect(optimized[0].camera).toBe(1);
  expect(optimized[0].startTime).toBe(0);
  expect(optimized[0].endTime).toBe(6);
});

test('applyFrequencyThreshold() does not merge when cameras differ', () => {
  const generator = new CutGenerator();

  const cuts = [
    {startTime: 0, endTime: 3, camera: 1},
    {startTime: 3, endTime: 3.5, camera: 2},  // Short cut
    {startTime: 3.5, endTime: 6, camera: 3}   // Different camera
  ];

  const optimized = generator.applyFrequencyThreshold(cuts, 2.0);

  // Should NOT merge (cameras are different)
  expect(optimized.length).toBe(3);
});

test('applyFrequencyThreshold() handles empty array', () => {
  const generator = new CutGenerator();

  const cuts = [];
  const optimized = generator.applyFrequencyThreshold(cuts, 2.0);

  expect(optimized.length).toBe(0);
});

// ============================================================================
// validateCuts() Tests
// ============================================================================

test('validateCuts() accepts valid cuts', () => {
  const generator = new CutGenerator();

  const cuts = [
    {startTime: 0, endTime: 2, camera: 1},
    {startTime: 2, endTime: 4, camera: 2},
    {startTime: 4, endTime: 6, camera: 3}
  ];

  const result = generator.validateCuts(cuts);

  expect(result.valid).toBe(true);
  expect(result.errors.length).toBe(0);
});

test('validateCuts() detects missing properties', () => {
  const generator = new CutGenerator();

  const cuts = [
    {startTime: 0, endTime: 2},  // Missing camera
  ];

  const result = generator.validateCuts(cuts);

  expect(result.valid).toBe(false);
  expect(result.errors.length).toBeGreaterThan(0);
  expect(result.errors[0]).toContain('missing camera');
});

test('validateCuts() detects invalid camera numbers', () => {
  const generator = new CutGenerator();

  const cuts = [
    {startTime: 0, endTime: 2, camera: 4},  // Invalid camera
  ];

  const result = generator.validateCuts(cuts);

  expect(result.valid).toBe(false);
  expect(result.errors.length).toBeGreaterThan(0);
});

test('validateCuts() detects overlapping cuts', () => {
  const generator = new CutGenerator();

  const cuts = [
    {startTime: 0, endTime: 3, camera: 1},
    {startTime: 2, endTime: 5, camera: 2},  // Overlaps with previous
  ];

  const result = generator.validateCuts(cuts);

  expect(result.valid).toBe(false);
  expect(result.errors.length).toBeGreaterThan(0);
  expect(result.errors[0]).toContain('overlaps');
});

test('validateCuts() detects end before start', () => {
  const generator = new CutGenerator();

  const cuts = [
    {startTime: 5, endTime: 2, camera: 1},  // End before start
  ];

  const result = generator.validateCuts(cuts);

  expect(result.valid).toBe(false);
  expect(result.errors.length).toBeGreaterThan(0);
});

// ============================================================================
// getStatistics() Tests
// ============================================================================

test('getStatistics() returns correct statistics', () => {
  const generator = new CutGenerator();

  const cuts = [
    {startTime: 0, endTime: 2, camera: 1},
    {startTime: 2, endTime: 5, camera: 2},
    {startTime: 5, endTime: 6, camera: 3}
  ];

  const stats = generator.getStatistics(cuts);

  expect(stats.totalCuts).toBe(3);
  expect(stats.totalDuration).toBe(6);
  expect(stats.averageCutDuration).toBe(2);

  expect(stats.cameraUsage[1]).toBe(2);
  expect(stats.cameraUsage[2]).toBe(3);
  expect(stats.cameraUsage[3]).toBe(1);

  expect(stats.shortestCut.duration).toBe(1);
  expect(stats.longestCut.duration).toBe(3);
});

test('getStatistics() handles empty array', () => {
  const generator = new CutGenerator();

  const cuts = [];
  const stats = generator.getStatistics(cuts);

  expect(stats.totalCuts).toBe(0);
  expect(stats.totalDuration).toBe(0);
  expect(stats.averageCutDuration).toBe(0);
});

// ============================================================================
// Edge Cases
// ============================================================================

test('generateCuts() handles very short sequence', () => {
  const generator = new CutGenerator();

  const timeline = {
    0: {camera1: 0.8, camera2: 0.2, camera3: 0.1, activeCamera: 1}
  };

  const analysisResult = createMockAnalysisResult(timeline, 1);
  const cuts = generator.generateCuts(analysisResult, {minCutDuration: 0.5});

  expect(cuts.length).toBe(1);
  expect(cuts[0].camera).toBe(1);
});

test('generateCuts() handles very long sequence', () => {
  const generator = new CutGenerator();

  const timeline = {};
  for (let i = 0; i < 100; i++) {
    timeline[i] = {
      camera1: Math.random(),
      camera2: Math.random(),
      camera3: Math.random(),
      activeCamera: (i % 3) + 1
    };
  }

  const analysisResult = createMockAnalysisResult(timeline, 100);
  const cuts = generator.generateCuts(analysisResult, {minCutDuration: 2.0});

  expect(cuts.length).toBeGreaterThan(0);

  // Validate generated cuts
  const validation = generator.validateCuts(cuts);
  expect(validation.valid).toBe(true);
});

// ============================================================================
// Run tests
// ============================================================================

if (require.main === module) {
  runTests();
}

module.exports = {tests, runTests};
