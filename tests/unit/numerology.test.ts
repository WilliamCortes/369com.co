/**
 * Unit Test Suite for Pythagorean & Tesla Vortex Numerology Engine
 * tests/unit/numerology.test.ts
 */

import { describe, it, expect } from 'vitest';
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
  getCharValue
} from '@/lib/numerology';

describe('Pythagorean Letter Mapping & Normalization', () => {
  it('normalizes names with whitespace, diacritics, and punctuation', () => {
    expect(normalizeName('  José   Müller-Nuñez  ')).toBe('JOSEMULLERNUNEZ');
    expect(normalizeName("O'Connor-Smith")).toBe('OCONNORSMITH');
    expect(normalizeName('Dr. René DuPont Jr.')).toBe('DRRENEDUPONTJR');
    expect(normalizeName('')).toBe('');
  });

  it('correctly maps ASCII letters A-Z to Pythagorean 1-9 table', () => {
    // 1: A, J, S
    expect(getCharValue('A')).toBe(1);
    expect(getCharValue('J')).toBe(1);
    expect(getCharValue('S')).toBe(1);

    // 2: B, K, T
    expect(getCharValue('B')).toBe(2);
    expect(getCharValue('K')).toBe(2);
    expect(getCharValue('T')).toBe(2);

    // 3: C, L, U
    expect(getCharValue('C')).toBe(3);
    expect(getCharValue('L')).toBe(3);
    expect(getCharValue('U')).toBe(3);

    // 4: D, M, V
    expect(getCharValue('D')).toBe(4);
    expect(getCharValue('M')).toBe(4);
    expect(getCharValue('V')).toBe(4);

    // 5: E, N, W
    expect(getCharValue('E')).toBe(5);
    expect(getCharValue('N')).toBe(5);
    expect(getCharValue('W')).toBe(5);

    // 6: F, O, X
    expect(getCharValue('F')).toBe(6);
    expect(getCharValue('O')).toBe(6);
    expect(getCharValue('X')).toBe(6);

    // 7: G, P, Y
    expect(getCharValue('G')).toBe(7);
    expect(getCharValue('P')).toBe(7);
    expect(getCharValue('Y')).toBe(7);

    // 8: H, Q, Z
    expect(getCharValue('H')).toBe(8);
    expect(getCharValue('Q')).toBe(8);
    expect(getCharValue('Z')).toBe(8);

    // 9: I, R
    expect(getCharValue('I')).toBe(9);
    expect(getCharValue('R')).toBe(9);

    // Non-alphabetic
    expect(getCharValue(' ')).toBe(0);
    expect(getCharValue('1')).toBe(0);
  });
});

describe('Digital Root Reduction & Master Number Preservation', () => {
  it('reduces multi-digit numbers to single roots when no master numbers are present', () => {
    expect(reduceToRootOrMaster(25)).toBe(7);
    expect(reduceToRootOrMaster(46)).toBe(1); // 4+6=10 -> 1+0=1
    expect(reduceToRootOrMaster(9)).toBe(9);
    expect(reduceToRootOrMaster(1)).toBe(1);
  });

  it('preserves Master Numbers 11, 22, and 33 when preserveMaster is true', () => {
    expect(reduceToRootOrMaster(38, true)).toBe(11); // 3+8 = 11
    expect(reduceToRootOrMaster(29, true)).toBe(11); // 2+9 = 11
    expect(reduceToRootOrMaster(22, true)).toBe(22);
    expect(reduceToRootOrMaster(33, true)).toBe(33);
  });

  it('reduces Master Numbers to single roots when preserveMaster is false', () => {
    expect(reduceToRootOrMaster(11, false)).toBe(2);
    expect(reduceToRootOrMaster(22, false)).toBe(4);
    expect(reduceToRootOrMaster(33, false)).toBe(6);
  });
});

describe('Authoritative Historical & Persona Test Vectors', () => {
  it('V-01: Jane Doe (1994-06-09) -> Master 11 LP, Destiny 9, Node 9, 90% Resonance', () => {
    const res = calculateNumerology('Jane Doe', '1994-06-09');
    expect(res.lifePath).toBe(11);
    expect(res.destinyNumber).toBe(9);
    expect(res.teslaTriadNode).toBe(9);
    expect(res.resonance369Score).toBe(90);
    expect(res.dominantElement).toBe('Ether');
    expect(res.isMasterNumber).toBe(true);
    expect(res.powerIntention).toBe('Life Purpose & Creative Mastery');
    expect(res.solfeggioFrequencyHz).toBe(963);
  });

  it('V-02: Nikola Tesla (1856-07-10) -> LP 1, Master 11 Destiny, Node 3, 86% Resonance', () => {
    const res = calculateNumerology('Nikola Tesla', '1856-07-10');
    expect(res.lifePath).toBe(1);
    expect(res.destinyNumber).toBe(11);
    expect(res.teslaTriadNode).toBe(3);
    expect(res.resonance369Score).toBe(86);
    expect(res.dominantElement).toBe('Fire');
    expect(res.isMasterNumber).toBe(true);
    expect(res.powerIntention).toBe('Vital Energy & Cellular Regeneration');
    expect(res.solfeggioFrequencyHz).toBe(369);
  });

  it('V-03: Albert Einstein (1879-03-14) -> Master 33 LP, Destiny 9, Node 9, 97% Resonance', () => {
    const res = calculateNumerology('Albert Einstein', '1879-03-14');
    expect(res.lifePath).toBe(33);
    expect(res.destinyNumber).toBe(9);
    expect(res.teslaTriadNode).toBe(9);
    expect(res.resonance369Score).toBe(97);
    expect(res.dominantElement).toBe('Ether');
    expect(res.isMasterNumber).toBe(true);
    expect(res.solfeggioFrequencyHz).toBe(963);
  });

  it('V-04: Bill Gates (1955-10-28) -> LP 4, Master 33 Destiny, Node 6, 83% Resonance', () => {
    const res = calculateNumerology('Bill Gates', '1955-10-28');
    expect(res.lifePath).toBe(4);
    expect(res.destinyNumber).toBe(33);
    expect(res.teslaTriadNode).toBe(6);
    expect(res.resonance369Score).toBe(83);
    expect(res.dominantElement).toBe('Earth');
    expect(res.isMasterNumber).toBe(true);
    expect(res.solfeggioFrequencyHz).toBe(528);
  });

  it('V-05: Kate Moss (1974-01-16) -> Master 11 LP, Master 22 Destiny, Node 6, 93% Resonance', () => {
    const res = calculateNumerology('Kate Moss', '1974-01-16');
    expect(res.lifePath).toBe(11);
    expect(res.destinyNumber).toBe(22);
    expect(res.teslaTriadNode).toBe(6);
    expect(res.resonance369Score).toBe(93);
    expect(res.dominantElement).toBe('Ether');
    expect(res.isMasterNumber).toBe(true);
  });

  it('V-06: John Doe (1985-11-23) -> LP 3, Destiny 8, Node 3, 77% Resonance', () => {
    const res = calculateNumerology('John Doe', '1985-11-23');
    expect(res.lifePath).toBe(3);
    expect(res.destinyNumber).toBe(8);
    expect(res.teslaTriadNode).toBe(3);
    expect(res.resonance369Score).toBe(77);
    expect(res.dominantElement).toBe('Fire');
    expect(res.isMasterNumber).toBe(false);
  });

  it('V-07: Alexander Graham Bell (1999-09-09) -> LP 1, Destiny 1, Node 3, 75% Resonance', () => {
    const res = calculateNumerology('Alexander Graham Bell', '1999-09-09');
    expect(res.lifePath).toBe(1);
    expect(res.destinyNumber).toBe(1);
    expect(res.teslaTriadNode).toBe(3);
    expect(res.resonance369Score).toBe(75);
  });

  it('V-08: Marie Curie (1988-08-08) -> LP 6, Destiny 3, Node 9, 89% Resonance', () => {
    const res = calculateNumerology('Marie Curie', '1988-08-08');
    expect(res.lifePath).toBe(6);
    expect(res.destinyNumber).toBe(3);
    expect(res.teslaTriadNode).toBe(9);
    expect(res.resonance369Score).toBe(89);
    expect(res.dominantElement).toBe('Ether');
  });

  it('V-09: Carl Sagan (2000-01-01) -> LP 4, Destiny 4, Node 3, 74% Resonance', () => {
    const res = calculateNumerology('Carl Sagan', '2000-01-01');
    expect(res.lifePath).toBe(4);
    expect(res.destinyNumber).toBe(4);
    expect(res.teslaTriadNode).toBe(3);
    expect(res.resonance369Score).toBe(74);
    expect(res.dominantElement).toBe('Earth');
  });

  it('V-10: Barack Obama (1990-11-11) -> LP 5, Destiny 5, Node 6, 74% Resonance', () => {
    const res = calculateNumerology('Barack Obama', '1990-11-11');
    expect(res.lifePath).toBe(5);
    expect(res.destinyNumber).toBe(5);
    expect(res.teslaTriadNode).toBe(6);
    expect(res.resonance369Score).toBe(74);
  });

  it('V-11: Master 22 LP (1970-01-04)', () => {
    const res = calculateNumerology('Test Person', '1970-01-04');
    expect(res.lifePath).toBe(22);
    expect(res.destinyNumber).toBe(7);
    expect(res.teslaTriadNode).toBe(3);
    expect(res.resonance369Score).toBe(81);
    expect(res.isMasterNumber).toBe(true);
  });

  it('V-12: Master 33 LP (1989-03-03)', () => {
    const res = calculateNumerology('Test Person', '1989-03-03');
    expect(res.lifePath).toBe(33);
    expect(res.destinyNumber).toBe(7);
    expect(res.teslaTriadNode).toBe(6);
    expect(res.resonance369Score).toBe(83);
    expect(res.isMasterNumber).toBe(true);
  });
});

describe('Sub-Calculations: Soul Urge & Personality Numbers', () => {
  it('correctly calculates Soul Urge (vowels) and Personality (consonants) for Nikola Tesla', () => {
    const soulUrge = calculateSoulUrge('Nikola Tesla');
    const personality = calculatePersonality('Nikola Tesla');
    expect(soulUrge).toBe(22); // I(9) + O(6) + A(1) + E(5) + A(1) = 22
    expect(personality).toBe(7); // N(5)+K(2)+L(3)+T(2)+S(1)+L(3) = 16 -> 7
  });

  it('correctly calculates Soul Urge and Personality for Jane Doe', () => {
    const soulUrge = calculateSoulUrge('Jane Doe');
    const personality = calculatePersonality('Jane Doe');
    expect(soulUrge).toBe(8); // A(1)+E(5)+O(6)+E(5) = 17 -> 8
    expect(personality).toBe(1); // J(1)+N(5)+D(4) = 10 -> 1
  });
});

describe('Validation & Error Boundaries', () => {
  it('throws descriptive error on empty or invalid birth date', () => {
    expect(() => calculateLifePath('')).toThrow(
      'Invalid birth date: must be a non-empty string'
    );
    expect(() => calculateLifePath('not-a-date')).toThrow(
      'Invalid birth date format: expected YYYY-MM-DD with at least 8 digits'
    );
  });

  it('throws descriptive error on empty or non-alphabetic name', () => {
    expect(() => calculateDestiny('')).toThrow(
      'Invalid name: must contain at least one alphabetic character'
    );
    expect(() => calculateDestiny('12345!@#$')).toThrow(
      'Invalid name: must contain at least one alphabetic character'
    );
  });
});
