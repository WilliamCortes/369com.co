/**
 * Unit Test Suite for Web Audio Frequency Synthesizer & Solfeggio Logic
 * tests/unit/audio.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  SOLFEGGIO_PRESETS,
  BRAINWAVE_PRESETS,
  AudioEngine,
  SolfeggioPresetKey,
  getDigitalRoot,
  calculateBinauralBeat
} from '@/lib/audio';
import {
  recalculateStreak,
  createEmptyDailyEntry,
  ChamberProfile
} from '@/lib/storage';

// -----------------------------------------------------------------------------
// 1. Digital Root Mathematical Invariant Tests
// -----------------------------------------------------------------------------
describe('Solfeggio Frequencies & Digital Roots', () => {
  it('verifies all 5 core presets have digital roots in {3, 6, 9}', () => {
    const keys: SolfeggioPresetKey[] = ['369', '396', '528', '639', '963'];
    for (const key of keys) {
      const preset = SOLFEGGIO_PRESETS[key];
      const root = getDigitalRoot(preset.frequency);
      expect([3, 6, 9]).toContain(root);
      expect(preset.digitalRoot).toBe(root);
    }
  });

  it('verifies 369Hz Tesla Harmonic reduces to master root 9', () => {
    expect(SOLFEGGIO_PRESETS['369'].frequency).toBe(369);
    expect(getDigitalRoot(369)).toBe(9);
  });

  it('verifies 528Hz Transformation tone reduces to root 6', () => {
    expect(SOLFEGGIO_PRESETS['528'].frequency).toBe(528);
    expect(getDigitalRoot(528)).toBe(6);
  });

  it('verifies binaural offsets correspond to correct brainwave ranges', () => {
    expect(BRAINWAVE_PRESETS.theta.deltaHz).toBe(6.0); // 4-8 Hz (Manifestation)
    expect(BRAINWAVE_PRESETS.alpha.deltaHz).toBe(10.0); // 8-12 Hz (Focus)
    expect(BRAINWAVE_PRESETS.delta.deltaHz).toBe(3.0); // 0.5-4 Hz (Deep Rest)
  });

  it('calculates binaural beat frequencies correctly', () => {
    const thetaBeat = calculateBinauralBeat(369, 'theta');
    expect(thetaBeat.left).toBe(369);
    expect(thetaBeat.right).toBe(375);
    expect(thetaBeat.beat).toBe(6);

    const alphaBeat = calculateBinauralBeat(528, 'alpha');
    expect(alphaBeat.left).toBe(528);
    expect(alphaBeat.right).toBe(538);
    expect(alphaBeat.beat).toBe(10);
  });
});

// -----------------------------------------------------------------------------
// 2. AudioEngine Lifecycle & Web Audio Node Tests
// -----------------------------------------------------------------------------
describe('AudioEngine Web Audio State & Routing', () => {
  let mockAudioContext: any;
  let mockGain: any;
  let mockOsc: any;
  let mockMerger: any;

  beforeEach(() => {
    mockGain = {
      gain: {
        value: 1,
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        setTargetAtTime: vi.fn(),
        cancelScheduledValues: vi.fn()
      },
      connect: vi.fn(),
      disconnect: vi.fn()
    };

    mockOsc = {
      type: 'sine',
      frequency: {
        value: 369,
        setValueAtTime: vi.fn(),
        setTargetAtTime: vi.fn()
      },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      disconnect: vi.fn()
    };

    mockMerger = {
      connect: vi.fn(),
      disconnect: vi.fn()
    };

    mockAudioContext = {
      currentTime: 0,
      state: 'running',
      destination: {},
      createGain: vi.fn(() => ({ ...mockGain })),
      createOscillator: vi.fn(() => ({ ...mockOsc })),
      createChannelMerger: vi.fn(() => ({ ...mockMerger })),
      resume: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined)
    };

    if (typeof window !== 'undefined') {
      (window as any).AudioContext = vi.fn(() => mockAudioContext);
    }
  });

  it('initializes with default 369Hz Tesla Harmonic and volume 0.7', () => {
    const engine = new AudioEngine();
    const state = engine.getState();
    expect(state.isPlaying).toBe(false);
    expect(state.frequency).toBe(369);
    expect(state.presetId).toBe('369');
    expect(state.volume).toBe(0.7);
    expect(state.binauralEnabled).toBe(true);
    expect(state.binauralState).toBe('theta');
  });

  it('clamps volume safely between 0.0 and 1.0', () => {
    const engine = new AudioEngine();
    engine.setVolume(1.5);
    expect(engine.getState().volume).toBe(1.0);
    engine.setVolume(-0.5);
    expect(engine.getState().volume).toBe(0.0);
    engine.setVolume(0.85);
    expect(engine.getState().volume).toBe(0.85);
  });

  it('updates frequency when preset changes', () => {
    const engine = new AudioEngine();
    engine.setPreset('528');
    expect(engine.getState().frequency).toBe(528);
    expect(engine.getState().presetId).toBe('528');
  });

  it('toggles mute correctly without losing base volume', () => {
    const engine = new AudioEngine();
    engine.setVolume(0.8);
    expect(engine.getState().isMuted).toBe(false);
    engine.toggleMute();
    expect(engine.getState().isMuted).toBe(true);
    expect(engine.getState().volume).toBe(0.8);
    engine.toggleMute();
    expect(engine.getState().isMuted).toBe(false);
    expect(engine.getState().volume).toBe(0.8);
  });

  it('supports subscription listeners for state changes', () => {
    const engine = new AudioEngine();
    let recordedState: any = null;
    const unsub = engine.subscribe((s) => {
      recordedState = s;
    });

    expect(recordedState).toBeDefined();
    expect(recordedState.frequency).toBe(369);

    engine.setPreset('963');
    expect(recordedState.frequency).toBe(963);

    unsub();
  });
});

// -----------------------------------------------------------------------------
// 3. LocalStorage Streak & Ritual Completion Logic
// -----------------------------------------------------------------------------
describe('Chamber Storage & Streak Logic', () => {
  it('correctly calculates a consecutive 3-day streak', () => {
    const profile: ChamberProfile = {
      activeStreak: 0,
      longestStreak: 0,
      lastActiveDate: '2026-11-13',
      totalEntriesWritten: 0,
      totalDaysCompleted: 0,
      activeMasterIntention: 'Wealth',
      activeCategory: 'wealth',
      history: {
        '2026-11-11': { ...createEmptyDailyEntry('2026-11-11'), isDayComplete: true },
        '2026-11-12': { ...createEmptyDailyEntry('2026-11-12'), isDayComplete: true },
        '2026-11-13': { ...createEmptyDailyEntry('2026-11-13'), isDayComplete: true }
      }
    };

    const updated = recalculateStreak(profile, '2026-11-13');
    expect(updated.activeStreak).toBe(3);
    expect(updated.longestStreak).toBe(3);
    expect(updated.totalDaysCompleted).toBe(3);
  });

  it('preserves streak if today is incomplete but yesterday was completed', () => {
    const profile: ChamberProfile = {
      activeStreak: 0,
      longestStreak: 2,
      lastActiveDate: '2026-11-12',
      totalEntriesWritten: 0,
      totalDaysCompleted: 2,
      activeMasterIntention: 'Wealth',
      activeCategory: 'wealth',
      history: {
        '2026-11-11': { ...createEmptyDailyEntry('2026-11-11'), isDayComplete: true },
        '2026-11-12': { ...createEmptyDailyEntry('2026-11-12'), isDayComplete: true },
        '2026-11-13': { ...createEmptyDailyEntry('2026-11-13'), isDayComplete: false } // in progress
      }
    };

    const updated = recalculateStreak(profile, '2026-11-13');
    expect(updated.activeStreak).toBe(2);
  });

  it('resets streak to 0 if yesterday was missed and today is incomplete', () => {
    const profile: ChamberProfile = {
      activeStreak: 5,
      longestStreak: 5,
      lastActiveDate: '2026-11-10',
      totalEntriesWritten: 0,
      totalDaysCompleted: 5,
      activeMasterIntention: 'Wealth',
      activeCategory: 'wealth',
      history: {
        '2026-11-10': { ...createEmptyDailyEntry('2026-11-10'), isDayComplete: true },
        '2026-11-13': { ...createEmptyDailyEntry('2026-11-13'), isDayComplete: false }
      }
    };

    const updated = recalculateStreak(profile, '2026-11-13');
    expect(updated.activeStreak).toBe(0);
    expect(updated.longestStreak).toBe(5);
  });
});
