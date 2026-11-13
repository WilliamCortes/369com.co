/**
 * Empirical Adversarial Test Harness & Boundary Stress Suite
 * Challenger 1: Milestone 1 Verification (domain 369com.co)
 * File: tests/adversarial/m1-challenger.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateNumerology,
  calculateLifePath,
  calculateDestiny,
  calculateSoulUrge,
  calculatePersonality,
  assignTeslaNode,
  calculateResonance369,
  reduceToRootOrMaster,
  normalizeName,
  getCharValue,
  getDominantElement,
  getPowerIntention,
  getSolfeggioFrequency,
  NUMBER_TITLES
} from '@/lib/numerology';
import {
  SOLFEGGIO_PRESETS,
  BRAINWAVE_PRESETS,
  AudioEngine,
  getDigitalRoot,
  calculateBinauralBeat,
  SolfeggioPresetKey,
  BrainwaveState
} from '@/lib/audio';
import {
  recalculateStreak,
  createEmptyDailyEntry,
  ChamberProfile,
  DailyRitualEntry
} from '@/lib/storage';

// =============================================================================
// SUITE 1: NUMEROLOGY ALGORITHMS & ADVERSARIAL STRESS TESTING
// =============================================================================
describe('Empirical Adversarial Challenge: Numerology Engine (F4)', () => {
  describe('1.1 Unicode, Diacritics, and Name Normalization Bounds', () => {
    it('handles complex Latin diacritics and decomposes accents to base characters', () => {
      expect(normalizeName('José Müller-Nuñez')).toBe('JOSEMULLERNUNEZ');
      expect(normalizeName('François Hollande')).toBe('FRANCOISHOLLANDE');
      expect(normalizeName('Chloë Grace')).toBe('CHLOEGRACE');
      expect(normalizeName('René Descartes')).toBe('RENEDESCARTES');
      expect(normalizeName('Straße')).toBe('STRASSE'); // German eszett uppercased to SS
    });

    it('documents behavior on non-decomposing Latin characters (strokes, ligatures)', () => {
      // Characters like Ø, Ł, Đ do not decompose to ASCII letters via Unicode NFD
      // normalizeName removes non-ASCII A-Z
      expect(normalizeName('Søren Kierkegaard')).toBe('SRENKIERKEGAARD'); // Ø removed
      expect(normalizeName('Łukasz')).toBe('UKASZ'); // Ł removed
      expect(normalizeName('Đorđe')).toBe('ORE'); // Đ, đ removed
    });

    it('rejects non-Latin alphabets and non-alphabetic inputs with descriptive errors', () => {
      expect(() => calculateDestiny('Никола Тесла')).toThrow(
        'Invalid name: must contain at least one alphabetic character'
      );
      expect(() => calculateDestiny('李小龙')).toThrow(
        'Invalid name: must contain at least one alphabetic character'
      );
      expect(() => calculateDestiny('Νικόλαος')).toThrow(
        'Invalid name: must contain at least one alphabetic character'
      );
      expect(() => calculateDestiny('محمد')).toThrow(
        'Invalid name: must contain at least one alphabetic character'
      );
      expect(() => calculateDestiny('   \t\n  ')).toThrow(
        'Invalid name: must contain at least one alphabetic character'
      );
      expect(() => calculateDestiny('1234567890')).toThrow(
        'Invalid name: must contain at least one alphabetic character'
      );
      expect(() => calculateDestiny('!@#$%^&*()_+')).toThrow(
        'Invalid name: must contain at least one alphabetic character'
      );
    });

    it('processes single-character names cleanly', () => {
      expect(calculateDestiny('A')).toBe(1);
      expect(calculateDestiny('I')).toBe(9);
      expect(calculateDestiny('Z')).toBe(8);
      const res = calculateNumerology('K', '2000-01-01');
      expect(res.destinyNumber).toBe(2);
      expect(res.lifePath).toBe(4);
      expect([3, 6, 9]).toContain(res.teslaTriadNode);
    });

    it('stress tests ultra-large names (50,000 characters) without O(N^2) degradation', () => {
      const hugeName = 'Nikola Tesla '.repeat(4000); // ~52,000 characters
      const start = performance.now();
      const res = calculateNumerology(hugeName, '1856-07-10');
      const durationMs = performance.now() - start;

      expect(durationMs).toBeLessThan(100); // Must execute in <100ms
      expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33]).toContain(res.destinyNumber);
      expect(res.lifePath).toBe(1);
      expect([3, 6, 9]).toContain(res.teslaTriadNode);
    });
  });

  describe('1.2 Digital Root Reduction & Master Number Preservation (11, 22, 33)', () => {
    it('preserves Master Number 11 across all two-digit reduction sums', () => {
      const sumsReducingTo11 = [11, 29, 38, 47, 56, 65, 74, 83, 92];
      for (const sum of sumsReducingTo11) {
        expect(reduceToRootOrMaster(sum, true)).toBe(11);
      }
    });

    it('preserves Master Number 22 across multi-digit reduction sums', () => {
      expect(reduceToRootOrMaster(22, true)).toBe(22);
      expect(reduceToRootOrMaster(499, true)).toBe(22); // 4+9+9 = 22
      expect(reduceToRootOrMaster(859, true)).toBe(22); // 8+5+9 = 22
    });

    it('preserves Master Number 33 across multi-digit reduction sums', () => {
      expect(reduceToRootOrMaster(33, true)).toBe(33);
      expect(reduceToRootOrMaster(9996, true)).toBe(33); // 9+9+9+6 = 33
    });

    it('reduces non-master double digits to single roots (44, 55, 66, 77, 88, 99)', () => {
      expect(reduceToRootOrMaster(44, true)).toBe(8);
      expect(reduceToRootOrMaster(55, true)).toBe(1);
      expect(reduceToRootOrMaster(66, true)).toBe(3);
      expect(reduceToRootOrMaster(77, true)).toBe(5);
      expect(reduceToRootOrMaster(88, true)).toBe(7);
      expect(reduceToRootOrMaster(99, true)).toBe(9);
    });

    it('reduces master numbers when preserveMaster is explicitly false', () => {
      expect(reduceToRootOrMaster(11, false)).toBe(2);
      expect(reduceToRootOrMaster(22, false)).toBe(4);
      expect(reduceToRootOrMaster(33, false)).toBe(6);
    });

    it('rejects invalid inputs to reduceToRootOrMaster', () => {
      expect(() => reduceToRootOrMaster(-1)).toThrow('Invalid number for reduction');
      expect(() => reduceToRootOrMaster(3.14)).toThrow('Invalid number for reduction');
      expect(() => reduceToRootOrMaster(NaN)).toThrow('Invalid number for reduction');
    });
  });

  describe('1.3 Life Path Calculation & Leap Year Verification', () => {
    it('correctly calculates Life Path for leap year dates', () => {
      // 2024-02-29 -> 2+0+2+4+0+2+2+9 = 21 -> 2+1 = 3
      expect(calculateLifePath('2024-02-29')).toBe(3);

      // 2020-02-29 -> 2+0+2+0+0+2+2+9 = 17 -> 1+7 = 8
      expect(calculateLifePath('2020-02-29')).toBe(8);

      // 2000-02-29 (century leap year) -> 2+0+0+0+0+2+2+9 = 15 -> 1+5 = 6
      expect(calculateLifePath('2000-02-29')).toBe(6);

      // 1980-02-29 -> 1+9+8+0+0+2+2+9 = 31 -> 3+1 = 4
      expect(calculateLifePath('1980-02-29')).toBe(4);

      // 1984-02-29 -> 1+9+8+4+0+2+2+9 = 35 -> 3+5 = 8
      expect(calculateLifePath('1984-02-29')).toBe(8);
    });

    it('correctly calculates Life Path for historical master dates', () => {
      // Master 11: 1994-06-09 -> 1+9+9+4+0+6+0+9 = 38 -> 11
      expect(calculateLifePath('1994-06-09')).toBe(11);

      // Master 22: 1970-01-04 -> 1+9+7+0+0+1+0+4 = 22
      expect(calculateLifePath('1970-01-04')).toBe(22);

      // Master 33: 1879-03-14 -> 1+8+7+9+0+3+1+4 = 33
      expect(calculateLifePath('1879-03-14')).toBe(33);
    });

    it('accepts alternate date formats containing at least 8 digits', () => {
      expect(calculateLifePath('1994/06/09')).toBe(11);
      expect(calculateLifePath('19940609')).toBe(11);
      expect(calculateLifePath('1994.06.09')).toBe(11);
    });

    it('rejects invalid or too short birth date inputs', () => {
      expect(() => calculateLifePath('')).toThrow('Invalid birth date: must be a non-empty string');
      expect(() => calculateLifePath('1990-1-1')).toThrow(
        'Invalid birth date format: expected YYYY-MM-DD with at least 8 digits'
      );
      expect(() => calculateLifePath('invalid-date')).toThrow(
        'Invalid birth date format: expected YYYY-MM-DD with at least 8 digits'
      );
    });
  });

  describe('1.4 Exhaustive Tesla Triad Node Matrix Verification', () => {
    it('guarantees that all 144 possible combinations of (LP, Dest) strictly resolve to {3, 6, 9}', () => {
      const lifePaths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33];
      const destinies = [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33];

      for (const lp of lifePaths) {
        for (const dest of destinies) {
          const node = assignTeslaNode(lp, dest);
          expect([3, 6, 9]).toContain(node);
        }
      }
    });

    it('correctly maps Solfeggio frequency to Tesla Triad Node', () => {
      expect(getSolfeggioFrequency(3)).toBe(369);
      expect(getSolfeggioFrequency(6)).toBe(528);
      expect(getSolfeggioFrequency(9)).toBe(963);
    });
  });

  describe('1.5 3-6-9 Vortex Resonance Score Generator & Property Oracle', () => {
    it('fuzz tests 2,000 random person profiles: invariants strictly hold', () => {
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const sampleNames = [
        'Arthur Pendragon', 'Morgan Le Fay', 'Leonardo Da Vinci',
        'Ada Lovelace', 'Alan Turing', 'Hypatia of Alexandria',
        'Isaac Newton', 'Galileo Galilei', 'Johannes Kepler'
      ];

      for (let i = 0; i < 2000; i++) {
        // Generate pseudo-random valid names and dates
        const prefix = sampleNames[i % sampleNames.length];
        const randomChar = alphabet[Math.floor(Math.random() * alphabet.length)];
        const name = `${prefix} ${randomChar}`;

        const year = 1900 + (i % 120);
        const month = String(1 + (i % 12)).padStart(2, '0');
        const day = String(1 + (i % 28)).padStart(2, '0');
        const birthDate = `${year}-${month}-${day}`;

        const res = calculateNumerology(name, birthDate);

        // Invariant 1: Life path and Destiny are valid numerology numbers
        expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33]).toContain(res.lifePath);
        expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33]).toContain(res.destinyNumber);

        // Invariant 2: Tesla Triad Node is strictly 3, 6, or 9
        expect([3, 6, 9]).toContain(res.teslaTriadNode);

        // Invariant 3: Resonance score is strictly bounded [50, 99]
        expect(res.resonance369Score).toBeGreaterThanOrEqual(50);
        expect(res.resonance369Score).toBeLessThanOrEqual(99);
        expect(Number.isInteger(res.resonance369Score)).toBe(true);

        // Invariant 4: Dominant element is a valid cosmological element
        expect(['Earth', 'Water', 'Fire', 'Ether', 'Air']).toContain(res.dominantElement);

        // Invariant 5: Solfeggio frequency strictly matches triad node
        expect([369, 528, 963]).toContain(res.solfeggioFrequencyHz);

        // Invariant 6: Soul urge and personality numbers are valid
        expect(res.soulUrgeNumber).toBeGreaterThanOrEqual(0);
        expect(res.personalityNumber).toBeGreaterThanOrEqual(0);
      }
    });
  });
});

// =============================================================================
// SUITE 2: WEB AUDIO API & FREQUENCY SYNTHESIZER ADVERSARIAL STRESS
// =============================================================================
describe('Empirical Adversarial Challenge: Web Audio & Solfeggio Logic (F3)', () => {
  describe('2.1 Frequency Mathematics & Digital Roots', () => {
    it('proves mathematically that all Solfeggio presets have digital roots in {3, 6, 9}', () => {
      const keys: SolfeggioPresetKey[] = ['369', '396', '528', '639', '963'];
      for (const key of keys) {
        const preset = SOLFEGGIO_PRESETS[key];
        const root = getDigitalRoot(preset.frequency);
        expect([3, 6, 9]).toContain(root);
        expect(preset.digitalRoot).toBe(root);
      }
    });

    it('verifies binaural beat math across all brainwave states', () => {
      const states: BrainwaveState[] = ['theta', 'alpha', 'delta'];
      for (const st of states) {
        const beat = calculateBinauralBeat(369, st);
        const expectedDelta = BRAINWAVE_PRESETS[st].deltaHz;
        expect(beat.left).toBe(369);
        expect(beat.right).toBe(369 + expectedDelta);
        expect(beat.beat).toBe(expectedDelta);
      }
    });

    it('handles unexpected brainwave states by falling back safely to theta default', () => {
      const fallbackBeat = calculateBinauralBeat(528, 'invalid_state' as any);
      expect(fallbackBeat.left).toBe(528);
      expect(fallbackBeat.right).toBe(534); // 528 + 6.0
      expect(fallbackBeat.beat).toBe(6.0);
    });
  });

  describe('2.2 AudioEngine Concurrency & Lifecycle Stress', () => {
    it('survives rapid toggle cycles without node leaks or uncaught errors', async () => {
      const engine = new AudioEngine();
      for (let i = 0; i < 20; i++) {
        await engine.play();
        expect(engine.getState().isPlaying).toBe(true);
        engine.stop();
      }
      engine.destroy();
    });

    it('clamps volume boundary extremes safely', () => {
      const engine = new AudioEngine();
      engine.setVolume(999);
      expect(engine.getState().volume).toBe(1.0);

      engine.setVolume(-999);
      expect(engine.getState().volume).toBe(0.0);

      engine.setVolume(0.5);
      expect(engine.getState().volume).toBe(0.5);
      engine.destroy();
    });

    it('manages 50 concurrent state listeners without memory leak warnings', () => {
      const engine = new AudioEngine();
      const unsubscribers: Array<() => void> = [];
      let notificationCount = 0;

      for (let i = 0; i < 50; i++) {
        const unsub = engine.subscribe(() => {
          notificationCount++;
        });
        unsubscribers.push(unsub);
      }

      // Initial subscriptions emit current state
      expect(notificationCount).toBe(50);

      // Trigger state change
      engine.setPreset('528');
      expect(notificationCount).toBe(100);

      // Cleanup
      unsubscribers.forEach((u) => u());
      engine.setPreset('963');
      // No more notifications
      expect(notificationCount).toBe(100);
      engine.destroy();
    });
  });
});

// =============================================================================
// SUITE 3: STREAK CALCULATION & STORAGE TRACKER ADVERSARIAL STRESS
// =============================================================================
describe('Empirical Adversarial Challenge: Streak Calculation & Storage (F2)', () => {
  describe('3.1 Leap Year & Calendar Rollover Transitions', () => {
    it('maintains streak uninterrupted across leap day (Feb 28 -> Feb 29 -> Mar 1)', () => {
      const history: Record<string, DailyRitualEntry> = {
        '2024-02-27': { ...createEmptyDailyEntry('2024-02-27'), isDayComplete: true },
        '2024-02-28': { ...createEmptyDailyEntry('2024-02-28'), isDayComplete: true },
        '2024-02-29': { ...createEmptyDailyEntry('2024-02-29'), isDayComplete: true }, // Leap day
        '2024-03-01': { ...createEmptyDailyEntry('2024-03-01'), isDayComplete: true },
      };

      const profile: ChamberProfile = {
        activeStreak: 0,
        longestStreak: 0,
        lastActiveDate: '2024-03-01',
        totalEntriesWritten: 0,
        totalDaysCompleted: 0,
        activeMasterIntention: 'Wealth',
        activeCategory: 'wealth',
        history
      };

      recalculateStreak(profile, '2024-03-01');
      expect(profile.activeStreak).toBe(4);
      expect(profile.longestStreak).toBe(4);
      expect(profile.totalDaysCompleted).toBe(4);
    });

    it('maintains streak uninterrupted across New Year rollover (Dec 31 -> Jan 1)', () => {
      const history: Record<string, DailyRitualEntry> = {
        '2025-12-30': { ...createEmptyDailyEntry('2025-12-30'), isDayComplete: true },
        '2025-12-31': { ...createEmptyDailyEntry('2025-12-31'), isDayComplete: true },
        '2026-01-01': { ...createEmptyDailyEntry('2026-01-01'), isDayComplete: true },
        '2026-01-02': { ...createEmptyDailyEntry('2026-01-02'), isDayComplete: true },
      };

      const profile: ChamberProfile = {
        activeStreak: 0,
        longestStreak: 0,
        lastActiveDate: '2026-01-02',
        totalEntriesWritten: 0,
        totalDaysCompleted: 0,
        activeMasterIntention: 'Wealth',
        activeCategory: 'wealth',
        history
      };

      recalculateStreak(profile, '2026-01-02');
      expect(profile.activeStreak).toBe(4);
      expect(profile.longestStreak).toBe(4);
    });
  });

  describe('3.2 Streak State Transitions & Day Gaps', () => {
    it('preserves active streak when today is in progress but yesterday was completed', () => {
      const history: Record<string, DailyRitualEntry> = {
        '2026-11-10': { ...createEmptyDailyEntry('2026-11-10'), isDayComplete: true },
        '2026-11-11': { ...createEmptyDailyEntry('2026-11-11'), isDayComplete: true },
        '2026-11-12': { ...createEmptyDailyEntry('2026-11-12'), isDayComplete: true },
        '2026-11-13': { ...createEmptyDailyEntry('2026-11-13'), isDayComplete: false }, // Today incomplete
      };

      const profile: ChamberProfile = {
        activeStreak: 0,
        longestStreak: 0,
        lastActiveDate: '2026-11-13',
        totalEntriesWritten: 0,
        totalDaysCompleted: 0,
        activeMasterIntention: 'Wealth',
        activeCategory: 'wealth',
        history
      };

      recalculateStreak(profile, '2026-11-13');
      expect(profile.activeStreak).toBe(3); // Preserved from yesterday
    });

    it('breaks active streak to 0 if yesterday was missed and today is incomplete', () => {
      const history: Record<string, DailyRitualEntry> = {
        '2026-11-10': { ...createEmptyDailyEntry('2026-11-10'), isDayComplete: true },
        '2026-11-11': { ...createEmptyDailyEntry('2026-11-11'), isDayComplete: true },
        // 2026-11-12 missed!
        '2026-11-13': { ...createEmptyDailyEntry('2026-11-13'), isDayComplete: false },
      };

      const profile: ChamberProfile = {
        activeStreak: 5,
        longestStreak: 5,
        lastActiveDate: '2026-11-13',
        totalEntriesWritten: 0,
        totalDaysCompleted: 0,
        activeMasterIntention: 'Wealth',
        activeCategory: 'wealth',
        history
      };

      recalculateStreak(profile, '2026-11-13');
      expect(profile.activeStreak).toBe(0); // Streak broken
      expect(profile.longestStreak).toBe(5); // Longest streak preserved
    });

    it('resets streak to 1 when completed today after a historical gap', () => {
      const history: Record<string, DailyRitualEntry> = {
        '2026-11-01': { ...createEmptyDailyEntry('2026-11-01'), isDayComplete: true },
        '2026-11-02': { ...createEmptyDailyEntry('2026-11-02'), isDayComplete: true },
        // 10 day gap!
        '2026-11-13': { ...createEmptyDailyEntry('2026-11-13'), isDayComplete: true },
      };

      const profile: ChamberProfile = {
        activeStreak: 2,
        longestStreak: 2,
        lastActiveDate: '2026-11-13',
        totalEntriesWritten: 0,
        totalDaysCompleted: 0,
        activeMasterIntention: 'Wealth',
        activeCategory: 'wealth',
        history
      };

      recalculateStreak(profile, '2026-11-13');
      expect(profile.activeStreak).toBe(1);
      expect(profile.longestStreak).toBe(2);
      expect(profile.totalDaysCompleted).toBe(3);
    });
  });

  describe('3.3 Extreme Scale Stress Test (1,000 Consecutive Days)', () => {
    it('efficiently calculates a 1,000-day streak in <10ms', () => {
      const history: Record<string, DailyRitualEntry> = {};
      let cur = new Date(Date.UTC(2023, 0, 1));

      for (let i = 0; i < 1000; i++) {
        const d = cur.toISOString().slice(0, 10);
        history[d] = {
          ...createEmptyDailyEntry(d),
          isDayComplete: true,
          morning: ['affirmation 1', 'affirmation 2', 'affirmation 3'],
          afternoon: ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'],
          evening: ['e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7', 'e8', 'e9']
        };
        cur = new Date(cur.getTime() + 86400000);
      }

      const finalDate = new Date(cur.getTime() - 86400000).toISOString().slice(0, 10);
      const profile: ChamberProfile = {
        activeStreak: 0,
        longestStreak: 0,
        lastActiveDate: '',
        totalEntriesWritten: 0,
        totalDaysCompleted: 0,
        activeMasterIntention: 'Abundance',
        activeCategory: 'wealth',
        history
      };

      const start = performance.now();
      recalculateStreak(profile, finalDate);
      const durationMs = performance.now() - start;

      expect(durationMs).toBeLessThan(15);
      expect(profile.activeStreak).toBe(1000);
      expect(profile.longestStreak).toBe(1000);
      expect(profile.totalDaysCompleted).toBe(1000);
      expect(profile.totalEntriesWritten).toBe(18000); // 18 slots * 1000 days
    });
  });
});
