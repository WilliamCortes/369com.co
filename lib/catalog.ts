export interface PricingTier {
  id: string;
  name: string;
  price: number;
  cents: number;
  currency: 'usd';
  features: string[];
}

export const PRODUCT_CATALOG: Record<string, PricingTier> = {
  starter: {
    id: 'starter',
    name: '369 Manifestation Starter Blueprint',
    price: 4.99,
    cents: process.env.PRICE_STARTER_CENTS ? parseInt(process.env.PRICE_STARTER_CENTS, 10) : 499,
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
    cents: process.env.PRICE_PRO_CENTS ? parseInt(process.env.PRICE_PRO_CENTS, 10) : 999,
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
    cents: process.env.PRICE_MASTER_CENTS ? parseInt(process.env.PRICE_MASTER_CENTS, 10) : 1999,
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

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidTier(tierId: unknown): tierId is keyof typeof PRODUCT_CATALOG {
  return typeof tierId === 'string' && Object.prototype.hasOwnProperty.call(PRODUCT_CATALOG, tierId);
}

export function isValidEmail(email: unknown): boolean {
  if (typeof email !== 'string') return false;
  const trimmed = email.trim();
  return Boolean(trimmed) && EMAIL_REGEX.test(trimmed);
}

export interface NumerologySnapshot {
  birthDate?: string;
  lifePath?: number;
  lifePathTitle?: string;
  teslaNode?: number;
  resonance369Score?: number;
  dominantElement?: string;
}

export interface CheckoutRequest {
  tierId: string;
  customerEmail?: string;
  customerName?: string;
  intention?: string;
  numerologyData?: NumerologySnapshot & Record<string, any>;
}

export interface CheckoutResponse {
  success: boolean;
  sessionId: string;
  url: string;
  mock?: boolean;
  provider?: 'polar' | 'stripe' | 'mock';
}

/**
 * Reconstructs typed numerology snapshot from flat payment-provider metadata.
 */
export function extractNumerologyMetadata(
  metadata?: Record<string, unknown> | null
): NumerologySnapshot | undefined {
  if (!metadata) return undefined;

  const parseNum = (val: unknown): number | undefined => {
    if (typeof val === 'number' && Number.isFinite(val)) return val;
    if (typeof val === 'string' && val.trim() !== '') {
      const parsed = Number(val);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
  };

  const str = (val: unknown): string | undefined =>
    typeof val === 'string' && val.trim() ? val.trim() : undefined;

  const snapshot: NumerologySnapshot = {
    birthDate: str(metadata.birthDate),
    lifePath: parseNum(metadata.lifePath),
    lifePathTitle: str(metadata.lifePathTitle),
    teslaNode: parseNum(metadata.teslaNode),
    resonance369Score: parseNum(metadata.resonanceScore ?? metadata.resonance369Score),
    dominantElement: str(metadata.dominantElement)
  };

  return Object.values(snapshot).some((v) => v !== undefined) ? snapshot : undefined;
}

export const DEFAULT_BREB_KEY = '@3103298346';
export const DEFAULT_USD_TO_COP = 4200;

export function getPublicBrebKey(): string {
  return process.env.NEXT_PUBLIC_BREB_KEY?.trim() || DEFAULT_BREB_KEY;
}

export function getUsdToCopRate(): number {
  const raw = process.env.NEXT_PUBLIC_BREB_USD_TO_COP || process.env.BRE_B_USD_TO_COP;
  const parsed = raw ? parseFloat(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_USD_TO_COP;
}

export function getCopAmountForTier(tierId: string, rate: number = getUsdToCopRate()): number {
  const tier = PRODUCT_CATALOG[tierId] || PRODUCT_CATALOG.blueprint;
  // Round to nearest 100 COP for clean instant bank transfers
  return Math.round((tier.price * rate) / 100) * 100;
}

export function formatCop(amountCop: number): string {
  return `$${amountCop.toLocaleString('es-CO')} COP`;
}

