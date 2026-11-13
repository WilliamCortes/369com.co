// @vitest-environment node
/**
 * Empirical SSR Compatibility Adversarial Test Suite
 * tests/adversarial/ssr-compatibility.test.ts
 */

import { describe, it, expect } from 'vitest';
import { audioEngine, AudioEngine, SOLFEGGIO_PRESETS, getDigitalRoot } from '@/lib/audio';
import {
  loadChamberProfile,
  saveChamberProfile,
  getDefaultProfile,
  getTodayKey,
  createEmptyDailyEntry,
  recalculateStreak
} from '@/lib/storage';
import { calculateNumerology } from '@/lib/numerology';

describe('Adversarial SSR Verification (Pure Node.js Environment)', () => {
  it('confirms window and localStorage are undefined in SSR node context', () => {
    expect(typeof window).toBe('undefined');
    expect(typeof document).toBe('undefined');
    expect(typeof localStorage).toBe('undefined');
  });

  it('verifies audio singleton is safely null and does not throw on import', () => {
    expect(audioEngine).toBeNull();
  });

  it('verifies AudioEngine play() throws clear error in genuine unmocked Node SSR', async () => {
    const savedAudioContext = (global as any).AudioContext;
    const savedWebkit = (global as any).webkitAudioContext;
    delete (global as any).AudioContext;
    delete (global as any).webkitAudioContext;

    try {
      const engine = new AudioEngine();
      await expect(engine.play()).rejects.toThrow('AudioContext not supported in this environment');
    } finally {
      (global as any).AudioContext = savedAudioContext;
      (global as any).webkitAudioContext = savedWebkit;
    }
  });

  it('verifies loadChamberProfile falls back gracefully to default profile on server', () => {
    const profile = loadChamberProfile();
    expect(profile).toBeDefined();
    expect(profile.activeStreak).toBe(0);
    expect(profile.history).toBeDefined();
    expect(profile.activeCategory).toBe('wealth');
  });

  it('verifies saveChamberProfile returns false without throwing on server', () => {
    const profile = getDefaultProfile();
    const result = saveChamberProfile(profile);
    expect(result).toBe(false);
  });

  it('verifies numerology engine executes deterministically in SSR', () => {
    const result = calculateNumerology('Nikola Tesla', '1856-07-10');
    expect(result.lifePath).toBe(1);
    expect(result.destinyNumber).toBe(11);
    expect(result.teslaTriadNode).toBe(3);
    expect(result.isMasterNumber).toBe(true);
  });
});
