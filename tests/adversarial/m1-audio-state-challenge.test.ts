/**
 * Empirical Adversarial Challenge Suite: Web Audio & Local Storage Subsystems
 * tests/adversarial/m1-audio-state-challenge.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  AudioEngine,
  SOLFEGGIO_PRESETS,
  BRAINWAVE_PRESETS,
  getDigitalRoot,
  calculateBinauralBeat,
  audioEngine
} from '@/lib/audio';
import {
  loadChamberProfile,
  saveChamberProfile,
  recalculateStreak,
  createEmptyDailyEntry,
  getDefaultProfile,
  getTodayKey,
  saveRitual,
  ChamberProfile,
  DailyRitualEntry
} from '@/lib/storage';

describe('Adversarial Challenge: Web Audio Subsystem', () => {
  let mockCtx: any;
  let mockGain: any;
  let mockOsc: any;
  let mockMerger: any;

  beforeEach(() => {
    vi.useFakeTimers();

    mockGain = {
      gain: {
        value: 0.7,
        setValueAtTime: vi.fn((val) => { mockGain.gain.value = val; }),
        linearRampToValueAtTime: vi.fn((val) => { mockGain.gain.value = val; }),
        setTargetAtTime: vi.fn((val) => {
          if (isNaN(val) || !isFinite(val)) {
            throw new TypeError("Failed to execute 'setTargetAtTime' on 'AudioParam': The provided float value is non-finite.");
          }
          mockGain.gain.value = val;
        }),
        cancelScheduledValues: vi.fn()
      },
      connect: vi.fn(),
      disconnect: vi.fn()
    };

    mockOsc = {
      type: 'sine',
      frequency: {
        value: 369,
        setValueAtTime: vi.fn((val) => {
          if (isNaN(val) || !isFinite(val)) {
            throw new TypeError("Failed to execute 'setValueAtTime' on 'AudioParam': The provided float value is non-finite.");
          }
          mockOsc.frequency.value = val;
        }),
        setTargetAtTime: vi.fn()
      },
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn()
    };

    mockMerger = {
      connect: vi.fn(),
      disconnect: vi.fn()
    };

    mockCtx = {
      currentTime: 10.0,
      state: 'running',
      destination: {},
      createGain: vi.fn(() => ({ ...mockGain, gain: { ...mockGain.gain } })),
      createOscillator: vi.fn(() => ({ ...mockOsc, frequency: { ...mockOsc.frequency } })),
      createChannelMerger: vi.fn(() => ({ ...mockMerger })),
      resume: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockImplementation(() => {
        mockCtx.state = 'closed';
        return Promise.resolve();
      })
    };

    if (typeof window !== 'undefined') {
      (window as any).AudioContext = vi.fn(() => mockCtx);
    }
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  // ---------------------------------------------------------------------------
  // Probe 1: Rapid Play -> Stop -> Play Race Condition
  // ---------------------------------------------------------------------------
  it('PROBE 1: rapid stop() followed by play() within 60ms fade window', async () => {
    const engine = new AudioEngine();

    // 1. Start audio
    await engine.play();
    expect(engine.getState().isPlaying).toBe(true);

    // 2. Stop audio (schedules 60ms timeout to stopNodes and set isPlaying=false)
    engine.stop();

    // 3. 20ms later, user clicks play() again
    vi.advanceTimersByTime(20);
    await engine.play();
    expect(engine.getState().isPlaying).toBe(true);

    // 4. Advance time past the original 60ms stop threshold (to 70ms)
    vi.advanceTimersByTime(50);

    // CRITICAL OBSERVATION:
    // Does the stale 60ms timeout from the earlier stop() call trigger and kill the new playback?
    const stateAfterTimeout = engine.getState();
    
    // We document the actual empirical behavior:
    // If stateAfterTimeout.isPlaying is false, the engine has a race condition!
    const hasRaceBug = (stateAfterTimeout.isPlaying === false);
    expect(hasRaceBug).toBe(true); // Empirically proven: stale stop timer silences active audio
  });

  // ---------------------------------------------------------------------------
  // Probe 2: Closed AudioContext Recovery
  // ---------------------------------------------------------------------------
  it('PROBE 2: behavior when AudioContext transitions to closed state', async () => {
    const engine = new AudioEngine();
    await engine.play();

    // Simulate browser backgrounding or hardware change closing the context
    mockCtx.state = 'closed';
    mockCtx.createGain.mockImplementation(() => {
      throw new DOMException('Cannot call createGain on a closed AudioContext', 'InvalidStateError');
    });

    // Attempting to play again without destroy()
    let errorThrown: any = null;
    try {
      await engine.play();
    } catch (err) {
      errorThrown = err;
    }

    // CRITICAL OBSERVATION:
    // AudioEngine caches this.ctx without checking if this.ctx.state === 'closed'
    expect(errorThrown).not.toBeNull();
    expect(errorThrown.message).toContain('Cannot call createGain on a closed AudioContext');
  });

  // ---------------------------------------------------------------------------
  // Probe 3: Autoplay Policy (ctx.resume Rejection)
  // ---------------------------------------------------------------------------
  it('PROBE 3: behavior when ctx.resume() rejects due to autoplay policy', async () => {
    const engine = new AudioEngine();
    mockCtx.state = 'suspended';
    mockCtx.resume.mockRejectedValueOnce(
      new DOMException('The play() request was denied by autoplay policy.', 'NotAllowedError')
    );

    let caughtError: any = null;
    try {
      await engine.play();
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).not.toBeNull();
    expect(caughtError.name).toBe('NotAllowedError');
    // State should not indicate playing if resume failed
    expect(engine.getState().isPlaying).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Probe 4: Gain Ramp Invariants & Non-Negative AudioParam
  // ---------------------------------------------------------------------------
  it('PROBE 4: verifies 50ms linear ramp schedule and non-negative gain invariant', async () => {
    const engine = new AudioEngine();
    engine.setVolume(0.8);
    await engine.play();

    const createdGain = mockCtx.createGain.mock.results[0].value;
    expect(createdGain.gain.setValueAtTime).toHaveBeenCalledWith(0.0001, 10.0);
    expect(createdGain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.8, 10.05);

    // Stop ramp verification
    engine.stop();
    expect(createdGain.gain.cancelScheduledValues).toHaveBeenCalledWith(10.0);
    expect(createdGain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.0001, 10.05);
  });

  // ---------------------------------------------------------------------------
  // Probe 5: Volume Input Boundary & NaN Injection
  // ---------------------------------------------------------------------------
  it('PROBE 5: volume clamping behavior under NaN and extreme values', () => {
    const engine = new AudioEngine();

    // Extreme values
    engine.setVolume(999);
    expect(engine.getState().volume).toBe(1.0);

    engine.setVolume(-999);
    expect(engine.getState().volume).toBe(0.0);

    // NaN input: Math.max(0, Math.min(1, NaN)) === NaN in JS
    engine.setVolume(NaN);
    expect(isNaN(engine.getState().volume)).toBe(true); // volume becomes NaN!
  });

  // ---------------------------------------------------------------------------
  // Probe 6: getDigitalRoot Mathematical Invariants on Edge Inputs
  // ---------------------------------------------------------------------------
  it('PROBE 6: getDigitalRoot behavior on boundary values (0, negative, float)', () => {
    // Standard Solfeggio values
    expect(getDigitalRoot(369)).toBe(9);
    expect(getDigitalRoot(528)).toBe(6);
    expect(getDigitalRoot(639)).toBe(9);

    // Boundary edge cases
    expect(getDigitalRoot(0)).toBe(0); // 1 + ((-1) % 9) = 0 (not in 1..9)
    expect(getDigitalRoot(-9)).toBe(0); // 1 + ((-10) % 9) = 1 + (-1) = 0
    expect(getDigitalRoot(9)).toBe(9);
    expect(getDigitalRoot(18)).toBe(9);
  });
});

describe('Adversarial Challenge: LocalStorage & State Subsystem', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  // ---------------------------------------------------------------------------
  // Probe 7: Corrupted JSON in localStorage
  // ---------------------------------------------------------------------------
  it('PROBE 7: loadChamberProfile handles malformed non-JSON data safely', () => {
    window.localStorage.setItem('369_chamber_profile_v1', '{ corrupt json string !!!');
    const profile = loadChamberProfile();
    expect(profile).toBeDefined();
    expect(profile.activeStreak).toBe(0);
    expect(profile.history).toBeDefined();
  });

  it('PROBE 7b: loadChamberProfile handles JSON primitives ("null", "123", "\"text\"")', () => {
    window.localStorage.setItem('369_chamber_profile_v1', 'null');
    const p1 = loadChamberProfile();
    expect(p1.activeStreak).toBe(0);

    window.localStorage.setItem('369_chamber_profile_v1', '"a plain string"');
    const p2 = loadChamberProfile();
    expect(p2.activeStreak).toBe(0);

    window.localStorage.setItem('369_chamber_profile_v1', '12345');
    const p3 = loadChamberProfile();
    expect(p3.activeStreak).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // Probe 8: Corrupted Past History Entries in recalculateStreak
  // ---------------------------------------------------------------------------
  it('PROBE 8: recalculateStreak vulnerability when past history entry has null or missing slots', () => {
    const corruptedProfile: ChamberProfile = {
      activeStreak: 1,
      longestStreak: 1,
      lastActiveDate: '2026-11-13',
      totalEntriesWritten: 3,
      totalDaysCompleted: 1,
      activeMasterIntention: 'Wealth',
      activeCategory: 'wealth',
      history: {
        '2026-11-12': null as any, // Corrupted entry in storage
        '2026-11-13': createEmptyDailyEntry('2026-11-13')
      }
    };

    let thrownError: any = null;
    try {
      recalculateStreak(corruptedProfile, '2026-11-13');
    } catch (err) {
      thrownError = err;
    }

    // CRITICAL OBSERVATION:
    // recalculateStreak does not guard against null entry in profile.history[dateKey]
    expect(thrownError).not.toBeNull();
    expect(thrownError.message).toContain("Cannot read properties of null (reading 'isDayComplete')");
  });

  it('PROBE 8b: recalculateStreak when morning array is missing from an entry', () => {
    const missingSlotProfile: ChamberProfile = {
      activeStreak: 1,
      longestStreak: 1,
      lastActiveDate: '2026-11-13',
      totalEntriesWritten: 0,
      totalDaysCompleted: 0,
      activeMasterIntention: 'Wealth',
      activeCategory: 'wealth',
      history: {
        '2026-11-12': {
          date: '2026-11-12',
          isDayComplete: false
        } as any,
        '2026-11-13': createEmptyDailyEntry('2026-11-13')
      }
    };

    let thrownError: any = null;
    try {
      recalculateStreak(missingSlotProfile, '2026-11-13');
    } catch (err) {
      thrownError = err;
    }

    expect(thrownError).not.toBeNull();
    expect(thrownError.message).toContain("Cannot read properties of undefined (reading 'filter')");
  });

  // ---------------------------------------------------------------------------
  // Probe 9: LocalStorage Quota Exceeded (DOMException)
  // ---------------------------------------------------------------------------
  it('PROBE 9: saveChamberProfile catches QuotaExceededError and returns false', () => {
    const setItemSpy = vi.spyOn(window.localStorage.__proto__, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded for storage', 'QuotaExceededError');
    });

    const prof = getDefaultProfile();
    const result = saveChamberProfile(prof);

    expect(result).toBe(false); // Gracefully returns false, does not throw
    setItemSpy.mockRestore();
  });

  // ---------------------------------------------------------------------------
  // Probe 10: Leap Year & Date Rollover Streak Calculation
  // ---------------------------------------------------------------------------
  it('PROBE 10: recalculateStreak handles leap year rollover (Feb 28/29 to March 1)', () => {
    const leapProfile: ChamberProfile = {
      activeStreak: 0,
      longestStreak: 0,
      lastActiveDate: '2024-03-01',
      totalEntriesWritten: 0,
      totalDaysCompleted: 0,
      activeMasterIntention: 'Wealth',
      activeCategory: 'wealth',
      history: {
        '2024-02-28': { ...createEmptyDailyEntry('2024-02-28'), isDayComplete: true },
        '2024-02-29': { ...createEmptyDailyEntry('2024-02-29'), isDayComplete: true }, // Leap day
        '2024-03-01': { ...createEmptyDailyEntry('2024-03-01'), isDayComplete: true }
      }
    };

    const updated = recalculateStreak(leapProfile, '2024-03-01');
    expect(updated.activeStreak).toBe(3);
    expect(updated.longestStreak).toBe(3);
  });

  it('PROBE 10b: recalculateStreak handles year boundary rollover (Dec 31 to Jan 1)', () => {
    const yearProfile: ChamberProfile = {
      activeStreak: 0,
      longestStreak: 0,
      lastActiveDate: '2026-01-01',
      totalEntriesWritten: 0,
      totalDaysCompleted: 0,
      activeMasterIntention: 'Wealth',
      activeCategory: 'wealth',
      history: {
        '2025-12-30': { ...createEmptyDailyEntry('2025-12-30'), isDayComplete: true },
        '2025-12-31': { ...createEmptyDailyEntry('2025-12-31'), isDayComplete: true },
        '2026-01-01': { ...createEmptyDailyEntry('2026-01-01'), isDayComplete: true }
      }
    };

    const updated = recalculateStreak(yearProfile, '2026-01-01');
    expect(updated.activeStreak).toBe(3);
  });
});
