/**
 * AudioAnalyzer Module
 *
 * Purpose: Extract audio metadata and identify active speaker at each timestamp
 * Algorithm: Volume-based speaker detection using Premiere Pro audio metadata
 *
 * @module AudioAnalyzer
 */

/**
 * @typedef {Object} AnalysisOptions
 * @property {number} sampleRate - Sampling rate in seconds (default: 1.0)
 */

/**
 * @typedef {Object} TimelineData
 * @property {number} camera1 - Audio level for camera 1 (0.0-1.0)
 * @property {number} camera2 - Audio level for camera 2 (0.0-1.0)
 * @property {number} camera3 - Audio level for camera 3 (0.0-1.0)
 * @property {1|2|3} activeCamera - Camera with highest audio level
 */

/**
 * @typedef {Object} AnalysisResult
 * @property {Object.<number, TimelineData>} timeline - Timestamp-indexed audio data
 * @property {number} duration - Total analyzed duration in seconds
 * @property {number} sampleRate - Sample rate used in analysis
 */

class AudioAnalyzer {
  constructor() {
    /**
     * @type {Function|null}
     * @private
     */
    this.progressCallback = null;

    console.log('[AudioAnalyzer] Initialized');
  }

  /**
   * Main analysis function
   *
   * @param {Object} sequence - Premiere Pro sequence object
   * @param {Object} cameras - Camera configuration {1: {trackIndex, trackName}, 2: {...}, 3: {...}}
   * @param {AnalysisOptions} options - Analysis options
   * @returns {Promise<AnalysisResult>}
   */
  async analyzeSequence(sequence, cameras, options = {}) {
    const sampleRate = options.sampleRate || 1.0;
    console.log(`[AudioAnalyzer] Starting analysis with sample rate: ${sampleRate}s`);

    try {
      // Get sequence duration
      const duration = await this.getSequenceDuration(sequence);
      console.log(`[AudioAnalyzer] Sequence duration: ${duration}s`);

      // Get audio tracks for each camera
      const audioTracks = await this.getAudioTracksForCameras(sequence, cameras);
      console.log('[AudioAnalyzer] Audio tracks retrieved');

      // Sample audio levels at regular intervals
      const timeline = {};
      const totalSamples = Math.ceil(duration / sampleRate);
      console.log(`[AudioAnalyzer] Total samples to process: ${totalSamples}`);

      for (let i = 0; i < totalSamples; i++) {
        const timestamp = i * sampleRate;

        // Get audio level for each camera at this timestamp
        const levels = await Promise.all([
          this.getAudioLevelAtTime(audioTracks[1], timestamp, sequence),
          this.getAudioLevelAtTime(audioTracks[2], timestamp, sequence),
          this.getAudioLevelAtTime(audioTracks[3], timestamp, sequence)
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
          this.progressCallback(
            progress,
            `Analyzing audio: ${Math.round(progress)}% (${i + 1}/${totalSamples})`
          );
        }
      }

      console.log('[AudioAnalyzer] Analysis complete');

      return {
        timeline: timeline,
        duration: duration,
        sampleRate: sampleRate
      };

    } catch (error) {
      console.error('[AudioAnalyzer] Analysis failed:', error);
      throw error;
    }
  }

  /**
   * Get sequence duration in seconds
   *
   * @param {Object} sequence - Premiere Pro sequence
   * @returns {Promise<number>} Duration in seconds
   * @private
   */
  async getSequenceDuration(sequence) {
    try {
      // Try to get duration from sequence end time
      // UXP API: sequence.end returns time in ticks
      // We need to convert to seconds

      if (sequence.end !== undefined) {
        // Premiere Pro uses ticks (254016000000 ticks = 1 second at 24fps)
        const ticksPerSecond = sequence.timebase || 254016000000;
        const durationInSeconds = sequence.end / ticksPerSecond;
        return durationInSeconds;
      }

      // Fallback: Try to get from sequence properties
      if (sequence.getSettings) {
        const settings = await sequence.getSettings();
        if (settings.videoFrameRate && settings.videoFrameCount) {
          return settings.videoFrameCount / settings.videoFrameRate.num * settings.videoFrameRate.den;
        }
      }

      // Default fallback: 60 seconds (for testing)
      console.warn('[AudioAnalyzer] Could not determine sequence duration, using default: 60s');
      return 60;

    } catch (error) {
      console.error('[AudioAnalyzer] Error getting duration:', error);
      // Fallback
      return 60;
    }
  }

  /**
   * Get audio tracks for each camera
   *
   * @param {Object} sequence - Premiere Pro sequence
   * @param {Object} cameras - Camera configuration
   * @returns {Promise<Object>} Audio tracks {1: track, 2: track, 3: track}
   * @private
   */
  async getAudioTracksForCameras(sequence, cameras) {
    try {
      // Get all audio tracks from sequence
      let audioTracks = null;

      // Try different API methods
      if (typeof sequence.getAudioTracks === 'function') {
        audioTracks = await sequence.getAudioTracks();
      } else if (sequence.audioTracks) {
        audioTracks = sequence.audioTracks;
      }

      if (!audioTracks) {
        throw new Error('No audio tracks found in sequence');
      }

      // Convert to array if needed
      let audioTracksArray = [];
      if (Array.isArray(audioTracks)) {
        audioTracksArray = audioTracks;
      } else if (audioTracks.length !== undefined) {
        audioTracksArray = Array.from({length: audioTracks.length}, (_, i) => audioTracks[i]);
      } else if (audioTracks.numTracks !== undefined && typeof audioTracks.getItemAt === 'function') {
        audioTracksArray = Array.from({length: audioTracks.numTracks}, (_, i) => audioTracks.getItemAt(i));
      }

      console.log(`[AudioAnalyzer] Found ${audioTracksArray.length} audio tracks`);

      // Map camera track indices to audio tracks
      // Assumption: audio track index corresponds to video track index
      const result = {
        1: audioTracksArray[cameras[1].trackIndex],
        2: audioTracksArray[cameras[2].trackIndex],
        3: audioTracksArray[cameras[3].trackIndex]
      };

      return result;

    } catch (error) {
      console.error('[AudioAnalyzer] Error getting audio tracks:', error);
      throw error;
    }
  }

  /**
   * Get audio level at specific timestamp
   *
   * PoC: This is the critical function that needs API verification
   * Multiple strategies attempted in order of preference
   *
   * @param {Object} audioTrack - Premiere Pro audio track
   * @param {number} timestamp - Time in seconds
   * @param {Object} sequence - Premiere Pro sequence (for clip access)
   * @returns {Promise<number>} Audio level 0.0-1.0
   * @private
   */
  async getAudioLevelAtTime(audioTrack, timestamp, sequence) {
    try {
      // Strategy 1: Direct audio level API (ideal, but may not exist)
      if (typeof audioTrack.getAudioLevels === 'function') {
        const levels = await audioTrack.getAudioLevels(timestamp, timestamp + 0.1);
        if (levels && levels.length > 0) {
          // Average the levels
          const avg = levels.reduce((sum, level) => sum + level, 0) / levels.length;
          return Math.min(1.0, Math.max(0.0, avg));
        }
      }

      // Strategy 2: Get clip at timestamp and use its volume as proxy
      const clip = await this.getClipAtTime(audioTrack, timestamp);
      if (clip) {
        // Try to get volume/gain from clip
        let volume = 1.0;

        if (clip.audioChannelMapping && clip.audioChannelMapping.volume !== undefined) {
          volume = clip.audioChannelMapping.volume;
        } else if (typeof clip.getVolume === 'function') {
          volume = await clip.getVolume();
        } else if (clip.volume !== undefined) {
          volume = clip.volume;
        }

        // Normalize to 0.0-1.0 range
        // Premiere Pro volume is typically in dB or 0-1 linear scale
        // For now, assume 0-1 scale
        return Math.min(1.0, Math.max(0.0, volume));
      }

      // Strategy 3: Fallback - simulate based on timestamp (for testing only)
      // This generates a simple sine wave pattern for demo purposes
      const simulated = Math.abs(Math.sin(timestamp / 5)) * 0.8;
      console.warn(`[AudioAnalyzer] Using simulated audio level at ${timestamp}s: ${simulated.toFixed(2)}`);
      return simulated;

    } catch (error) {
      console.warn(`[AudioAnalyzer] Failed to get audio level at ${timestamp}s:`, error);
      return 0.0;
    }
  }

  /**
   * Get clip at specific time in audio track
   *
   * @param {Object} audioTrack - Premiere Pro audio track
   * @param {number} timestamp - Time in seconds
   * @returns {Promise<Object|null>} Clip or null
   * @private
   */
  async getClipAtTime(audioTrack, timestamp) {
    try {
      // Get clips from audio track
      let clips = null;

      if (typeof audioTrack.getClips === 'function') {
        clips = await audioTrack.getClips();
      } else if (audioTrack.clips) {
        clips = audioTrack.clips;
      }

      if (!clips) {
        return null;
      }

      // Convert to array
      let clipsArray = [];
      if (Array.isArray(clips)) {
        clipsArray = clips;
      } else if (clips.length !== undefined) {
        clipsArray = Array.from({length: clips.length}, (_, i) => clips[i]);
      } else if (clips.numItems !== undefined && typeof clips.getItemAt === 'function') {
        clipsArray = Array.from({length: clips.numItems}, (_, i) => clips.getItemAt(i));
      }

      // Find clip that contains this timestamp
      for (const clip of clipsArray) {
        const start = clip.start || 0;
        const end = clip.end || 0;

        // Convert ticks to seconds if needed
        const ticksPerSecond = 254016000000; // Default for 24fps
        const startInSeconds = start / ticksPerSecond;
        const endInSeconds = end / ticksPerSecond;

        if (timestamp >= startInSeconds && timestamp < endInSeconds) {
          return clip;
        }
      }

      return null;

    } catch (error) {
      console.warn('[AudioAnalyzer] Error getting clip at time:', error);
      return null;
    }
  }

  /**
   * Determine which camera is active based on audio levels
   *
   * @param {number[]} levels - [camera1Level, camera2Level, camera3Level]
   * @returns {1|2|3} Active camera number
   * @private
   */
  determineActiveCamera(levels) {
    const maxLevel = Math.max(...levels);

    // If all silent (below threshold), default to camera 1
    if (maxLevel < 0.1) {
      return 1;
    }

    // Return camera with highest level (1-indexed)
    return levels.indexOf(maxLevel) + 1;
  }

  /**
   * Set progress callback for reporting analysis progress
   *
   * @param {Function} callback - Callback(progress: number, message: string)
   */
  onProgress(callback) {
    this.progressCallback = callback;
  }
}

// Export for use in main.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AudioAnalyzer;
}
