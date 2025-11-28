# Testing Quick Start Guide

**Quick reference for running integration tests**

---

## 1. Install Plugin (5 minutes)

### macOS

```bash
# Navigate to extensions folder
cd ~/Library/Application\ Support/Adobe/CEP/extensions/

# Create directory for plugin
mkdir -p premiere-auto-camera

# Copy plugin files
cp -r /path/to/premiere-auto-camera/* premiere-auto-camera/

# Verify files copied
ls -la premiere-auto-camera/
```

### Windows

```powershell
# Navigate to extensions folder
cd C:\Users\[YourUsername]\AppData\Roaming\Adobe\CEP\extensions\

# Create directory for plugin
mkdir premiere-auto-camera

# Copy plugin files
xcopy /E /I C:\path\to\premiere-auto-camera premiere-auto-camera

# Verify files copied
dir premiere-auto-camera
```

---

## 2. Prepare Test Footage (10 minutes)

### Option A: Use Existing Multi-Cam Footage

If you have multi-camera footage:
1. Import 3 camera angles
2. Ensure clips are synchronized
3. Duration: At least 60 seconds recommended

### Option B: Create Test Footage

If you don't have multi-cam footage, use any 3 video clips:

1. **Import 3 clips** (can be any footage)
2. **Trim to same duration** (e.g., 60 seconds)
3. **Adjust audio levels** to simulate different speakers:
   - Clip 1: Speaker A (normal audio)
   - Clip 2: Speaker B (normal audio)
   - Clip 3: Speaker C (normal audio)

For best results:
- Clips should have audio (silent clips won't work well)
- Audio should vary (not constant levels)
- At least 30-60 seconds duration

---

## 3. Create Test Sequence (5 minutes)

1. **New Sequence**:
   - File → New → Sequence
   - Choose preset matching your footage
   - Name: "Test_Multicam"

2. **Place Clips on Tracks**:
   ```
   Video Track 3: [Camera 3 Clip]
   Video Track 2: [Camera 2 Clip]
   Video Track 1: [Camera 1 Clip]
   ```

3. **Verify Setup**:
   - All clips start at 00:00:00:00
   - All clips same duration
   - Audio enabled on all clips
   - Sequence is active (blue border)

---

## 4. Enable Debugging (2 minutes)

### Enable UXP Developer Mode

1. **Premiere Pro → Preferences → General**
2. Check "Enable Developer Mode"
3. Restart Premiere Pro

### Show Browser Console

1. **Window → Extensions → Auto Camera Switcher** (opens panel)
2. **Right-click on panel → Inspect** (opens DevTools)
3. **Click Console tab**

Keep DevTools open during all testing to see console logs.

---

## 5. Run First Test (5 minutes)

### Basic Smoke Test

1. **Open Plugin**:
   - Window → Extensions → Auto Camera Switcher
   - Panel should load within 2 seconds

2. **Assign Cameras**:
   - Click "Camera 1" button → Button turns blue
   - Click "Camera 2" button → Button turns blue
   - Click "Camera 3" button → Button turns blue
   - "Create Multicam Edit" button becomes enabled (blue)

3. **Run Analysis**:
   - Click "Create Multicam Edit"
   - Watch progress messages:
     - "Step 1/4: Analyzing audio levels..."
     - "Step 2/4: Generating camera switches..."
     - "Step 3/4: Creating multicam sequence..."
     - "Step 4/4: Rendering visualization..."
   - Success message: "✓ Complete! Created 'Test_Multicam_Multicam' with X cuts"

4. **Verify Results**:
   - Check Project Panel → New sequence "[Name]_Multicam" appears
   - Double-click to open in timeline
   - Verify clips from all 3 cameras present
   - Play timeline to verify cuts work

### Expected Time

- Total test time: ~2-10 seconds (depending on clip length)
- For 60s clip: ~5 seconds total

---

## 6. Check Console Output (Important!)

### Expected Console Logs (Success)

```
[Auto Camera] Extension loaded
[Auto Camera] Modules imported successfully
[Auto Camera] Initializing UI...
[Auto Camera] Event listeners attached
[Auto Camera] Status (info): Ready. Assign camera tracks to begin.

[After clicking cameras...]
[Auto Camera] Setting up camera 1...
[Auto Camera] Camera 1 assigned to track: ...
[Auto Camera] All cameras assigned, analyze button enabled

[After clicking analyze...]
[Auto Camera] Starting full analysis workflow...
[Auto Camera] Sequence: Test_Multicam
[AudioAnalyzer] Initialized
[AudioAnalyzer] Starting sequence analysis...
[AudioAnalyzer] Analysis complete: X samples
[CutGenerator] Initialized
[CutGenerator] Generated X cuts
[TimelineEditor] Initialized
[TimelineEditor] Creating new sequence: Test_Multicam_Multicam
[TimelineEditor] Edit complete: X cuts applied
[VisualizationUI] Initialized
[VisualizationUI] Rendering...
[Auto Camera] Full workflow completed successfully
```

### Common Error Patterns

**No active sequence**:
```
[Auto Camera] Error: No active sequence
```
→ Make sure sequence is open and active

**Insufficient tracks**:
```
[Auto Camera] Error: Need at least 3 video tracks. Found 2.
```
→ Add more video tracks to sequence

**API errors**:
```
[Auto Camera] Error accessing Premiere API: ...
```
→ Check Premiere Pro version (needs 25.0+)

---

## 7. Run Full Test Suite (30 minutes)

Follow **INTEGRATION_TESTING.md** for complete test cases:

### Quick Checklist

- [ ] TC-01: Panel Loading
- [ ] TC-02: Camera Assignment
- [ ] TC-03: Settings Configuration
- [ ] TC-08: Complete Workflow
- [ ] TC-09: Error - No Sequence
- [ ] TC-10: Error - Insufficient Tracks

### Record Results

Use this template for each test:

```
Test: TC-XX
Status: Pass / Fail
Time: X seconds
Notes: [Any observations]
Issues: [Any problems found]
```

---

## 8. Report Issues

### Issue Template

```
Issue #X: [Brief Description]
Severity: Critical / High / Medium / Low

Description:
[What went wrong]

Steps to Reproduce:
1. [Step 1]
2. [Step 2]

Expected:
[What should happen]

Actual:
[What actually happened]

Console Errors:
[Paste from DevTools console]

Environment:
- Premiere Pro: [Version]
- OS: [macOS / Windows]
- Plugin: Day 10 build
```

---

## Troubleshooting

### Plugin doesn't load

1. Check extensions folder path is correct
2. Restart Premiere Pro
3. Check Developer Mode is enabled
4. Look for errors in main.js console logs

### "No active sequence" error

1. Make sure sequence is open in timeline
2. Click on sequence to make it active (blue border)
3. Try clicking camera buttons again

### Console shows errors

1. Copy complete error message
2. Note which step failed (Setup, Analysis, etc.)
3. Create issue with error details

### Panel is blank

1. Right-click panel → Inspect
2. Check Console for JavaScript errors
3. Verify index.html loaded correctly
4. Try reloading panel (close and reopen)

### Analysis takes too long

1. Check clip duration (5+ minutes will take longer)
2. Lower sample rate in settings (try 2.0 instead of 1.0)
3. Monitor CPU usage during analysis

---

## Quick Commands

### Reload Plugin

1. Close Auto Camera Switcher panel
2. Window → Extensions → Auto Camera Switcher

### Clear Console

1. Right-click in Console → Clear Console
2. Or press Cmd+K (Mac) / Ctrl+K (Win)

### Export Console Logs

1. Right-click in Console → Save as...
2. Save to `test_results/console_log_[timestamp].txt`

---

## Next Steps After Testing

1. **Document all issues** in INTEGRATION_TESTING.md
2. **Prioritize bugs** (Critical → High → Medium → Low)
3. **Create GitHub issues** for tracking
4. **Fix critical bugs** before user testing
5. **Update documentation** with any API quirks found

---

## Support

If you encounter issues during testing:

1. Check console for error messages
2. Review INTEGRATION_TESTING.md test cases
3. Check GitHub issues for known problems
4. Create new issue with details

---

**Happy Testing! 🧪**
