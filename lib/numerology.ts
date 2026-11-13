/**
 * Pythagorean & Nikola Tesla Vortex Numerology Calculation Engine
 * lib/numerology.ts
 */

export interface NumerologyResult {
  // Required Contract (PROJECT.md M1 ↔ M2 contract)
  lifePath: number;
  destinyNumber: number;
  resonance369Score: number;
  dominantElement: string;
  powerIntention: string;

  // Extended Properties for UI, PDF & Audio integration
  teslaTriadNode: 3 | 6 | 9;
  teslaNode?: 3 | 6 | 9; // backward/cross-test compatibility
  soulUrgeNumber: number;
  personalityNumber: number;
  isMasterNumber: boolean;
  solfeggioFrequencyHz: number;
  lifePathTitle: string;
  destinyTitle: string;
}

export const NUMBER_TITLES: Record<number, string> = {
  1: 'The Independent Pioneer',
  2: 'The Intuitive Diplomat',
  3: 'The Creative Catalyst',
  4: 'The Master Builder',
  5: 'The Dynamic Visionary',
  6: 'The Sacred Harmonizer',
  7: 'The Mystic Seeker',
  8: 'The Sovereign Manifestor',
  9: 'The Universal Master',
  11: 'Master Illuminator (11)',
  22: 'Master Architect (22)',
  33: 'Master Spiritual Teacher (33)',
};

/**
 * Normalizes input name: strips diacritics, removes non-alphabetic chars, converts to uppercase.
 */
export function normalizeName(name: string): string {
  if (!name || typeof name !== 'string') return '';
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
}

/**
 * Computes Pythagorean letter value (1-9) for ASCII A-Z.
 */
export function getCharValue(char: string): number {
  const code = char.charCodeAt(0);
  if (code < 65 || code > 90) return 0;
  return ((code - 65) % 9) + 1;
}

/**
 * Reduces a positive integer to a single digit (1-9), preserving Master Numbers (11, 22, 33).
 */
export function reduceToRootOrMaster(n: number, preserveMaster = true): number {
  if (!Number.isInteger(n) || n < 0) {
    throw new Error(`Invalid number for reduction: ${n}`);
  }
  while (n > 9) {
    if (preserveMaster && (n === 11 || n === 22 || n === 33)) {
      break;
    }
    let sum = 0;
    let temp = n;
    while (temp > 0) {
      sum += temp % 10;
      temp = Math.floor(temp / 10);
    }
    n = sum;
  }
  return n;
}

/**
 * Calculates Life Path Number from birthdate string (YYYY-MM-DD or digit string).
 */
export function calculateLifePath(birthDate: string): number {
  if (!birthDate || typeof birthDate !== 'string') {
    throw new Error('Invalid birth date: must be a non-empty string');
  }
  const digits = birthDate.replace(/\D/g, '');
  if (digits.length < 8) {
    throw new Error('Invalid birth date format: expected YYYY-MM-DD with at least 8 digits');
  }
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    sum += parseInt(digits[i], 10);
  }
  return reduceToRootOrMaster(sum, true);
}

/**
 * Calculates Destiny (Expression) Number from full name.
 */
export function calculateDestiny(fullName: string): number {
  const normalized = normalizeName(fullName);
  if (!normalized) {
    throw new Error('Invalid name: must contain at least one alphabetic character');
  }
  let sum = 0;
  for (let i = 0; i < normalized.length; i++) {
    sum += getCharValue(normalized[i]);
  }
  return reduceToRootOrMaster(sum, true);
}

/**
 * Calculates Soul Urge Number (vowels sum: A, E, I, O, U).
 */
export function calculateSoulUrge(fullName: string): number {
  const normalized = normalizeName(fullName);
  const vowels = new Set(['A', 'E', 'I', 'O', 'U']);
  let sum = 0;
  for (let i = 0; i < normalized.length; i++) {
    if (vowels.has(normalized[i])) {
      sum += getCharValue(normalized[i]);
    }
  }
  return sum > 0 ? reduceToRootOrMaster(sum, true) : 0;
}

/**
 * Calculates Personality Number (consonants sum).
 */
export function calculatePersonality(fullName: string): number {
  const normalized = normalizeName(fullName);
  const vowels = new Set(['A', 'E', 'I', 'O', 'U']);
  let sum = 0;
  for (let i = 0; i < normalized.length; i++) {
    if (!vowels.has(normalized[i])) {
      sum += getCharValue(normalized[i]);
    }
  }
  return sum > 0 ? reduceToRootOrMaster(sum, true) : 0;
}

/**
 * Assigns primary Tesla Triad Node (3, 6, or 9).
 */
export function assignTeslaNode(lifePath: number, destiny: number): 3 | 6 | 9 {
  const lpRoot = reduceToRootOrMaster(lifePath, false);
  const destRoot = reduceToRootOrMaster(destiny, false);
  const sumRoot = reduceToRootOrMaster(lpRoot + destRoot, false);

  if (lpRoot === 9 || destRoot === 9 || sumRoot === 9) return 9;
  if (lpRoot === 6 || destRoot === 6 || sumRoot === 6) return 6;
  if (lpRoot === 3 || destRoot === 3 || sumRoot === 3) return 3;
  if (lpRoot === 1 || lpRoot === 2 || lpRoot === 4) return 3;
  return 6;
}

/**
 * Calculates the Tesla Vortex 3-6-9 Resonance Index percentage (50-99%).
 */
export function calculateResonance369(
  fullName: string,
  birthDate: string,
  lifePath: number,
  destiny: number
): number {
  const base = 50;
  const lpRoot = reduceToRootOrMaster(lifePath, false);
  const destRoot = reduceToRootOrMaster(destiny, false);

  let lpPts = 9;
  if (lifePath === 33 || lpRoot === 9) lpPts = 18;
  else if (lpRoot === 6) lpPts = 15;
  else if (lpRoot === 3) lpPts = 12;
  else if (lifePath === 11 || lifePath === 22) lpPts = 16;

  let destPts = 9;
  if (destiny === 33 || destRoot === 9) destPts = 18;
  else if (destRoot === 6) destPts = 15;
  else if (destRoot === 3) destPts = 12;
  else if (destiny === 11 || destiny === 22) destPts = 16;

  const synergyRoot = reduceToRootOrMaster(lpRoot + destRoot, false);
  const synergyPts = synergyRoot === 3 || synergyRoot === 6 || synergyRoot === 9 ? 10 : 5;

  const normalized = normalizeName(fullName);
  const digits = birthDate.replace(/\D/g, '');
  let c369Letters = 0;
  for (let i = 0; i < normalized.length; i++) {
    const v = getCharValue(normalized[i]);
    if (v === 3 || v === 6 || v === 9) c369Letters++;
  }
  let c369Digits = 0;
  for (let i = 0; i < digits.length; i++) {
    const d = parseInt(digits[i], 10);
    if (d === 3 || d === 6 || d === 9) c369Digits++;
  }

  const totalChars = Math.max(1, normalized.length + digits.length);
  const densityRatio = (c369Letters + c369Digits) / totalChars;
  const densityPts = Math.round(4 * densityRatio);

  return Math.min(99, base + lpPts + destPts + synergyPts + densityPts);
}

export function getDominantElement(lifePath: number, teslaNode: 3 | 6 | 9): string {
  if (lifePath === 4 || lifePath === 8 || lifePath === 22) return 'Earth';
  if (lifePath === 9 || lifePath === 11 || lifePath === 33 || teslaNode === 9) return 'Ether';
  if (teslaNode === 6) return 'Water';
  if (teslaNode === 3) return 'Fire';
  return 'Air';
}

export function getPowerIntention(lifePath: number, teslaNode: 3 | 6 | 9): string {
  if (lifePath === 4 || lifePath === 8 || lifePath === 22) {
    return 'Abundance & Financial Sovereignty';
  }
  if (lifePath === 2 || lifePath === 6 || lifePath === 33 || teslaNode === 6) {
    return 'Divine Love & Harmonic Relationship';
  }
  if (lifePath === 1 || lifePath === 3 || lifePath === 5 || teslaNode === 3) {
    return 'Vital Energy & Cellular Regeneration';
  }
  return 'Life Purpose & Creative Mastery';
}

export function getSolfeggioFrequency(teslaNode: 3 | 6 | 9): number {
  switch (teslaNode) {
    case 3:
      return 369; // 369Hz Tesla Harmonic
    case 6:
      return 528; // 528Hz Transformation & Cellular Flow
    case 9:
      return 963; // 963Hz Crown Activation & Divine Cosmos
  }
}

/**
 * Primary Unified Entry Point fulfilling M1 ↔ M2 Contract
 */
export function calculateNumerology(fullName: string, birthDate: string): NumerologyResult {
  const lifePath = calculateLifePath(birthDate);
  const destinyNumber = calculateDestiny(fullName);
  const teslaTriadNode = assignTeslaNode(lifePath, destinyNumber);
  const resonance369Score = calculateResonance369(fullName, birthDate, lifePath, destinyNumber);
  const dominantElement = getDominantElement(lifePath, teslaTriadNode);
  const powerIntention = getPowerIntention(lifePath, teslaTriadNode);
  const soulUrgeNumber = calculateSoulUrge(fullName);
  const personalityNumber = calculatePersonality(fullName);
  const solfeggioFrequencyHz = getSolfeggioFrequency(teslaTriadNode);
  const isMasterNumber =
    [11, 22, 33].includes(lifePath) || [11, 22, 33].includes(destinyNumber);

  return {
    lifePath,
    destinyNumber,
    resonance369Score,
    dominantElement,
    powerIntention,
    teslaTriadNode,
    teslaNode: teslaTriadNode,
    soulUrgeNumber,
    personalityNumber,
    isMasterNumber,
    solfeggioFrequencyHz,
    lifePathTitle: NUMBER_TITLES[lifePath] || `Life Path ${lifePath}`,
    destinyTitle: NUMBER_TITLES[destinyNumber] || `Destiny ${destinyNumber}`,
  };
}
