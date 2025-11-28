/**
 * VisualizationUI Module
 *
 * Purpose: Render audio level visualization on Canvas
 * Algorithm: Bar chart showing camera audio levels over time
 *
 * @module VisualizationUI
 */

/**
 * @typedef {Object} AnalysisResult
 * @property {Object.<number, TimelineData>} timeline - Timestamp-indexed audio data
 * @property {number} duration - Total analyzed duration in seconds
 * @property {number} sampleRate - Sample rate used in analysis
 */

/**
 * @typedef {Object} TimelineData
 * @property {number} camera1 - Audio level for camera 1 (0.0-1.0)
 * @property {number} camera2 - Audio level for camera 2 (0.0-1.0)
 * @property {number} camera3 - Audio level for camera 3 (0.0-1.0)
 * @property {1|2|3} activeCamera - Camera with highest audio level
 */

class VisualizationUI {
  /**
   * @param {HTMLCanvasElement} canvasElement - Canvas element for rendering
   */
  constructor(canvasElement) {
    if (!canvasElement) {
      throw new Error('Canvas element is required');
    }

    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.analysisResult = null;

    console.log('[VisualizationUI] Initialized');
  }

  /**
   * Render analysis result to canvas
   *
   * Creates a bar chart visualization showing:
   * - Audio levels for each camera over time
   * - Active camera indicator at bottom
   * - Color-coded legend
   *
   * @param {AnalysisResult} analysisResult - Result from AudioAnalyzer
   */
  render(analysisResult) {
    if (!analysisResult || !analysisResult.timeline) {
      console.error('[VisualizationUI] Invalid analysis result');
      return;
    }

    this.analysisResult = analysisResult;

    const width = this.canvas.width;
    const height = this.canvas.height;

    console.log(`[VisualizationUI] Rendering graph (${width}x${height})`);

    // Clear canvas
    this.ctx.fillStyle = '#1e1e1e';
    this.ctx.fillRect(0, 0, width, height);

    // Get timestamps
    const timestamps = Object.keys(analysisResult.timeline)
      .map(Number)
      .sort((a, b) => a - b);

    if (timestamps.length === 0) {
      console.warn('[VisualizationUI] No timeline data to render');
      this.drawEmptyState(width, height);
      return;
    }

    const barWidth = width / timestamps.length;
    const maxHeight = height - 40;  // Leave room for labels

    console.log(`[VisualizationUI] Drawing ${timestamps.length} bars (width: ${barWidth.toFixed(2)}px each)`);

    // Draw bars for each timestamp
    timestamps.forEach((timestamp, index) => {
      const data = analysisResult.timeline[timestamp];
      const x = index * barWidth;

      // Draw camera 1 (blue) - top third
      this.drawBar(x, barWidth, data.camera1, maxHeight, '#3498db', 0);

      // Draw camera 2 (green) - middle third
      this.drawBar(x, barWidth, data.camera2, maxHeight, '#2ecc71', maxHeight / 3);

      // Draw camera 3 (orange) - bottom third
      this.drawBar(x, barWidth, data.camera3, maxHeight, '#e67e22', (maxHeight / 3) * 2);

      // Highlight active camera at bottom
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

    console.log('[VisualizationUI] Rendering complete');
  }

  /**
   * Draw single bar for a camera's audio level
   *
   * @param {number} x - X position (left edge of bar)
   * @param {number} barWidth - Width of the bar
   * @param {number} level - Audio level (0.0-1.0)
   * @param {number} maxHeight - Maximum available height
   * @param {string} color - Bar color (hex)
   * @param {number} yOffset - Vertical offset for this camera's section
   * @private
   */
  drawBar(x, barWidth, level, maxHeight, color, yOffset) {
    // Each camera gets 1/3 of the height
    const sectionHeight = maxHeight / 3;
    const barHeight = level * sectionHeight;

    // Calculate Y position (bars grow upward from bottom of section)
    const y = yOffset + sectionHeight - barHeight;

    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, barWidth - 1, barHeight);  // -1 for spacing between bars
  }

  /**
   * Draw legend showing camera colors and labels
   *
   * @param {number} width - Canvas width
   * @param {number} height - Canvas height
   * @private
   */
  drawLegend(width, height) {
    this.ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
    this.ctx.fillStyle = '#d4d4d4';

    // Camera labels on left
    this.ctx.fillText('Camera 1', 10, 20);
    this.ctx.fillText('Camera 2', 10, height / 3 + 20);
    this.ctx.fillText('Camera 3', 10, (height / 3) * 2 + 20);

    // Active camera indicator label
    this.ctx.fillText('Active', width - 60, height - 20);
  }

  /**
   * Draw empty state when no data is available
   *
   * @param {number} width - Canvas width
   * @param {number} height - Canvas height
   * @private
   */
  drawEmptyState(width, height) {
    this.ctx.font = '14px -apple-system, BlinkMacSystemFont, sans-serif';
    this.ctx.fillStyle = '#999';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('No audio data to visualize', width / 2, height / 2);
    this.ctx.textAlign = 'left';  // Reset alignment
  }

  /**
   * Clear the canvas
   */
  clear() {
    const width = this.canvas.width;
    const height = this.canvas.height;

    this.ctx.fillStyle = '#1e1e1e';
    this.ctx.fillRect(0, 0, width, height);

    console.log('[VisualizationUI] Canvas cleared');
  }

  /**
   * Get analysis result statistics for display
   *
   * @returns {Object|null} Statistics or null if no data
   */
  getStatistics() {
    if (!this.analysisResult) {
      return null;
    }

    const timestamps = Object.keys(this.analysisResult.timeline);
    const cameraActivity = {1: 0, 2: 0, 3: 0};

    // Count how many timestamps each camera was active
    timestamps.forEach(timestamp => {
      const data = this.analysisResult.timeline[timestamp];
      cameraActivity[data.activeCamera]++;
    });

    return {
      duration: this.analysisResult.duration,
      sampleRate: this.analysisResult.sampleRate,
      totalSamples: timestamps.length,
      cameraActivity: cameraActivity,
      camera1Percentage: (cameraActivity[1] / timestamps.length * 100).toFixed(1),
      camera2Percentage: (cameraActivity[2] / timestamps.length * 100).toFixed(1),
      camera3Percentage: (cameraActivity[3] / timestamps.length * 100).toFixed(1)
    };
  }
}

// Export for use in main.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VisualizationUI;
}
