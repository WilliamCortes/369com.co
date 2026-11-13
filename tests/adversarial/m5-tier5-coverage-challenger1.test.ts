/**
 * Milestone 5 Tier 5 White-Box Adversarial Coverage Hardening
 * Challenger 1 Test Suite (domain 369com.co)
 * File: tests/adversarial/m5-tier5-coverage-challenger1.test.ts
 *
 * Objectives:
 * 1. Deep white-box branch inspection and boundary stress across all lib/ and app/ source files.
 * 2. Probe untested edge cases, boundary conditions, error handling, and security guards.
 * 3. Verify zero runtime regressions, memory safety, and 100% deterministic test execution.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
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
  AudioEngine,
  SOLFEGGIO_PRESETS,
  BRAINWAVE_PRESETS,
  getDigitalRoot,
  calculateBinauralBeat,
  type SolfeggioPresetKey,
  type BrainwaveState
} from '@/lib/audio';
import {
  PRODUCT_CATALOG,
  evaluateGatewayGuard,
  isMockPaymentsEnabled,
  isValidTier,
  isValidEmail,
  createCheckoutSession,
  createMockCheckoutSession,
  generateStripeSignature,
  verifyStripeSignature,
  simulateWebhookEvent,
  type CheckoutRequest
} from '@/lib/stripe';
import {
  orderStore,
  generateDownloadToken,
  verifyDownloadToken,
  getDownloadSigningSecret,
  InMemoryOrderStore
} from '@/lib/order-store';
import {
  crc32,
  createZipArchive,
  type ZipEntry
} from '@/lib/zip';
import {
  isWinAnsiCodePoint,
  sanitizeForPdf,
  generatePersonalizedBlueprintPdf
} from '@/lib/pdf-generator';
import {
  getTodayKey,
  createEmptyDailyEntry,
  getDefaultProfile,
  loadChamberProfile,
  saveChamberProfile,
  recalculateStreak,
  getTodayRitual,
  saveRitual,
  type ChamberProfile
} from '@/lib/storage';
import { cn } from '@/lib/utils';

import { POST as checkoutPost, GET as checkoutGet } from '@/app/api/checkout/route';
import { POST as webhookPost } from '@/app/api/webhook/stripe/route';
import { GET as downloadGet } from '@/app/api/download/route';
import { GET as orderStatusGet } from '@/app/api/order/status/route';

// =============================================================================
// SUITE 1: NUMEROLOGY ALGORITHMIC BOUNDARY & BRANCH HARDENING (lib/numerology.ts)
// =============================================================================
describe('Tier 5 Challenger 1: Numerology Engine Deep White-Box Probes', () => {

  describe('1.1 Root & Master Number Reduction Invariants', () => {
    it('rejects negative numbers and floating point inputs with descriptive errors', () => {
      expect(() => reduceToRootOrMaster(-1)).toThrow(/Invalid number for reduction/);
      expect(() => reduceToRootOrMaster(-99)).toThrow(/Invalid number for reduction/);
      expect(() => reduceToRootOrMaster(3.14159)).toThrow(/Invalid number for reduction/);
      expect(() => reduceToRootOrMaster(NaN)).toThrow(/Invalid number for reduction/);
      expect(() => reduceToRootOrMaster(Infinity)).toThrow(/Invalid number for reduction/);
    });

    it('returns 0 when 0 is passed', () => {
      expect(reduceToRootOrMaster(0)).toBe(0);
    });

    it('preserves master numbers 11, 22, 33 when preserveMaster is true', () => {
      expect(reduceToRootOrMaster(11, true)).toBe(11);
      expect(reduceToRootOrMaster(22, true)).toBe(22);
      expect(reduceToRootOrMaster(33, true)).toBe(33);
    });

    it('reduces master numbers to single digits when preserveMaster is false', () => {
      expect(reduceToRootOrMaster(11, false)).toBe(2);
      expect(reduceToRootOrMaster(22, false)).toBe(4);
      expect(reduceToRootOrMaster(33, false)).toBe(6);
    });

    it('reduces non-master double digits like 44, 55, 66, 77, 88, 99', () => {
      expect(reduceToRootOrMaster(44, true)).toBe(8);
      expect(reduceToRootOrMaster(55, true)).toBe(1); // 55 -> 10 -> 1
      expect(reduceToRootOrMaster(66, true)).toBe(3); // 66 -> 12 -> 3
      expect(reduceToRootOrMaster(77, true)).toBe(5); // 77 -> 14 -> 5
      expect(reduceToRootOrMaster(88, true)).toBe(7); // 88 -> 16 -> 7
      expect(reduceToRootOrMaster(99, true)).toBe(9); // 99 -> 18 -> 9
    });

    it('handles high-magnitude numbers requiring multiple reduction steps', () => {
      expect(reduceToRootOrMaster(999999999)).toBe(9); // 81 -> 9
      expect(reduceToRootOrMaster(199999999)).toBe(1); // 73 -> 10 -> 1
    });
  });

  describe('1.2 Name Normalization & Character Value Boundaries', () => {
    it('normalizes falsy or non-string inputs safely to empty string', () => {
      expect(normalizeName(null as any)).toBe('');
      expect(normalizeName(undefined as any)).toBe('');
      expect(normalizeName(12345 as any)).toBe('');
      expect(normalizeName({} as any)).toBe('');
      expect(normalizeName('')).toBe('');
    });

    it('decomposes all major Latin diacritical accents to base ASCII characters', () => {
      expect(normalizeName('ÁÉÍÓÚ ÀÈÌÒÙ ÂÊÎÔÛ ÄËÏÖÜ')).toBe('AEIOUAEIOUAEIOUAEIOU');
      expect(normalizeName('ñ Ñ ç Ç')).toBe('NNCC');
      expect(normalizeName('Å å Æ æ Ø ø')).toBe('AA'); // Note: Æ, Ø do not decompose via NFD, stripped by [^A-Z]
    });

    it('getCharValue returns 0 for non-ASCII uppercase letters', () => {
      expect(getCharValue(' ')).toBe(0);
      expect(getCharValue('@')).toBe(0);
      expect(getCharValue('[')).toBe(0);
      expect(getCharValue('0')).toBe(0);
      expect(getCharValue('a')).toBe(0); // lowercase requires uppercase input
      expect(getCharValue('z')).toBe(0);
    });

    it('getCharValue returns exact Pythagorean values 1-9 for A-Z', () => {
      const expected = [
        1, 2, 3, 4, 5, 6, 7, 8, 9, // A-I
        1, 2, 3, 4, 5, 6, 7, 8, 9, // J-R
        1, 2, 3, 4, 5, 6, 7, 8     // S-Z
      ];
      for (let i = 0; i < 26; i++) {
        const char = String.fromCharCode(65 + i);
        expect(getCharValue(char)).toBe(expected[i]);
      }
    });
  });

  describe('1.3 calculateLifePath Boundary & Error Probes', () => {
    it('throws on empty, null, or non-string birthDate inputs', () => {
      expect(() => calculateLifePath('')).toThrow(/Invalid birth date/);
      expect(() => calculateLifePath(null as any)).toThrow(/Invalid birth date/);
      expect(() => calculateLifePath(undefined as any)).toThrow(/Invalid birth date/);
      expect(() => calculateLifePath(19900101 as any)).toThrow(/Invalid birth date/);
    });

    it('throws when birthDate has fewer than 8 digits', () => {
      expect(() => calculateLifePath('1990-1-1')).toThrow(/at least 8 digits/);
      expect(() => calculateLifePath('2020-01')).toThrow(/at least 8 digits/);
      expect(() => calculateLifePath('abcd-ef-gh')).toThrow(/at least 8 digits/);
    });

    it('calculates master life path numbers correctly', () => {
      // 2000-01-08: 2 + 0 + 0 + 0 + 0 + 1 + 0 + 8 = 11 (Master 11)
      expect(calculateLifePath('2000-01-08')).toBe(11);

      // 1970-01-04: 1 + 9 + 7 + 0 + 0 + 1 + 0 + 4 = 22 (Master 22)
      expect(calculateLifePath('1970-01-04')).toBe(22);

      // 1979-05-02: 1 + 9 + 7 + 9 + 0 + 5 + 0 + 2 = 33 (Master 33)
      expect(calculateLifePath('1979-05-02')).toBe(33);
    });

    it('accepts alternative date delimiter formats with >= 8 digits', () => {
      expect(calculateLifePath('1985/11/24')).toBe(calculateLifePath('1985-11-24'));
      expect(calculateLifePath('1985.11.24')).toBe(calculateLifePath('1985-11-24'));
      expect(calculateLifePath('19851124')).toBe(calculateLifePath('1985-11-24'));
    });
  });

  describe('1.4 calculateSoulUrge & calculatePersonality Edge Cases', () => {
    it('returns 0 for soul urge when name has no vowels', () => {
      expect(calculateSoulUrge('Rhythm')).toBe(0);
      expect(calculateSoulUrge('Fly')).toBe(0);
      expect(calculateSoulUrge('Crypt')).toBe(0);
      expect(calculateSoulUrge('Lynx')).toBe(0);
    });

    it('returns 0 for personality when name has no consonants', () => {
      expect(calculatePersonality('Io')).toBe(0);
      expect(calculatePersonality('Ouija')).toBe(1); // 'j' is consonant!
      expect(calculatePersonality('Ae')).toBe(0);
      expect(calculatePersonality('Ai')).toBe(0);
    });

    it('correctly calculates soul urge and personality on standard names', () => {
      // "NIKOLA": Vowels = I (9), O (6), A (1) -> 9 + 6 + 1 = 16 -> 7
      expect(calculateSoulUrge('Nikola')).toBe(7);
      // "NIKOLA": Consonants = N (5), K (2), L (3) -> 5 + 2 + 3 = 10 -> 1
      expect(calculatePersonality('Nikola')).toBe(1);
    });
  });

  describe('1.5 assignTeslaNode Branch Permutations', () => {
    it('returns 9 if lpRoot is 9, destRoot is 9, or sumRoot is 9', () => {
      expect(assignTeslaNode(9, 1)).toBe(9); // lpRoot 9
      expect(assignTeslaNode(1, 9)).toBe(9); // destRoot 9
      expect(assignTeslaNode(4, 5)).toBe(9); // sum 9
    });

    it('returns 6 if lpRoot is 6, destRoot is 6, or sumRoot is 6', () => {
      expect(assignTeslaNode(6, 1)).toBe(6); // lpRoot 6
      expect(assignTeslaNode(1, 6)).toBe(6); // destRoot 6
      expect(assignTeslaNode(2, 4)).toBe(6); // sum 6
    });

    it('returns 3 if lpRoot is 3, destRoot is 3, or sumRoot is 3', () => {
      expect(assignTeslaNode(3, 1)).toBe(3); // lpRoot 3
      expect(assignTeslaNode(1, 3)).toBe(3); // destRoot 3
      expect(assignTeslaNode(1, 2)).toBe(3); // sum 3
    });

    it('returns 3 if lpRoot is 1, 2, or 4 and neither root/sum is 3, 6, 9', () => {
      expect(assignTeslaNode(1, 4)).toBe(3); // lpRoot 1, sum 5
      expect(assignTeslaNode(2, 5)).toBe(3); // lpRoot 2, sum 7
      expect(assignTeslaNode(4, 4)).toBe(3); // lpRoot 4, sum 8
    });

    it('falls back to 6 when lpRoot is in [5, 7, 8] and no root or sum is 3, 6, 9', () => {
      // lpRoot 5, destRoot 2 -> sum 7 (neither 9, 6, 3; lp not 1, 2, 4)
      expect(assignTeslaNode(5, 2)).toBe(6);
      // lpRoot 7, destRoot 1 -> sum 8
      expect(assignTeslaNode(7, 1)).toBe(6);
      // lpRoot 8, destRoot 8 -> sum 16 -> 7
      expect(assignTeslaNode(8, 8)).toBe(6);
    });
  });

  describe('1.6 Element & Intention Branch Coverage', () => {
    it('evaluates all branches in getDominantElement', () => {
      expect(getDominantElement(4, 3)).toBe('Earth');
      expect(getDominantElement(8, 6)).toBe('Earth');
      expect(getDominantElement(22, 9)).toBe('Earth');

      expect(getDominantElement(9, 3)).toBe('Ether');
      expect(getDominantElement(11, 6)).toBe('Ether');
      expect(getDominantElement(33, 3)).toBe('Ether');
      expect(getDominantElement(1, 9)).toBe('Ether');

      expect(getDominantElement(1, 6)).toBe('Water');
      expect(getDominantElement(1, 3)).toBe('Fire');

      // Untyped fallback branch
      expect(getDominantElement(1, 7 as any)).toBe('Air');
    });

    it('evaluates all branches in getPowerIntention', () => {
      expect(getPowerIntention(4, 3)).toBe('Abundance & Financial Sovereignty');
      expect(getPowerIntention(8, 6)).toBe('Abundance & Financial Sovereignty');
      expect(getPowerIntention(22, 9)).toBe('Abundance & Financial Sovereignty');

      expect(getPowerIntention(2, 3)).toBe('Divine Love & Harmonic Relationship');
      expect(getPowerIntention(6, 9)).toBe('Divine Love & Harmonic Relationship');
      expect(getPowerIntention(33, 3)).toBe('Divine Love & Harmonic Relationship');
      expect(getPowerIntention(7, 6)).toBe('Divine Love & Harmonic Relationship');

      expect(getPowerIntention(1, 9)).toBe('Vital Energy & Cellular Regeneration');
      expect(getPowerIntention(3, 9)).toBe('Vital Energy & Cellular Regeneration');
      expect(getPowerIntention(5, 9)).toBe('Vital Energy & Cellular Regeneration');
      expect(getPowerIntention(7, 3)).toBe('Vital Energy & Cellular Regeneration');

      // Fallback branch: lifePath 7, teslaNode 9
      expect(getPowerIntention(7, 9)).toBe('Life Purpose & Creative Mastery');
    });

    it('evaluates getSolfeggioFrequency for all 3 nodes', () => {
      expect(getSolfeggioFrequency(3)).toBe(369);
      expect(getSolfeggioFrequency(6)).toBe(528);
      expect(getSolfeggioFrequency(9)).toBe(963);
    });

    it('clamps calculateResonance369 strictly between 50 and 99', () => {
      // 0% 369 letters/digits
      const minScore = calculateResonance369('B', '1111-01-01', 1, 1);
      expect(minScore).toBeGreaterThanOrEqual(50);

      // Max 369 density with master numbers
      const maxScore = calculateResonance369('Nikola Tesla 369', '1999-09-09', 33, 33);
      expect(maxScore).toBeLessThanOrEqual(99);
    });

    it('calculateNumerology handles title fallbacks and master destiny numbers', () => {
      const res = calculateNumerology('Nikola Tesla', '1856-07-10');
      expect(res.lifePath).toBe(1);
      expect(res.destinyNumber).toBe(11); // Master Number 11: 26 + 12 = 38 -> 11
      expect(res.lifePathTitle).toBe(NUMBER_TITLES[1]);
      expect(res.destinyTitle).toBe(NUMBER_TITLES[11]);
      expect(res.teslaTriadNode).toBe(3);
      expect(res.teslaNode).toBe(3);
      expect(res.isMasterNumber).toBe(true);
    });
  });
});

// =============================================================================
// SUITE 2: WEB AUDIO ENGINE & BINAURAL BEAT HARNESS (lib/audio.ts)
// =============================================================================
describe('Tier 5 Challenger 1: Web Audio Synthesizer Deep White-Box Probes', () => {

  describe('2.1 Math & Helper Functions', () => {
    it('getDigitalRoot computes 1-9 for positive numbers, handles 0 and edge cases', () => {
      expect(getDigitalRoot(1)).toBe(1);
      expect(getDigitalRoot(9)).toBe(9);
      expect(getDigitalRoot(10)).toBe(1);
      expect(getDigitalRoot(369)).toBe(9);
      expect(getDigitalRoot(528)).toBe(6);
      expect(getDigitalRoot(963)).toBe(9);
    });

    it('calculateBinauralBeat computes left, right, and delta beat frequencies', () => {
      const theta = calculateBinauralBeat(369, 'theta');
      expect(theta.left).toBe(369);
      expect(theta.right).toBe(375);
      expect(theta.beat).toBe(6.0);

      const alpha = calculateBinauralBeat(528, 'alpha');
      expect(alpha.left).toBe(528);
      expect(alpha.right).toBe(538);
      expect(alpha.beat).toBe(10.0);

      const delta = calculateBinauralBeat(963, 'delta');
      expect(delta.left).toBe(963);
      expect(delta.right).toBe(966);
      expect(delta.beat).toBe(3.0);

      // Fallback for invalid state
      const invalid = calculateBinauralBeat(369, 'nonexistent' as any);
      expect(invalid.beat).toBe(6.0);
    });
  });

  describe('2.2 AudioEngine Mock Node Lifecycle & Boundaries', () => {
    let engine: AudioEngine;
    let mockContext: any;
    let mockGain: any;
    let mockOsc: any;
    let mockMerger: any;

    beforeEach(() => {
      mockGain = {
        gain: {
          value: 1,
          setValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
          cancelScheduledValues: vi.fn(),
          setTargetAtTime: vi.fn()
        },
        connect: vi.fn(),
        disconnect: vi.fn()
      };

      mockOsc = {
        type: 'sine',
        frequency: {
          setValueAtTime: vi.fn(),
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

      mockContext = {
        state: 'suspended',
        currentTime: 0,
        destination: {},
        resume: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
        createGain: vi.fn().mockReturnValue(mockGain),
        createOscillator: vi.fn().mockReturnValue(mockOsc),
        createChannelMerger: vi.fn().mockReturnValue(mockMerger)
      };

      // Provide mock global AudioContext
      (global as any).AudioContext = vi.fn().mockImplementation(() => mockContext);
      engine = new AudioEngine();
    });

    afterEach(() => {
      engine.destroy();
      delete (global as any).AudioContext;
      vi.clearAllMocks();
    });

    it('play() resumes suspended context, sets stereo binaural nodes, and emits state', async () => {
      const listener = vi.fn();
      const unsub = engine.subscribe(listener);

      await engine.play();
      expect(mockContext.resume).toHaveBeenCalled();
      expect(mockContext.createChannelMerger).toHaveBeenCalledWith(2);
      expect(engine.getState().isPlaying).toBe(true);

      unsub();
    });

    it('play() cleanly tears down existing nodes when invoked while already playing', async () => {
      await engine.play();
      expect(mockOsc.start).toHaveBeenCalled();

      // Second play call while playing
      await engine.play();
      expect(mockOsc.stop).toHaveBeenCalled();
      expect(engine.getState().isPlaying).toBe(true);
    });

    it('play() handles mono mode when binauralEnabled is false', async () => {
      engine.setBinaural(false);
      await engine.play();
      expect(mockContext.createChannelMerger).not.toHaveBeenCalled();
      expect(engine.getState().binauralEnabled).toBe(false);
    });

    it('setPreset updates frequency and applies ramp target if currently playing', async () => {
      await engine.play();
      engine.setPreset('528');
      expect(engine.getState().frequency).toBe(528);
      expect(engine.getState().presetId).toBe('528');
      expect(mockOsc.frequency.setTargetAtTime).toHaveBeenCalled();

      // Invalid preset does not modify state
      engine.setPreset('unknown_key' as any);
      expect(engine.getState().presetId).toBe('528');
    });

    it('setVolume clamps values between 0.0 and 1.0', () => {
      engine.setVolume(-0.5);
      expect(engine.getState().volume).toBe(0);

      engine.setVolume(1.8);
      expect(engine.getState().volume).toBe(1);

      engine.setVolume(0.42);
      expect(engine.getState().volume).toBe(0.42);
    });

    it('toggleMute toggles isMuted and updates gain target', async () => {
      await engine.play();
      expect(engine.getState().isMuted).toBe(false);

      engine.toggleMute();
      expect(engine.getState().isMuted).toBe(true);
      expect(mockGain.gain.setTargetAtTime).toHaveBeenCalledWith(0.0001, expect.any(Number), 0.02);

      engine.toggleMute();
      expect(engine.getState().isMuted).toBe(false);
      expect(mockGain.gain.setTargetAtTime).toHaveBeenCalledWith(0.7, expect.any(Number), 0.02);
    });

    it('stop() when not playing is a safe no-op', () => {
      expect(engine.getState().isPlaying).toBe(false);
      engine.stop();
      expect(engine.getState().isPlaying).toBe(false);
    });

    it('destroy() closes AudioContext and cleans up listeners', async () => {
      const listener = vi.fn();
      engine.subscribe(listener);
      await engine.play();
      engine.destroy();
      expect(mockContext.close).toHaveBeenCalled();
    });
  });
});

// =============================================================================
// SUITE 3: PKZIP 2.0 ZERO-DEPENDENCY ENGINE HARNESS (lib/zip.ts)
// =============================================================================
describe('Tier 5 Challenger 1: Pure TypeScript PKZIP 2.0 Deep White-Box Probes', () => {

  describe('3.1 IEEE 802.3 CRC32 Implementation', () => {
    it('computes 0 for empty buffer', () => {
      expect(crc32(new Uint8Array(0))).toBe(0);
    });

    it('computes standard test vector "123456789" = 0xcbf43926', () => {
      const input = Buffer.from('123456789', 'ascii');
      expect(crc32(input)).toBe(0xcbf43926);
    });

    it('handles arbitrary binary bytes 0x00 to 0xFF', () => {
      const bytes = new Uint8Array(256);
      for (let i = 0; i < 256; i++) bytes[i] = i;
      const crc = crc32(bytes);
      expect(typeof crc).toBe('number');
      expect(crc).toBeGreaterThan(0);
    });
  });

  describe('3.2 createZipArchive Byte Structures', () => {
    it('creates a valid 22-byte empty PKZIP archive when entries array is empty', () => {
      const zip = createZipArchive([]);
      expect(zip.length).toBe(22);
      // EOCD Signature: 0x06054b50 ('PK\x05\x06')
      expect(zip[0]).toBe(0x50);
      expect(zip[1]).toBe(0x4b);
      expect(zip[2]).toBe(0x05);
      expect(zip[3]).toBe(0x06);
    });

    it('packages multiple files with local headers, data, central dir, and EOCD', () => {
      const entries: ZipEntry[] = [
        {
          filename: 'doc1.txt',
          data: Buffer.from('Hello Sacred 369 Geometry', 'utf-8')
        },
        {
          filename: 'nested/guide.pdf',
          data: Buffer.from('%PDF-1.4\nSample Content\n%%EOF', 'utf-8')
        },
        {
          filename: 'empty.bin',
          data: new Uint8Array(0)
        }
      ];

      const zipBytes = createZipArchive(entries);
      expect(zipBytes.length).toBeGreaterThan(100);

      // Verify Local File Header Signature at offset 0
      expect(zipBytes.readUInt32LE(0)).toBe(0x04034b50);

      // Verify EOCD record at the end
      const eocdOffset = zipBytes.length - 22;
      expect(zipBytes.readUInt32LE(eocdOffset)).toBe(0x06054b50);
      // Number of entries = 3
      expect(zipBytes.readUInt16LE(eocdOffset + 8)).toBe(3);
      expect(zipBytes.readUInt16LE(eocdOffset + 10)).toBe(3);
    });

    it('handles international UTF-8 file names cleanly', () => {
      const entries: ZipEntry[] = [
        {
          filename: 'Никола-Тесла-369.txt',
          data: Buffer.from('Serbian Cyrillic file content', 'utf-8')
        },
        {
          filename: 'Manifestation-✨-Guide.txt',
          data: Buffer.from('Emoji filename test', 'utf-8')
        }
      ];

      const zipBytes = createZipArchive(entries);
      expect(zipBytes.length).toBeGreaterThan(50);
      expect(zipBytes.readUInt32LE(0)).toBe(0x04034b50);
    });
  });
});

// =============================================================================
// SUITE 4: PDF GENERATOR & WINANSI SANITIZATION HARNESS (lib/pdf-generator.ts)
// =============================================================================
describe('Tier 5 Challenger 1: PDF Generation & WinAnsi Sanitization Probes', () => {

  describe('4.1 isWinAnsiCodePoint Boundaries', () => {
    it('accepts printable ASCII 0x20 to 0x7E', () => {
      expect(isWinAnsiCodePoint(0x20)).toBe(true); // Space
      expect(isWinAnsiCodePoint(0x41)).toBe(true); // 'A'
      expect(isWinAnsiCodePoint(0x7E)).toBe(true); // '~'
    });

    it('rejects control characters 0x00 to 0x1F and 0x7F', () => {
      expect(isWinAnsiCodePoint(0x00)).toBe(false); // Null
      expect(isWinAnsiCodePoint(0x0A)).toBe(false); // Newline
      expect(isWinAnsiCodePoint(0x1F)).toBe(false);
      expect(isWinAnsiCodePoint(0x7F)).toBe(false); // DEL
    });

    it('accepts Latin-1 Supplement 0xA0 to 0xFF', () => {
      expect(isWinAnsiCodePoint(0xA0)).toBe(true); // Non-breaking space
      expect(isWinAnsiCodePoint(0xE9)).toBe(true); // é
      expect(isWinAnsiCodePoint(0xFF)).toBe(true); // ÿ
    });

    it('accepts specific supported Windows-1252 punctuation', () => {
      expect(isWinAnsiCodePoint(0x2013)).toBe(true); // en-dash
      expect(isWinAnsiCodePoint(0x2014)).toBe(true); // em-dash
      expect(isWinAnsiCodePoint(0x20AC)).toBe(true); // euro
      expect(isWinAnsiCodePoint(0x2122)).toBe(true); // tm
      expect(isWinAnsiCodePoint(0x2022)).toBe(true); // bullet
    });

    it('rejects unsupported Unicode points (Cyrillic, CJK, Emoji)', () => {
      expect(isWinAnsiCodePoint(0x0410)).toBe(false); // Cyrillic 'А'
      expect(isWinAnsiCodePoint(0x4E2D)).toBe(false); // CJK '中'
      expect(isWinAnsiCodePoint(0x1F600)).toBe(false); // Emoji 😀
    });
  });

  describe('4.2 sanitizeForPdf Script Transliteration & Boundary Clamping', () => {
    it('returns fallback string for null, undefined, or empty inputs', () => {
      expect(sanitizeForPdf(null)).toBe('Cosmic Seeker');
      expect(sanitizeForPdf(undefined)).toBe('Cosmic Seeker');
      expect(sanitizeForPdf('')).toBe('Cosmic Seeker');
      expect(sanitizeForPdf('   ')).toBe('Cosmic Seeker');
      expect(sanitizeForPdf(12345 as any)).toBe('Cosmic Seeker');
    });

    it('transliterates Greek script accurately', () => {
      expect(sanitizeForPdf('Αριστοτέλης')).toBe('Aristotelis');
    });

    it('transliterates Cyrillic script accurately', () => {
      expect(sanitizeForPdf('Никола Тесла')).toBe('Nikola Tesla');
    });

    it('transliterates Latin special characters and arrows', () => {
      expect(sanitizeForPdf('Łukasz')).toBe('Lukasz');
      expect(sanitizeForPdf('Fear → Abundance')).toBe('Fear -> Abundance');
    });

    it('safely skips surrogate pairs (>0xFFFF) without creating orphaned surrogate chars', () => {
      const emojiName = 'Seeker 🧘‍♂️';
      const sanitized = sanitizeForPdf(emojiName);
      expect(sanitized).toBe('Seeker');
      // Ensure no dangling surrogate pairs
      for (let i = 0; i < sanitized.length; i++) {
        const cp = sanitized.charCodeAt(i);
        expect(cp < 0xD800 || cp > 0xDFFF).toBe(true);
      }
    });

    it('enforces maxLength boundary clamping', () => {
      const veryLong = 'A'.repeat(500);
      const clamped = sanitizeForPdf(veryLong, 50);
      expect(clamped.length).toBe(50);
    });
  });

  describe('4.3 generatePersonalizedBlueprintPdf Generation & Fallback Branches', () => {
    it('synthesizes a valid 3-page PDF document starting with %PDF-', async () => {
      const pdfBytes = await generatePersonalizedBlueprintPdf({
        clientName: 'Nikola Tesla',
        birthDate: '1856-07-10',
        intention: 'Harness the cosmic energy of 3, 6, and 9'
      });

      expect(pdfBytes).toBeInstanceOf(Uint8Array);
      expect(pdfBytes.length).toBeGreaterThan(5000);

      // Verify header magic bytes
      const header = Buffer.from(pdfBytes.slice(0, 5)).toString('ascii');
      expect(header).toBe('%PDF-');
    });

    it('exercises try/catch fallback branch when birthDate is malformed and no numbers provided', async () => {
      const pdfBytes = await generatePersonalizedBlueprintPdf({
        clientName: 'Invalid Date Client',
        birthDate: 'invalid-birth-date' // triggers catch block in numerology calculation
      });

      expect(pdfBytes).toBeInstanceOf(Uint8Array);
      expect(pdfBytes.length).toBeGreaterThan(5000);
    });

    it('renders with all tiers (starter, pro, master, blueprint)', async () => {
      for (const tier of ['starter', 'pro', 'master', 'blueprint']) {
        const bytes = await generatePersonalizedBlueprintPdf({
          clientName: 'Cosmic Seeker',
          tierId: tier
        });
        expect(bytes.length).toBeGreaterThan(5000);
      }
    });
  });
});

// =============================================================================
// SUITE 5: STRIPE GATEWAY GUARD, SIGNATURES & MOCK PIPELINE (lib/stripe.ts)
// =============================================================================
describe('Tier 5 Challenger 1: Stripe Gateway & HMAC Verification Probes', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    orderStore.clear();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('5.1 Gateway Guard Combinatorial Truth Table', () => {
    it('evaluates production environment with mock payments disabled', () => {
      const res = evaluateGatewayGuard({
        NODE_ENV: 'production',
        MOCK_PAYMENTS: 'true',
        ALLOW_MOCK_PAYMENTS_IN_PRODUCTION: 'false'
      });
      expect(res.allowed).toBe(false);
      expect(res.status).toBe(503);
      expect(res.mode).toBe('blocked');
    });

    it('evaluates production environment with mock payments explicitly allowed', () => {
      const res = evaluateGatewayGuard({
        NODE_ENV: 'production',
        MOCK_PAYMENTS: 'true',
        ALLOW_MOCK_PAYMENTS_IN_PRODUCTION: 'true'
      });
      expect(res.allowed).toBe(true);
      expect(res.status).toBe(200);
      expect(res.mode).toBe('mock');
    });

    it('blocks production when STRIPE_SECRET_KEY is missing or placeholder', () => {
      const res1 = evaluateGatewayGuard({
        NODE_ENV: 'production',
        MOCK_PAYMENTS: 'false',
        STRIPE_SECRET_KEY: ''
      });
      expect(res1.allowed).toBe(false);
      expect(res1.status).toBe(503);

      const res2 = evaluateGatewayGuard({
        NODE_ENV: 'production',
        MOCK_PAYMENTS: 'false',
        STRIPE_SECRET_KEY: 'sk_live_placeholder_key_not_configured'
      });
      expect(res2.allowed).toBe(false);
      expect(res2.status).toBe(503);
    });

    it('allows production with a valid live Stripe secret key', () => {
      const res = evaluateGatewayGuard({
        NODE_ENV: 'production',
        MOCK_PAYMENTS: 'false',
        STRIPE_SECRET_KEY: 'sk_live_mock_unit_test_key'
      });
      expect(res.allowed).toBe(true);
      expect(res.status).toBe(200);
      expect(res.mode).toBe('live');
    });

    it('falls back to mock mode in non-production when keys are unconfigured', () => {
      const res = evaluateGatewayGuard({
        NODE_ENV: 'development',
        MOCK_PAYMENTS: 'false',
        STRIPE_SECRET_KEY: ''
      });
      expect(res.allowed).toBe(true);
      expect(res.status).toBe(200);
      expect(res.mode).toBe('mock');
    });

    it('isMockPaymentsEnabled accurately reflects guard status', () => {
      process.env.NODE_ENV = 'development';
      process.env.MOCK_PAYMENTS = 'true';
      expect(isMockPaymentsEnabled()).toBe(true);
    });
  });

  describe('5.2 Tier & Email Validation Boundaries', () => {
    it('isValidTier validates known catalog keys and denies object properties', () => {
      expect(isValidTier('starter')).toBe(true);
      expect(isValidTier('blueprint')).toBe(true);
      expect(isValidTier('pro')).toBe(true);
      expect(isValidTier('master')).toBe(true);

      expect(isValidTier('unknown')).toBe(false);
      expect(isValidTier(null)).toBe(false);
      expect(isValidTier(undefined)).toBe(false);
      expect(isValidTier(123)).toBe(false);
      expect(isValidTier('toString')).toBe(false);
      expect(isValidTier('constructor')).toBe(false);
      expect(isValidTier('__proto__')).toBe(false);
    });

    it('isValidEmail enforces RFC-like basic email boundaries', () => {
      expect(isValidEmail('seeker@369com.co')).toBe(true);
      expect(isValidEmail('user+tag@domain.co.uk')).toBe(true);

      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail('   ')).toBe(false);
      expect(isValidEmail('not-an-email')).toBe(false);
      expect(isValidEmail('missing@domain')).toBe(false);
      expect(isValidEmail('@domain.com')).toBe(false);
      expect(isValidEmail('user@.com')).toBe(false);
      expect(isValidEmail('user name@domain.com')).toBe(false);
      expect(isValidEmail(null)).toBe(false);
      expect(isValidEmail(undefined)).toBe(false);
    });
  });

  describe('5.3 createMockCheckoutSession & Fulfillment Automation', () => {
    it('throws 400 on invalid tier in mock session creation', () => {
      expect(() => createMockCheckoutSession({ tierId: 'invalid' })).toThrow(/Invalid tier/);
    });

    it('throws 400 on invalid email in mock session creation', () => {
      expect(() => createMockCheckoutSession({ tierId: 'starter', customerEmail: 'bad-email' })).toThrow(
        /Invalid customer email/
      );
    });

    it('creates mock checkout session, saves fulfilled order in orderStore, and returns valid url', () => {
      const res = createMockCheckoutSession(
        {
          tierId: 'blueprint',
          customerEmail: 'tesla@369com.co',
          customerName: 'Nikola Tesla',
          intention: 'Electromagnetic Harmony'
        },
        'https://369com.co'
      );

      expect(res.success).toBe(true);
      expect(res.mock).toBe(true);
      expect(res.sessionId).toMatch(/^mock_cs_/);
      expect(res.url).toContain('/success?session_id=');

      // Verify immediate order store fulfillment
      const stored = orderStore.getOrder(res.sessionId);
      expect(stored).toBeDefined();
      expect(stored?.status).toBe('fulfilled');
      expect(stored?.downloadToken).toBeDefined();
      expect(stored?.customerEmail).toBe('tesla@369com.co');
    });
  });

  describe('5.4 Stripe HMAC Signature Verification Probes', () => {
    const testSecret = 'whsec_test_secret_for_cryptographic_verification_32ch';
    const rawPayload = JSON.stringify({ id: 'evt_123', type: 'checkout.session.completed' });

    it('fails when stripe-signature header is missing or empty', () => {
      expect(verifyStripeSignature(rawPayload, '', testSecret).valid).toBe(false);
      expect(verifyStripeSignature(rawPayload, '   ', testSecret).valid).toBe(false);
    });

    it('fails when signature header scheme is malformed', () => {
      expect(verifyStripeSignature(rawPayload, 'invalid_header', testSecret).valid).toBe(false);
      expect(verifyStripeSignature(rawPayload, 't=12345', testSecret).valid).toBe(false);
      expect(verifyStripeSignature(rawPayload, 'v1=abcdef', testSecret).valid).toBe(false);
    });

    it('fails when timestamp is outside the 300s tolerance window', () => {
      const now = Math.floor(Date.now() / 1000);
      const staleTimestamp = now - 305; // 305s ago
      const header = generateStripeSignature(rawPayload, testSecret, staleTimestamp);

      const res = verifyStripeSignature(rawPayload, header, testSecret, 300);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('tolerance');
    });

    it('fails when payload is tampered', () => {
      const now = Math.floor(Date.now() / 1000);
      const header = generateStripeSignature(rawPayload, testSecret, now);

      const tamperedPayload = JSON.stringify({ id: 'evt_123', type: 'tampered' });
      const res = verifyStripeSignature(tamperedPayload, header, testSecret);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('mismatch');
    });

    it('succeeds with valid timestamp and matching HMAC', () => {
      const now = Math.floor(Date.now() / 1000);
      const header = generateStripeSignature(rawPayload, testSecret, now);

      const res = verifyStripeSignature(rawPayload, header, testSecret);
      expect(res.valid).toBe(true);
    });

    it('simulateWebhookEvent generates valid mock events and headers', () => {
      const sim = simulateWebhookEvent({
        tierId: 'master',
        customerEmail: 'albert@369com.co',
        secret: testSecret
      });

      expect(sim.event.type).toBe('checkout.session.completed');
      expect(sim.signatureHeader).toContain('t=');
      expect(sim.signatureHeader).toContain('v1=');

      const check = verifyStripeSignature(sim.rawBody, sim.signatureHeader, testSecret);
      expect(check.valid).toBe(true);
    });
  });
});

// =============================================================================
// SUITE 6: ORDER STORE & DRM TOKEN MANAGEMENT (lib/order-store.ts)
// =============================================================================
describe('Tier 5 Challenger 1: Order Store & Download Token DRM Probes', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    orderStore.clear();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('6.1 InMemoryOrderStore Unit Invariants', () => {
    it('records and checks idempotency events', () => {
      const customStore = new InMemoryOrderStore();
      expect(customStore.hasEvent('evt_1')).toBe(false);
      customStore.recordEvent('evt_1');
      expect(customStore.hasEvent('evt_1')).toBe(true);

      customStore.clear();
      expect(customStore.hasEvent('evt_1')).toBe(false);
    });

    it('stores and retrieves orders by both sessionId and orderId', () => {
      const order = {
        orderId: 'ord_123',
        sessionId: 'cs_123',
        tierId: 'pro',
        customerEmail: 'user@369com.co',
        status: 'fulfilled' as const,
        createdAt: new Date().toISOString()
      };

      orderStore.saveOrder(order);
      expect(orderStore.getOrder('cs_123')).toEqual(order);
      expect(orderStore.getOrderByOrderId('ord_123')).toEqual(order);
      expect(orderStore.getOrder('nonexistent')).toBeUndefined();
    });
  });

  describe('6.2 getDownloadSigningSecret Security Guard', () => {
    it('throws in production if secret is unconfigured or placeholder', () => {
      expect(() => {
        getDownloadSigningSecret({
          NODE_ENV: 'production',
          DOWNLOAD_SIGNING_SECRET: '',
          ALLOW_MOCK_PAYMENTS_IN_PRODUCTION: 'false'
        });
      }).toThrow(/Production security guard/);

      expect(() => {
        getDownloadSigningSecret({
          NODE_ENV: 'production',
          DOWNLOAD_SIGNING_SECRET: 'whsec_placeholder_secret',
          ALLOW_MOCK_PAYMENTS_IN_PRODUCTION: 'false'
        });
      }).toThrow(/Production security guard/);
    });

    it('allows fallback in production if ALLOW_MOCK_PAYMENTS_IN_PRODUCTION is true', () => {
      const secret = getDownloadSigningSecret({
        NODE_ENV: 'production',
        DOWNLOAD_SIGNING_SECRET: '',
        ALLOW_MOCK_PAYMENTS_IN_PRODUCTION: 'true'
      });
      expect(secret).toBe('whsec_fulfillment_token_secret_min_32_characters');
    });

    it('returns custom non-placeholder secret in production', () => {
      const secret = getDownloadSigningSecret({
        NODE_ENV: 'production',
        DOWNLOAD_SIGNING_SECRET: 'my_super_secure_production_secret_key_123'
      });
      expect(secret).toBe('my_super_secure_production_secret_key_123');
    });
  });

  describe('6.3 Download Token Minting, Expiry & Tamper Verification', () => {
    it('mints and validates valid token', () => {
      const token = generateDownloadToken({
        sessionId: 'cs_valid_1',
        tierId: 'blueprint',
        email: 'user@369com.co'
      });

      const verified = verifyDownloadToken(token);
      expect(verified.valid).toBe(true);
      expect(verified.claims.sessionId).toBe('cs_valid_1');
      expect(verified.claims.tierId).toBe('blueprint');
    });

    it('rejects malformed token strings', () => {
      expect(verifyDownloadToken('').valid).toBe(false);
      expect(verifyDownloadToken(null as any).valid).toBe(false);
      expect(verifyDownloadToken('part1.part2').valid).toBe(false);
      expect(verifyDownloadToken('part1.part2.part3.part4').valid).toBe(false);
    });

    it('rejects token signed with mismatched secret', () => {
      const token = generateDownloadToken(
        { sessionId: 'cs_test', tierId: 'blueprint', email: 'test@369com.co' },
        'secret_one'
      );

      const check = verifyDownloadToken(token, 'secret_two');
      expect(check.valid).toBe(false);
      expect(check.error).toContain('invalid or tampered');
    });

    it('rejects expired tokens', () => {
      // Mint token with negative expiration (-10 seconds)
      const token = generateDownloadToken(
        { sessionId: 'cs_expired', tierId: 'starter', email: 'exp@369com.co' },
        undefined,
        -10
      );

      const check = verifyDownloadToken(token);
      expect(check.valid).toBe(false);
      expect(check.error).toContain('expired');
    });

    it('rejects token with corrupted JSON payload', () => {
      const header = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url');
      const badPayload = Buffer.from('NOT_VALID_JSON').toString('base64url');
      const secret = 'whsec_fulfillment_token_secret_min_32_characters';
      const { createHmac } = require('crypto');
      const sig = createHmac('sha256', secret).update(`${header}.${badPayload}`).digest('base64url');
      const corruptedToken = `${header}.${badPayload}.${sig}`;

      const check = verifyDownloadToken(corruptedToken, secret);
      expect(check.valid).toBe(false);
      expect(check.error).toContain('decode token payload JSON');
    });
  });
});

// =============================================================================
// SUITE 7: FULL API ROUTES WHITE-BOX VERIFICATION (app/api/*)
// =============================================================================
describe('Tier 5 Challenger 1: API Route Handlers White-Box Verification', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    orderStore.clear();
    process.env = { ...originalEnv };
    process.env.MOCK_PAYMENTS = 'true';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('7.1 POST & GET /api/checkout', () => {
    it('POST /api/checkout returns 400 when body is not valid JSON or is an array', async () => {
      const reqBadJson = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'NOT_JSON'
      });
      const res1 = await checkoutPost(reqBadJson);
      expect(res1.status).toBe(400);

      const reqArray = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{ tierId: 'starter' }])
      });
      const res2 = await checkoutPost(reqArray);
      expect(res2.status).toBe(400);
    });

    it('POST /api/checkout returns 400 on invalid tier or invalid customer email', async () => {
      const reqTier = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tierId: 'invalid_tier' })
      });
      expect((await checkoutPost(reqTier)).status).toBe(400);

      const reqEmail = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tierId: 'starter', customerEmail: 'bad-email' })
      });
      expect((await checkoutPost(reqEmail)).status).toBe(400);
    });

    it('POST /api/checkout succeeds in sandbox mode returning 200 and session URL', async () => {
      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'origin': 'https://369com.co'
        },
        body: JSON.stringify({
          tierId: 'blueprint',
          customerEmail: 'seeker@369com.co',
          intention: 'Manifestation of abundance'
        })
      });

      const res = await checkoutPost(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.sessionId).toBeDefined();
      expect(data.url).toContain('/success?session_id=');
    });

    it('GET /api/checkout redirects to success in sandbox mode', async () => {
      const req = new NextRequest('http://localhost:3000/api/checkout?tierId=pro&customerEmail=user@369com.co', {
        method: 'GET'
      });

      const res = await checkoutGet(req);
      expect(res.status).toBe(307); // NextResponse.redirect
      expect(res.headers.get('location')).toContain('/success?session_id=');
    });

    it('GET /api/checkout returns 400 for invalid tier', async () => {
      const req = new NextRequest('http://localhost:3000/api/checkout?tierId=bad', {
        method: 'GET'
      });
      const res = await checkoutGet(req);
      expect(res.status).toBe(400);
    });
  });

  describe('7.2 POST /api/webhook/stripe', () => {
    const webhookSecret = 'whsec_placeholder_secret_for_testing';

    it('returns 400 when stripe-signature header is missing', async () => {
      const req = new NextRequest('http://localhost:3000/api/webhook/stripe', {
        method: 'POST',
        body: JSON.stringify({ id: 'evt_1' })
      });
      const res = await webhookPost(req);
      expect(res.status).toBe(400);
    });

    it('returns 400 when body is empty', async () => {
      const req = new NextRequest('http://localhost:3000/api/webhook/stripe', {
        method: 'POST',
        headers: { 'stripe-signature': 't=123,v1=abc' },
        body: ''
      });
      const res = await webhookPost(req);
      expect(res.status).toBe(400);
    });

    it('processes checkout.session.completed event and records order', async () => {
      const sim = simulateWebhookEvent({
        tierId: 'blueprint',
        sessionId: 'cs_webhook_order_1',
        secret: webhookSecret
      });

      const req = new NextRequest('http://localhost:3000/api/webhook/stripe', {
        method: 'POST',
        headers: { 'stripe-signature': sim.signatureHeader },
        body: sim.rawBody
      });

      const res = await webhookPost(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.received).toBe(true);

      // Verify order store has the fulfilled order
      const order = orderStore.getOrder('cs_webhook_order_1');
      expect(order).toBeDefined();
      expect(order?.status).toBe('fulfilled');

      // Replay same event -> should return already_processed: true (idempotency)
      const reqReplay = new NextRequest('http://localhost:3000/api/webhook/stripe', {
        method: 'POST',
        headers: { 'stripe-signature': sim.signatureHeader },
        body: sim.rawBody
      });
      const resReplay = await webhookPost(reqReplay);
      expect(resReplay.status).toBe(200);
      const replayData = await resReplay.json();
      expect(replayData.already_processed).toBe(true);
    });
  });

  describe('7.3 GET /api/download', () => {
    it('returns 401 when token parameter is missing', async () => {
      const req = new NextRequest('http://localhost:3000/api/download', {
        method: 'GET'
      });
      const res = await downloadGet(req);
      expect(res.status).toBe(401);
    });

    it('returns 401 when token is invalid or tampered', async () => {
      const req = new NextRequest('http://localhost:3000/api/download?token=invalid.tampered.token', {
        method: 'GET'
      });
      const res = await downloadGet(req);
      expect(res.status).toBe(401);
    });

    it('serves PDF for blueprint tier', async () => {
      const token = generateDownloadToken({
        sessionId: 'cs_download_test',
        tierId: 'blueprint',
        email: 'user@369com.co',
        name: 'Nikola Tesla'
      });

      const req = new NextRequest(`http://localhost:3000/api/download?token=${token}`, {
        method: 'GET'
      });

      const res = await downloadGet(req);
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toBe('application/pdf');
      expect(res.headers.get('content-disposition')).toContain('Tesla-369-Manifestation-Blueprint.pdf');
    });

    it('serves ZIP archive for master tier', async () => {
      const token = generateDownloadToken({
        sessionId: 'cs_master_download',
        tierId: 'master',
        email: 'user@369com.co',
        name: 'Master Seeker'
      });

      const req = new NextRequest(`http://localhost:3000/api/download?token=${token}`, {
        method: 'GET'
      });

      const res = await downloadGet(req);
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toBe('application/zip');
      expect(res.headers.get('content-disposition')).toContain('369-Master-Sanctuary-Suite.zip');
    });

    it('serves PDF for master tier when asset=pdf query parameter is passed', async () => {
      const token = generateDownloadToken({
        sessionId: 'cs_master_pdf_only',
        tierId: 'master',
        email: 'user@369com.co',
        name: 'Master Seeker'
      });

      const req = new NextRequest(`http://localhost:3000/api/download?token=${token}&asset=pdf`, {
        method: 'GET'
      });

      const res = await downloadGet(req);
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toBe('application/pdf');
    });
  });

  describe('7.4 GET /api/order/status', () => {
    it('returns 400 when session_id parameter is missing', async () => {
      const req = new NextRequest('http://localhost:3000/api/order/status', {
        method: 'GET'
      });
      const res = await orderStatusGet(req);
      expect(res.status).toBe(400);
    });

    it('returns fulfilled status for stored order', async () => {
      orderStore.saveOrder({
        orderId: 'ord_status_test',
        sessionId: 'cs_status_test',
        tierId: 'blueprint',
        customerEmail: 'status@369com.co',
        status: 'fulfilled',
        createdAt: new Date().toISOString(),
        downloadToken: 'valid_token'
      });

      const req = new NextRequest('http://localhost:3000/api/order/status?session_id=cs_status_test', {
        method: 'GET'
      });

      const res = await orderStatusGet(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe('fulfilled');
      expect(data.downloadUrl).toContain('/api/download?token=valid_token');
    });

    it('auto-fulfills mock session IDs deterministically', async () => {
      const req = new NextRequest('http://localhost:3000/api/order/status?session_id=mock_cs_auto_fulfill_99', {
        method: 'GET'
      });

      const res = await orderStatusGet(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe('fulfilled');
      expect(data.downloadUrl).toContain('/api/download?token=');
    });

    it('returns status pending for unknown live session IDs', async () => {
      const req = new NextRequest('http://localhost:3000/api/order/status?session_id=cs_live_unknown_123', {
        method: 'GET'
      });

      const res = await orderStatusGet(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe('pending');
    });
  });
});

// =============================================================================
// SUITE 8: STORAGE SUBSYSTEM & UTILITIES (lib/storage.ts & lib/utils.ts)
// =============================================================================
describe('Tier 5 Challenger 1: Storage Subsystem & Utility Probes', () => {

  it('getTodayKey outputs valid YYYY-MM-DD pattern', () => {
    const key = getTodayKey();
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('createEmptyDailyEntry produces exact 3-6-9 slot arrays', () => {
    const entry = createEmptyDailyEntry('2026-11-13', 'Master intention', 'wealth');
    expect(entry.morning).toHaveLength(3);
    expect(entry.afternoon).toHaveLength(6);
    expect(entry.evening).toHaveLength(9);
    expect(entry.isDayComplete).toBe(false);
  });

  it('recalculateStreak accurately evaluates streak increments and broken streaks', () => {
    const today = '2026-11-13';
    const yesterday = '2026-11-12';
    const dayBefore = '2026-11-11';

    let profile = getDefaultProfile();

    // Day 1: complete yesterday
    const e1 = createEmptyDailyEntry(yesterday);
    e1.isDayComplete = true;
    profile.history[yesterday] = e1;

    recalculateStreak(profile, today);
    expect(profile.activeStreak).toBe(1);

    // Day 2: complete day before yesterday as well
    const e0 = createEmptyDailyEntry(dayBefore);
    e0.isDayComplete = true;
    profile.history[dayBefore] = e0;

    recalculateStreak(profile, today);
    expect(profile.activeStreak).toBe(2);

    // If today is completed too
    const eToday = createEmptyDailyEntry(today);
    eToday.isDayComplete = true;
    profile.history[today] = eToday;

    recalculateStreak(profile, today);
    expect(profile.activeStreak).toBe(3);
    expect(profile.longestStreak).toBe(3);

    // Broken streak: skip a day
    const muchLater = '2026-11-20';
    recalculateStreak(profile, muchLater);
    expect(profile.activeStreak).toBe(0);
    expect(profile.longestStreak).toBe(3); // Longest preserved
  });

  it('cn helper cleanly merges and deduplicates Tailwind class names', () => {
    expect(cn('px-4', 'py-2', false && 'hidden', null, undefined)).toBe('px-4 py-2');
    expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500'); // Tailwind merge override
  });
});
