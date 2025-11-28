/**
 * TimelineEditor Module
 *
 * Purpose: Apply cuts to Premiere Pro timeline (create new sequence)
 * Algorithm: New sequence creation + clip placement
 *
 * @module TimelineEditor
 */

/**
 * @typedef {Object} Cut
 * @property {number} startTime - Cut start time in seconds
 * @property {number} endTime - Cut end time in seconds
 * @property {1|2|3} camera - Camera number for this cut
 */

/**
 * @typedef {Object} EditResult
 * @property {boolean} success - Whether operation succeeded
 * @property {string|null} newSequenceName - Name of created sequence
 * @property {number} cutsApplied - Number of cuts successfully applied
 * @property {string[]} [errors] - Error messages if failed
 */

/**
 * @typedef {Object} CameraInfo
 * @property {number} trackIndex - Video track index
 * @property {string} trackName - Track name
 */

class TimelineEditor {
  constructor() {
    /**
     * @type {Function|null}
     * @private
     */
    this.progressCallback = null;

    console.log('[TimelineEditor] Initialized');
  }

  /**
   * Apply cuts to create multicam sequence
   *
   * Main workflow:
   * 1. Create new sequence (copy of original)
   * 2. Get source clips for each camera
   * 3. Apply each cut to new sequence
   *
   * @param {Object} sequence - Original Premiere Pro sequence
   * @param {Cut[]} cuts - Array of cut points from CutGenerator
   * @param {Object.<number, CameraInfo>} cameras - Camera track info {1: {...}, 2: {...}, 3: {...}}
   * @returns {Promise<EditResult>}
   */
  async applyEdits(sequence, cuts, cameras) {
    console.log(`[TimelineEditor] Starting edit application: ${cuts.length} cuts`);

    try {
      // Create new sequence
      const newSequenceName = `${sequence.name}_Multicam`;
      console.log(`[TimelineEditor] Creating new sequence: ${newSequenceName}`);

      const newSequence = await this.createNewSequence(sequence, newSequenceName);

      let cutsApplied = 0;
      const totalCuts = cuts.length;

      // Get source clips for each camera
      console.log('[TimelineEditor] Getting camera clips');
      const cameraClips = await this.getCameraClips(sequence, cameras);

      // Apply each cut
      for (const cut of cuts) {
        console.log(`[TimelineEditor] Applying cut ${cutsApplied + 1}/${totalCuts}: Camera ${cut.camera} (${cut.startTime}s - ${cut.endTime}s)`);

        await this.applyCut(newSequence, cameraClips, cut);
        cutsApplied++;

        // Report progress
        if (this.progressCallback) {
          const progress = (cutsApplied / totalCuts) * 100;
          this.progressCallback(
            progress,
            `Applying cuts: ${cutsApplied}/${totalCuts}`
          );
        }
      }

      console.log(`[TimelineEditor] Edit complete: ${cutsApplied} cuts applied`);

      return {
        success: true,
        newSequenceName: newSequenceName,
        cutsApplied: cutsApplied
      };

    } catch (error) {
      console.error('[TimelineEditor] Edit failed:', error);

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
   *
   * UXP API Strategy:
   * - Use app.project.createSequence() with template settings
   * - Fallback: Clone existing sequence
   *
   * @param {Object} templateSequence - Original sequence to base new one on
   * @param {string} name - Name for new sequence
   * @returns {Promise<Object>} New sequence
   * @private
   */
  async createNewSequence(templateSequence, name) {
    try {
      // Strategy 1: Use UXP API (Premiere Pro 25.0+)
      if (typeof app !== 'undefined' && app.project) {
        console.log('[TimelineEditor] Using app.project.createSequence()');

        // Get sequence settings
        const settings = templateSequence.getSettings ?
          await templateSequence.getSettings() :
          this.extractSequenceSettings(templateSequence);

        // Create new sequence
        const newSequence = await app.project.createSequence(name, settings);

        return newSequence;
      }

      // Strategy 2: Fallback for testing/development
      console.warn('[TimelineEditor] Using mock sequence creation (testing mode)');

      return {
        name: name,
        videoTracks: templateSequence.videoTracks || [],
        audioTracks: templateSequence.audioTracks || [],
        getSettings: () => templateSequence.getSettings ? templateSequence.getSettings() : {},
        getVideoTrack: async (index) => {
          return {
            index: index,
            clips: [],
            insertClip: async () => {
              console.log('[TimelineEditor] Mock insertClip() called');
            }
          };
        }
      };

    } catch (error) {
      console.error('[TimelineEditor] Failed to create sequence:', error);
      throw new Error(`Failed to create new sequence: ${error.message}`);
    }
  }

  /**
   * Extract sequence settings for creation
   *
   * @param {Object} sequence - Source sequence
   * @returns {Object} Settings object
   * @private
   */
  extractSequenceSettings(sequence) {
    // Default settings if not available
    return {
      videoFrameRate: sequence.videoFrameRate || {numerator: 30000, denominator: 1001},
      videoWidth: sequence.videoWidth || 1920,
      videoHeight: sequence.videoHeight || 1080,
      audioSampleRate: sequence.audioSampleRate || 48000,
      audioChannelCount: sequence.audioChannelCount || 2
    };
  }

  /**
   * Get source clips for each camera from sequence
   *
   * @param {Object} sequence - Original sequence
   * @param {Object.<number, CameraInfo>} cameras - Camera track info
   * @returns {Promise<Object.<number, Object>>} Camera clips {1: clip, 2: clip, 3: clip}
   * @private
   */
  async getCameraClips(sequence, cameras) {
    const cameraClips = {};

    try {
      // Get video tracks
      const videoTracks = sequence.videoTracks;

      if (!videoTracks) {
        throw new Error('No video tracks found in sequence');
      }

      // Get first clip from each camera's track
      for (const [cameraNum, cameraInfo] of Object.entries(cameras)) {
        const trackIndex = cameraInfo.trackIndex;

        console.log(`[TimelineEditor] Getting clip for Camera ${cameraNum} (track ${trackIndex})`);

        // Get track
        let track;
        if (typeof videoTracks.getItemAt === 'function') {
          track = videoTracks.getItemAt(trackIndex);
        } else if (Array.isArray(videoTracks)) {
          track = videoTracks[trackIndex];
        } else if (videoTracks[trackIndex]) {
          track = videoTracks[trackIndex];
        }

        if (!track) {
          throw new Error(`Track ${trackIndex} not found for Camera ${cameraNum}`);
        }

        // Get first clip from track
        let clip;
        if (track.clips && typeof track.clips.getItemAt === 'function') {
          clip = track.clips.getItemAt(0);
        } else if (track.clips && Array.isArray(track.clips)) {
          clip = track.clips[0];
        } else if (track.clips && track.clips[0]) {
          clip = track.clips[0];
        }

        if (!clip) {
          throw new Error(`No clips found in track ${trackIndex} for Camera ${cameraNum}`);
        }

        cameraClips[cameraNum] = clip;
      }

      console.log(`[TimelineEditor] Retrieved ${Object.keys(cameraClips).length} camera clips`);

      return cameraClips;

    } catch (error) {
      console.error('[TimelineEditor] Failed to get camera clips:', error);
      throw error;
    }
  }

  /**
   * Apply single cut to sequence
   *
   * Strategy:
   * 1. Get destination video track
   * 2. Insert clip segment at timeline position
   * 3. Set in/out points for trimming
   *
   * @param {Object} sequence - Destination sequence
   * @param {Object.<number, Object>} cameraClips - Source clips by camera number
   * @param {Cut} cut - Cut to apply
   * @private
   */
  async applyCut(sequence, cameraClips, cut) {
    try {
      const sourceClip = cameraClips[cut.camera];

      if (!sourceClip) {
        throw new Error(`No clip found for camera ${cut.camera}`);
      }

      // Get video track 1 (destination track - index 0)
      const videoTrack = await sequence.getVideoTrack(0);

      if (!videoTrack) {
        throw new Error('Destination video track not found');
      }

      // Calculate clip trimming
      const inPoint = cut.startTime;   // Start time in source clip
      const outPoint = cut.endTime;    // End time in source clip
      const timelinePosition = cut.startTime;  // Position in timeline

      console.log(`[TimelineEditor]   Insert: ${inPoint}s-${outPoint}s at timeline ${timelinePosition}s`);

      // Insert clip segment
      // UXP API: track.insertClip(clip, inPoint, outPoint, timelinePosition)
      if (typeof videoTrack.insertClip === 'function') {
        await videoTrack.insertClip(
          sourceClip,
          inPoint,
          outPoint,
          timelinePosition
        );
      } else {
        // Mock for testing
        console.log('[TimelineEditor]   Mock: Clip inserted (testing mode)');
      }

    } catch (error) {
      console.error(`[TimelineEditor] Failed to apply cut:`, error);
      throw new Error(`Failed to apply cut for camera ${cut.camera}: ${error.message}`);
    }
  }

  /**
   * Set progress callback for reporting
   *
   * @param {Function} callback - Callback(progress: number, message: string)
   */
  onProgress(callback) {
    this.progressCallback = callback;
  }
}

// Export for use in main.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TimelineEditor;
}
