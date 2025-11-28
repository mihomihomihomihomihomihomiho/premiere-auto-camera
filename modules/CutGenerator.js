/**
 * CutGenerator Module
 *
 * Purpose: Generate optimal cut points from audio analysis results
 * Algorithm: Minimum cut duration + frequency threshold
 *
 * @module CutGenerator
 */

/**
 * @typedef {Object} CutOptions
 * @property {number} minCutDuration - Minimum cut duration in seconds (default: 2.0)
 * @property {'low'|'medium'|'high'} cutFrequency - Cut frequency setting (default: 'medium')
 * @property {number} transitionDuration - Transition duration in seconds (default: 0.0)
 */

/**
 * @typedef {Object} Cut
 * @property {number} startTime - Cut start time in seconds
 * @property {number} endTime - Cut end time in seconds
 * @property {1|2|3} camera - Camera number for this cut
 */

/**
 * @typedef {Object} AnalysisResult
 * @property {Object.<number, TimelineData>} timeline - Timestamp-indexed audio data
 * @property {number} duration - Total analyzed duration in seconds
 * @property {number} sampleRate - Sample rate used in analysis
 */

class CutGenerator {
  constructor() {
    console.log('[CutGenerator] Initialized');
  }

  /**
   * Generate cuts from analysis result
   *
   * @param {AnalysisResult} analysisResult - Result from AudioAnalyzer
   * @param {CutOptions} options - Cut generation options
   * @returns {Cut[]} Array of cut points
   */
  generateCuts(analysisResult, options = {}) {
    const {
      minCutDuration = 2.0,
      cutFrequency = 'medium',
      transitionDuration = 0.0
    } = options;

    console.log('[CutGenerator] Generating cuts with options:', {
      minCutDuration,
      cutFrequency,
      transitionDuration
    });

    // Convert cutFrequency to threshold
    const threshold = this.frequencyToThreshold(cutFrequency);

    const cuts = [];
    let currentCut = null;

    // Sort timestamps
    const timestamps = Object.keys(analysisResult.timeline)
      .map(Number)
      .sort((a, b) => a - b);

    console.log(`[CutGenerator] Processing ${timestamps.length} timestamps`);

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
          // Current cut is long enough, commit it
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

    console.log(`[CutGenerator] Generated ${cuts.length} raw cuts`);

    // Apply frequency threshold (merge adjacent cuts if needed)
    const optimizedCuts = this.applyFrequencyThreshold(cuts, minCutDuration);

    console.log(`[CutGenerator] Final cuts after optimization: ${optimizedCuts.length}`);

    return optimizedCuts;
  }

  /**
   * Convert cutFrequency setting to threshold value
   *
   * Higher threshold = fewer cuts (more conservative)
   * Lower threshold = more cuts (more aggressive)
   *
   * @param {'low'|'medium'|'high'} frequency - Cut frequency setting
   * @returns {number} Threshold value
   */
  frequencyToThreshold(frequency) {
    const thresholds = {
      'high': 0.6,   // Frequent cuts (aggressive) - cut at 60% confidence
      'medium': 0.7, // Balanced (default) - cut at 70% confidence
      'low': 0.8     // Fewer cuts (conservative) - cut at 80% confidence
    };

    const threshold = thresholds[frequency] || thresholds['medium'];
    console.log(`[CutGenerator] Frequency '${frequency}' → threshold ${threshold}`);

    return threshold;
  }

  /**
   * Apply frequency threshold to reduce cut count
   *
   * Strategy: Merge adjacent cuts of the same camera if they're separated
   * by a very short cut (below minCutDuration) of another camera
   *
   * @param {Cut[]} cuts - Array of cuts
   * @param {number} minCutDuration - Minimum cut duration
   * @returns {Cut[]} Optimized cuts
   */
  applyFrequencyThreshold(cuts, minCutDuration) {
    if (cuts.length === 0) {
      return cuts;
    }

    console.log(`[CutGenerator] Checking for cuts below minCutDuration (${minCutDuration}s) to merge`);

    const optimized = [];
    let i = 0;

    while (i < cuts.length) {
      const current = cuts[i];

      // Check if next cut is below minCutDuration and can be merged
      if (i < cuts.length - 2) {
        const next = cuts[i + 1];
        const afterNext = cuts[i + 2];

        const nextDuration = next.endTime - next.startTime;

        // Only merge if next cut is below minCutDuration AND cameras before/after are the same
        // This preserves all cuts that meet the minimum duration requirement
        if (nextDuration < minCutDuration && current.camera === afterNext.camera) {
          // Merge current + afterNext (skip next)
          console.log(`[CutGenerator] Merging cuts at ${current.startTime}s and ${afterNext.startTime}s (skipping ${nextDuration}s cut, camera ${current.camera})`);

          optimized.push({
            startTime: current.startTime,
            endTime: afterNext.endTime,
            camera: current.camera
          });

          i += 3; // Skip current, next, and afterNext
          continue;
        }
      }

      // No merge, add current cut
      optimized.push(current);
      i++;
    }

    return optimized;
  }

  /**
   * Validate cuts array
   *
   * @param {Cut[]} cuts - Array of cuts to validate
   * @returns {{valid: boolean, errors: string[]}}
   */
  validateCuts(cuts) {
    const errors = [];

    if (!Array.isArray(cuts)) {
      errors.push('Cuts must be an array');
      return {valid: false, errors};
    }

    for (let i = 0; i < cuts.length; i++) {
      const cut = cuts[i];

      // Check required properties
      if (cut.startTime === undefined) {
        errors.push(`Cut ${i}: missing startTime`);
      }
      if (cut.endTime === undefined) {
        errors.push(`Cut ${i}: missing endTime`);
      }
      if (cut.camera === undefined) {
        errors.push(`Cut ${i}: missing camera`);
      }

      // Check valid values
      if (cut.startTime < 0) {
        errors.push(`Cut ${i}: startTime cannot be negative`);
      }
      if (cut.endTime < cut.startTime) {
        errors.push(`Cut ${i}: endTime must be >= startTime`);
      }
      if (![1, 2, 3].includes(cut.camera)) {
        errors.push(`Cut ${i}: camera must be 1, 2, or 3`);
      }

      // Check continuity
      if (i > 0) {
        const prevCut = cuts[i - 1];
        if (cut.startTime < prevCut.endTime) {
          errors.push(`Cut ${i}: overlaps with previous cut`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Get statistics about generated cuts
   *
   * @param {Cut[]} cuts - Array of cuts
   * @returns {Object} Statistics
   */
  getStatistics(cuts) {
    if (cuts.length === 0) {
      return {
        totalCuts: 0,
        totalDuration: 0,
        averageCutDuration: 0,
        cameraUsage: {1: 0, 2: 0, 3: 0},
        shortestCut: null,
        longestCut: null
      };
    }

    let totalDuration = 0;
    const cameraUsage = {1: 0, 2: 0, 3: 0};
    let shortestCut = cuts[0];
    let longestCut = cuts[0];

    for (const cut of cuts) {
      const duration = cut.endTime - cut.startTime;
      totalDuration += duration;

      cameraUsage[cut.camera] += duration;

      const shortestDuration = shortestCut.endTime - shortestCut.startTime;
      const longestDuration = longestCut.endTime - longestCut.startTime;

      if (duration < shortestDuration) {
        shortestCut = cut;
      }
      if (duration > longestDuration) {
        longestCut = cut;
      }
    }

    return {
      totalCuts: cuts.length,
      totalDuration: totalDuration,
      averageCutDuration: totalDuration / cuts.length,
      cameraUsage: cameraUsage,
      shortestCut: {
        ...shortestCut,
        duration: shortestCut.endTime - shortestCut.startTime
      },
      longestCut: {
        ...longestCut,
        duration: longestCut.endTime - longestCut.startTime
      }
    };
  }
}

// Export for use in main.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CutGenerator;
}
