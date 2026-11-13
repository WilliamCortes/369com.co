/**
 * Test Helpers & Specification Oracle for 369com.co E2E Test Suite
 * 
 * Provides reference implementations of interface contracts, cryptographic utilities,
 * and deterministic mock state for verifying all features F1 through F11.
 */

import { createHmac } from 'crypto';

// -----------------------------------------------------------------------------
// Interface Contracts (derived from PROJECT.md & spec.md)
// -----------------------------------------------------------------------------

export interface NumerologyResult {
  lifePath: number;
  destinyNumber: number;
  resonance369Score: number;
  dominantElement: string;
  powerIntention: string;
  teslaNode?: 3 | 6 | 9;
}

export interface PricingTier {
  id: 'starter' | 'pro' | 'master' | 'blueprint';
  name: string;
  price: number;
  cents: number;
  currency: 'usd';
  features: string[];
}

export interface ManifestationEntry {
  text: string;
  completedAt?: string;
}

export interface ManifestationSession {
  date: string;
  morning: string[];    // exactly 3 entries
  afternoon: string[];  // exactly 6 entries
  evening: string[];    // exactly 9 entries
  streak: number;
  isComplete: boolean;
}

export interface CheckoutRequest {
  tierId: string;
  customerEmail?: string;
  intention?: string;
  numerologyData?: Partial<NumerologyResult>;
}

export interface CheckoutResponse {
  success: boolean;
  url: string;
  sessionId: string;
}

export interface OrderRecord {
  orderId: string;
  sessionId: string;
  tierId: string;
  customerEmail: string;
  intention?: string;
  status: 'pending' | 'fulfilled' | 'refunded';
  createdAt: string;
  downloadToken?: string;
}

// -----------------------------------------------------------------------------
// Product Catalog (Authoritative Specification from PROJECT.md & spec.md)
// -----------------------------------------------------------------------------

export const PRODUCT_CATALOG: Record<string, PricingTier> = {
  starter: {
    id: 'starter',
    name: '369 Manifestation Starter Blueprint',
    price: 4.99,
    cents: 499,
    currency: 'usd',
    features: [
      '33-Day Nikola Tesla 369 Ritual Guide',
      'Printable Morning/Noon/Night Affirmation Worksheets',
      'Basic Pythagorean Numerology Summary'
    ]
  },
  blueprint: {
    id: 'blueprint',
    name: 'Personalized Tesla 369 Manifestation Blueprint',
    price: 7.99,
    cents: 799,
    currency: 'usd',
    features: [
      'Personalized Dynamic 15+ Page Dossier',
      'Life Path & Tesla Vortex Node Breakdown',
      '33-Day Custom Scripting Matrix',
      'High-Definition 369Hz Harmonic Audio (MP3)'
    ]
  },
  pro: {
    id: 'pro',
    name: '369 Frequency Suite & Pro Blueprint',
    price: 9.99,
    cents: 999,
    currency: 'usd',
    features: [
      'Complete Personalized Blueprint',
      'High-Definition 369Hz Solfeggio Audio (Lossless WAV/MP3)',
      'Interactive Digital Manifestation Journal Access',
      'Printable Daily Sacred Geometry Worksheets'
    ]
  },
  master: {
    id: 'master',
    name: '369 Master Sanctuary Kit',
    price: 19.99,
    cents: 1999,
    currency: 'usd',
    features: [
      'Lifetime Master Access',
      'Complete 9-Frequency Solfeggio Suite (174Hz to 963Hz)',
      'Personalized AI Affirmation Matrix',
      '45-Day Sacred Geometry Tactile Workbook (PDF)',
      'The Nikola Tesla Vortex Code Deconstructed Guide'
    ]
  }
};

// -----------------------------------------------------------------------------
// Pythagorean & Tesla Numerology Specification Oracle (F4)
// -----------------------------------------------------------------------------

export function reduceToDigitalRoot(n: number, preserveMasterNumbers = true): number {
  if (preserveMasterNumbers && (n === 11 || n === 22 || n === 33)) {
    return n;
  }
  while (n > 9) {
    if (preserveMasterNumbers && (n === 11 || n === 22 || n === 33)) {
      return n;
    }
    n = String(n)
      .split('')
      .reduce((acc, digit) => acc + parseInt(digit, 10), 0);
  }
  return n;
}

export function calculateLifePath(birthDate: string): number {
  // birthDate expected format: YYYY-MM-DD or YYYY-M-D
  const cleaned = birthDate.replace(/[^0-9]/g, '');
  if (cleaned.length < 8) {
    throw new Error('Invalid birth date format. Expected YYYY-MM-DD');
  }
  const sum = cleaned
    .split('')
    .reduce((acc, digit) => acc + parseInt(digit, 10), 0);
  return reduceToDigitalRoot(sum, true);
}

export const PYTHAGOREAN_TABLE: Record<string, number> = {
  A: 1, J: 1, S: 1,
  B: 2, K: 2, T: 2,
  C: 3, L: 3, U: 3,
  D: 4, M: 4, V: 4,
  E: 5, N: 5, W: 5,
  F: 6, O: 6, X: 6,
  G: 7, P: 7, Y: 7,
  H: 8, Q: 8, Z: 8,
  I: 9, R: 9
};

export function calculateDestinyNumber(fullName: string): number {
  const normalized = fullName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .toUpperCase()
    .replace(/[^A-Z]/g, ''); // keep letters only

  if (normalized.length === 0) {
    throw new Error('Full name must contain at least one alphabetic character');
  }

  const sum = normalized
    .split('')
    .reduce((acc, char) => acc + (PYTHAGOREAN_TABLE[char] || 0), 0);

  return reduceToDigitalRoot(sum, true);
}

export function calculateTeslaVortexScore(lifePath: number, destiny: number): number {
  const isTeslaNode = (n: number) => n === 3 || n === 6 || n === 9 || n === 33;
  let score = 70; // baseline alignment

  if (isTeslaNode(lifePath)) score += 15;
  if (isTeslaNode(destiny)) score += 12;

  // Composite digital root
  const composite = reduceToDigitalRoot(lifePath + destiny, false);
  if (composite === 3 || composite === 6 || composite === 9) {
    score += 8;
  }

  // Cap at 99% for human modesty, minimum 72%
  return Math.min(99, Math.max(72, score));
}

export function calculateNumerologyOracle(fullName: string, birthDate: string): NumerologyResult {
  const lifePath = calculateLifePath(birthDate);
  const destinyNumber = calculateDestinyNumber(fullName);
  const resonance369Score = calculateTeslaVortexScore(lifePath, destinyNumber);

  // Derive dominant element
  let dominantElement = 'Ether';
  const baseNum = reduceToDigitalRoot(lifePath, false);
  if ([1, 3, 9].includes(baseNum)) dominantElement = 'Fire / Solar';
  else if ([2, 7].includes(baseNum)) dominantElement = 'Water / Astral';
  else if ([4, 8].includes(baseNum)) dominantElement = 'Earth / Crystalline';
  else if ([5, 6].includes(baseNum)) dominantElement = 'Air / Sonic';

  // Determine Tesla node
  let teslaNode: 3 | 6 | 9 = 9;
  if ([3, 1, 4, 7].includes(baseNum)) teslaNode = 3;
  else if ([6, 2, 5, 8].includes(baseNum)) teslaNode = 6;
  else teslaNode = 9;

  return {
    lifePath,
    destinyNumber,
    resonance369Score,
    dominantElement,
    powerIntention: 'Universal Abundance & Creative Manifestation',
    teslaNode
  };
}

// -----------------------------------------------------------------------------
// Web Audio Synthesizer Mathematical Utilities (F3)
// -----------------------------------------------------------------------------

export const SOLFEGGIO_FREQUENCIES = {
  UT: 396,   // Liberating Guilt and Fear
  RE: 417,   // Undoing Situations and Facilitating Change
  MI: 528,   // Transformation and Miracles (DNA Repair)
  FA: 639,   // Connecting / Relationships
  SOL: 741,  // Expression / Solutions
  LA: 852,   // Returning to Spiritual Order
  SI: 963,   // Pineal / Divine Connection
  TESLA: 369 // The 369 Tesla Harmonic Resonance
} as const;

export function calculateBinauralBeat(baseFreq: number, targetBeat: number) {
  if (baseFreq < 20 || baseFreq > 20000) {
    throw new Error('Base frequency outside audible human range (20Hz - 20000Hz)');
  }
  const beat = Math.max(0, targetBeat);
  return {
    carrierLeft: baseFreq,
    carrierRight: baseFreq + beat,
    beatFrequency: beat,
    brainwaveBand: beat <= 4 ? 'Delta' : beat <= 8 ? 'Theta' : beat <= 13 ? 'Alpha' : 'Beta'
  };
}

// -----------------------------------------------------------------------------
// Cryptographic Webhook Signatures & Token DRM (F7, F8, F9)
// -----------------------------------------------------------------------------

export function generateStripeSignature(
  rawBody: string,
  secret: string,
  timestamp: number = Math.floor(Date.now() / 1000)
): string {
  const signaturePayload = `${timestamp}.${rawBody}`;
  const hmac = createHmac('sha256', secret).update(signaturePayload).digest('hex');
  return `t=${timestamp},v1=${hmac}`;
}

export function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string,
  toleranceSec = 300
): { valid: boolean; error?: string } {
  if (!signatureHeader) {
    return { valid: false, error: 'Missing stripe-signature header' };
  }

  const parts = signatureHeader.split(',').reduce<Record<string, string>>((acc, item) => {
    const [k, v] = item.split('=');
    if (k && v) acc[k.trim()] = v.trim();
    return acc;
  }, {});

  const t = parseInt(parts['t'] || '0', 10);
  const v1 = parts['v1'];

  if (!t || !v1) {
    return { valid: false, error: 'Malformed stripe-signature header scheme' };
  }

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - t) > toleranceSec) {
    return { valid: false, error: 'Webhook signature verification failed: Timestamp outside the tolerance zone' };
  }

  const expectedHmac = createHmac('sha256', secret).update(`${t}.${rawBody}`).digest('hex');
  if (expectedHmac !== v1) {
    return { valid: false, error: 'Webhook signature verification failed: Signature mismatch' };
  }

  return { valid: true };
}

export function generateDownloadToken(
  claims: { sessionId: string; tierId: string; email: string },
  secret: string,
  expiresInSec = 86400
): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({
      ...claims,
      iat: now,
      exp: now + expiresInSec
    })
  ).toString('base64url');

  const signature = createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

export function verifyDownloadToken(
  token: string,
  secret: string
): { valid: boolean; claims?: any; error?: string } {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Invalid or missing token string' };
  }

  const segments = token.split('.');
  if (segments.length !== 3) {
    return { valid: false, error: 'Malformed token structure' };
  }

  const [header, payload, signature] = segments;
  const expectedSig = createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');

  if (expectedSig !== signature) {
    return { valid: false, error: 'Download token invalid or tampered' };
  }

  try {
    const parsedPayload = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
    const now = Math.floor(Date.now() / 1000);
    if (parsedPayload.exp && parsedPayload.exp < now) {
      return { valid: false, error: 'Download token has expired' };
    }
    return { valid: true, claims: parsedPayload };
  } catch {
    return { valid: false, error: 'Failed to decode token payload JSON' };
  }
}

// -----------------------------------------------------------------------------
// In-Memory Storage & Mock Session Simulator (F2, F6, F7, F8)
// -----------------------------------------------------------------------------

export class MockLocalStorage {
  private store: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get length(): number {
    return this.store.size;
  }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys());
    return keys[index] ?? null;
  }
}

export class OrderStoreOracle {
  private orders: Map<string, OrderRecord> = new Map();
  private processedEvents: Set<string> = new Set();

  hasEvent(eventId: string): boolean {
    return this.processedEvents.has(eventId);
  }

  recordEvent(eventId: string): void {
    this.processedEvents.add(eventId);
  }

  saveOrder(order: OrderRecord): void {
    this.orders.set(order.sessionId, order);
  }

  getOrder(sessionId: string): OrderRecord | undefined {
    return this.orders.get(sessionId);
  }

  clear(): void {
    this.orders.clear();
    this.processedEvents.clear();
  }
}
