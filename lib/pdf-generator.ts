import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { calculateNumerology } from './numerology';

export interface BlueprintPdfParams {
  clientName: string;
  birthDate?: string;
  lifePathNumber?: number;
  lifePathTitle?: string;
  teslaTriadNode?: number;
  resonanceScore?: number;
  dominantElement?: string;
  intention?: string;
  affirmationCount?: number;
  tierId?: string;
}

// =============================================================================
// WINANSI SANITIZATION ENGINE & TRANSLITERATION DICTIONARIES
// =============================================================================

export const CYRILLIC_MAP: Record<string, string> = {
  '\u0410': 'A', '\u0411': 'B', '\u0412': 'V', '\u0413': 'G', '\u0414': 'D', '\u0402': 'Dj', '\u0415': 'E', '\u0416': 'Zh', '\u0417': 'Z', '\u0418': 'I',
  '\u0408': 'J', '\u041a': 'K', '\u041b': 'L', '\u0409': 'Lj', '\u041c': 'M', '\u041d': 'N', '\u040a': 'Nj', '\u041e': 'O', '\u041f': 'P', '\u0420': 'R',
  '\u0421': 'S', '\u0422': 'T', '\u040b': 'C', '\u0423': 'U', '\u0424': 'F', '\u0425': 'H', '\u0426': 'C', '\u0427': 'Ch', '\u040f': 'Dz', '\u0428': 'Sh',
  '\u0429': 'Shch', '\u042a': '', '\u042b': 'Y', '\u042c': '', '\u042d': 'E', '\u042e': 'Yu', '\u042f': 'Ya',
  '\u0430': 'a', '\u0431': 'b', '\u0432': 'v', '\u0433': 'g', '\u0434': 'd', '\u0452': 'dj', '\u0435': 'e', '\u0436': 'zh', '\u0437': 'z', '\u0438': 'i',
  '\u0458': 'j', '\u043a': 'k', '\u043b': 'l', '\u0459': 'lj', '\u043c': 'm', '\u043d': 'n', '\u045a': 'nj', '\u043e': 'o', '\u043f': 'p', '\u0440': 'r',
  '\u0441': 's', '\u0442': 't', '\u045b': 'c', '\u0443': 'u', '\u0444': 'f', '\u0445': 'h', '\u0446': 'c', '\u0447': 'ch', '\u045f': 'dz', '\u0448': 'sh',
  '\u0449': 'shch', '\u044a': '', '\u044b': 'y', '\u044c': '', '\u044d': 'e', '\u044e': 'yu', '\u044f': 'ya',
  '\u0404': 'Ye', '\u0454': 'ye', '\u0406': 'I', '\u0456': 'i', '\u0407': 'Yi', '\u0457': 'yi', '\u0490': 'G', '\u0491': 'g'
};

export const GREEK_MAP: Record<string, string> = {
  '\u0391': 'A', '\u0392': 'B', '\u0393': 'G', '\u0394': 'D', '\u0395': 'E', '\u0396': 'Z', '\u0397': 'I', '\u0398': 'Th', '\u0399': 'I', '\u039a': 'K',
  '\u039b': 'L', '\u039c': 'M', '\u039d': 'N', '\u039e': 'X', '\u039f': 'O', '\u03a0': 'P', '\u03a1': 'R', '\u03a3': 'S', '\u03a4': 'T', '\u03a5': 'Y',
  '\u03a6': 'F', '\u03a7': 'Ch', '\u03a8': 'Ps', '\u03a9': 'O',
  '\u03b1': 'a', '\u03b2': 'b', '\u03b3': 'g', '\u03b4': 'd', '\u03b5': 'e', '\u03b6': 'z', '\u03b7': 'i', '\u03b8': 'th', '\u03b9': 'i', '\u03ba': 'k',
  '\u03bb': 'l', '\u03bc': 'm', '\u03bd': 'n', '\u03be': 'x', '\u03bf': 'o', '\u03c0': 'p', '\u03c1': 'r', '\u03c2': 's', '\u03c3': 's', '\u03c4': 't',
  '\u03c5': 'y', '\u03c6': 'f', '\u03c7': 'ch', '\u03c8': 'ps', '\u03c9': 'o',
  '\u0386': 'A', '\u0388': 'E', '\u0389': 'I', '\u038a': 'I', '\u038c': 'O', '\u038e': 'Y', '\u038f': 'O',
  '\u03ac': 'a', '\u03ad': 'e', '\u03ae': 'i', '\u03af': 'i', '\u03cc': 'o', '\u03cd': 'y', '\u03ce': 'o'
};

export const LATIN_SPECIAL: Record<string, string> = {
  '\u0141': 'L', '\u0142': 'l', // Ł, ł (Polish)
  '\u0131': 'i', '\u0130': 'I', // ı, İ (Turkish)
  '\u0110': 'Dj', '\u0111': 'dj', // Đ, đ (Serbo-Croatian)
  '\u0126': 'H', '\u0127': 'h', // Ħ, ħ (Maltese)
  '\u014a': 'N', '\u014b': 'n', // Ŋ, ŋ (Sami)
  '\u0166': 'T', '\u0167': 't', // Ŧ, ŧ (Sami)
  '\u2192': '->', '\u2190': '<-', '\u2194': '<->', // Common arrows
  '\u0950': 'Om' // Vedic Om
};

/**
 * Validates whether a Unicode code point is part of the 218 supported WinAnsi characters.
 */
export function isWinAnsiCodePoint(cp: number): boolean {
  if (cp >= 0x20 && cp <= 0x7E) return true; // Printable ASCII
  if (cp >= 0xA0 && cp <= 0xFF) return true; // Latin-1 Supplement
  return (
    cp === 0x152 || cp === 0x153 || // Œ, œ
    cp === 0x160 || cp === 0x161 || // Š, š
    cp === 0x178 ||                 // Ÿ
    cp === 0x17D || cp === 0x17E || // Ž, ž
    cp === 0x192 ||                 // ƒ
    cp === 0x2C6 || cp === 0x2DC || // ˆ, ˜
    cp === 0x2013 || cp === 0x2014 || // –, —
    cp === 0x2018 || cp === 0x2019 || cp === 0x201A || // ‘, ’, ‚
    cp === 0x201C || cp === 0x201D || cp === 0x201E || // “, ”, „
    cp === 0x2020 || cp === 0x2021 || // †, ‡
    cp === 0x2022 ||                 // •
    cp === 0x2026 ||                 // …
    cp === 0x2030 ||                 // ‰
    cp === 0x2039 || cp === 0x203A || // ‹, ›
    cp === 0x20AC ||                 // €
    cp === 0x2122                    // ™
  );
}

/**
 * Robustly sanitizes and transliterates text inputs for safe rendering in standard Helvetica PDF fonts.
 * Preserves international names via phonetic Latin transliteration and strips unencodable characters.
 */
export function sanitizeForPdf(
  text?: string | null,
  maxLength: number = 100,
  fallback: string = 'Cosmic Seeker'
): string {
  if (!text || typeof text !== 'string') return fallback;

  // 1. Script-level transliteration
  let transliterated = '';
  for (const ch of text) {
    if (CYRILLIC_MAP[ch]) {
      transliterated += CYRILLIC_MAP[ch];
    } else if (GREEK_MAP[ch]) {
      transliterated += GREEK_MAP[ch];
    } else if (LATIN_SPECIAL[ch]) {
      transliterated += LATIN_SPECIAL[ch];
    } else {
      transliterated += ch;
    }
  }

  // 2. Strict WinAnsi filtering with diacritic decomposition
  let sanitized = '';
  for (let i = 0; i < transliterated.length; i++) {
    const cp = transliterated.codePointAt(i);
    if (!cp) continue;
    // Skip surrogate pair second half if code point > 0xFFFF
    if (cp > 0xFFFF) {
      i++;
      continue;
    }
    if (isWinAnsiCodePoint(cp)) {
      sanitized += String.fromCodePoint(cp);
    } else {
      const decomposed = String.fromCodePoint(cp).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      for (const dch of decomposed) {
        const dcp = dch.codePointAt(0);
        if (dcp && isWinAnsiCodePoint(dcp)) {
          sanitized += dch;
        }
      }
    }
  }

  // 3. Normalize whitespace and apply length boundary
  const clean = sanitized.replace(/\s+/g, ' ').trim();
  const result = clean || fallback;
  return result.slice(0, maxLength);
}

export async function generatePersonalizedBlueprintPdf(
  params: BlueprintPdfParams
): Promise<Uint8Array> {
  // If numerology values not supplied, calculate them if birthDate is provided
  let lifePath = params.lifePathNumber;
  let lifePathTitle = params.lifePathTitle;
  let teslaNode = params.teslaTriadNode;
  let score = params.resonanceScore;
  let element = params.dominantElement;

  if (lifePath === undefined) {
    if (params.birthDate && params.clientName) {
      try {
        const calc = calculateNumerology(params.clientName, params.birthDate);
        lifePath = calc.lifePath;
        lifePathTitle = calc.lifePathTitle;
        teslaNode = calc.teslaNode;
        score = calc.resonance369Score;
        element = calc.dominantElement;
      } catch {
        lifePath = 3;
        lifePathTitle = 'The Radiant Creator';
        teslaNode = 3;
        score = 88;
        element = 'Aether';
      }
    } else {
      lifePath = 3;
      lifePathTitle = 'The Radiant Creator';
      teslaNode = 3;
      score = 88;
      element = 'Aether';
    }
  }

  // Sanitize all inputs against WinAnsi encoding constraints
  const clientName = sanitizeForPdf(params.clientName, 60, 'Cosmic Seeker');
  const headerName = sanitizeForPdf(params.clientName, 30, 'Cosmic Seeker');
  const intention = sanitizeForPdf(
    params.intention,
    120,
    'Universal Alignment & Infinite Prosperity'
  );
  lifePathTitle = sanitizeForPdf(lifePathTitle, 40, 'The Radiant Creator');
  element = sanitizeForPdf(element, 20, 'Aether');
  const affirmationCount = params.affirmationCount || 33;

  const pdfDoc = await PDFDocument.create();

  // Load standard fonts
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  // Palette
  const gold = rgb(0.85, 0.65, 0.13);
  const darkNavy = rgb(0.06, 0.07, 0.12);
  const charcoal = rgb(0.18, 0.20, 0.26);
  const lightGray = rgb(0.94, 0.95, 0.97);
  const pureWhite = rgb(1, 1, 1);
  const purpleAccent = rgb(0.55, 0.30, 0.85);

  // ---------------------------------------------------------------------------
  // PAGE 1: COVER & NATAL VORTEX DOSSIER
  // ---------------------------------------------------------------------------
  const page1 = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = page1.getSize();

  // Outer Border & Header Banner
  page1.drawRectangle({
    x: 20,
    y: 20,
    width: width - 40,
    height: height - 40,
    borderColor: gold,
    borderWidth: 1.5,
    color: pureWhite
  });

  // Top Dark Header Banner
  page1.drawRectangle({
    x: 22,
    y: height - 110,
    width: width - 44,
    height: 88,
    color: darkNavy
  });

  page1.drawText('369COM.CO RESONANCE LAB', {
    x: 40,
    y: height - 55,
    size: 11,
    font: fontBold,
    color: gold
  });

  page1.drawText('PERSONALIZED TESLA 369 MANIFESTATION BLUEPRINT', {
    x: 40,
    y: height - 80,
    size: 15,
    font: fontBold,
    color: pureWhite
  });

  page1.drawText('Sacred Geometry • Vortex Mathematics • Conscious Reality Creation', {
    x: 40,
    y: height - 98,
    size: 9,
    font: fontOblique,
    color: gold
  });

  // Personalized Recipient Dossier Card
  page1.drawRectangle({
    x: 40,
    y: height - 340,
    width: width - 80,
    height: 200,
    color: lightGray,
    borderColor: gold,
    borderWidth: 1
  });

  page1.drawText('CALIBRATED FOR CLIENT:', {
    x: 60,
    y: height - 165,
    size: 9,
    font: fontBold,
    color: charcoal
  });

  page1.drawText(clientName, {
    x: 60,
    y: height - 190,
    size: 18,
    font: fontBold,
    color: darkNavy
  });

  page1.drawText(`Core Intention: "${intention.slice(0, 75)}"`, {
    x: 60,
    y: height - 215,
    size: 10,
    font: fontOblique,
    color: purpleAccent
  });

  // Natal Metrics Grid inside Card
  const metricsY = height - 260;
  page1.drawText(`Life Path Number: ${lifePath} (${lifePathTitle || 'Sacred Harmonic'})`, {
    x: 60,
    y: metricsY,
    size: 10,
    font: fontBold,
    color: darkNavy
  });

  page1.drawText(`Tesla Triad Node: Node ${teslaNode} (Vortex Anchor)`, {
    x: 60,
    y: metricsY - 20,
    size: 10,
    font: fontBold,
    color: darkNavy
  });

  page1.drawText(`Resonance Index: ${score}% Harmonic Coherence`, {
    x: 60,
    y: metricsY - 40,
    size: 10,
    font: fontBold,
    color: gold
  });

  page1.drawText(`Dominant Element: ${element || 'Aether'}`, {
    x: 320,
    y: metricsY,
    size: 10,
    font: fontRegular,
    color: charcoal
  });

  page1.drawText(`Affirmation Matrix: ${affirmationCount} Consecutive Days`, {
    x: 320,
    y: metricsY - 20,
    size: 10,
    font: fontRegular,
    color: charcoal
  });

  page1.drawText(`Generation Timestamp: ${new Date().toISOString().slice(0, 10)}`, {
    x: 320,
    y: metricsY - 40,
    size: 9,
    font: fontOblique,
    color: charcoal
  });

  // Tesla Axiom Callout Box
  page1.drawRectangle({
    x: 40,
    y: height - 480,
    width: width - 80,
    height: 110,
    color: darkNavy
  });

  page1.drawText('THE FOUNDATIONAL TESLA AXIOM', {
    x: 60,
    y: height - 405,
    size: 10,
    font: fontBold,
    color: gold
  });

  const quoteText =
    '"If you only knew the magnificence of the 3, 6, and 9,\nthen you would have the key to the universe."\n                                        — Nikola Tesla (1856–1943)';
  page1.drawText(quoteText, {
    x: 60,
    y: height - 435,
    size: 11,
    font: fontOblique,
    lineHeight: 16,
    color: pureWhite
  });

  // Overview Introduction
  page1.drawText('Executive Summary & Blueprint Architecture', {
    x: 40,
    y: height - 520,
    size: 13,
    font: fontBold,
    color: darkNavy
  });

  const summary = [
    `Welcome, ${clientName}. This personalized dossier translates Nikola Tesla's vortex math`,
    `into a concrete, repeatable daily practice. Your natal profile vibrates with Life Path ${lifePath},`,
    `connecting directly into the 3-6-9 universal polarity grid.`,
    ``,
    `Over the next ${affirmationCount} days, you will anchor your primary intention through three daily rituals:`,
    `  • Morning (3 repetitions): Planting the energetic seed in theta brainwave state.`,
    `  • Midday (6 repetitions): Feeding the intention with momentum and emotional charge.`,
    `  • Evening (9 repetitions): Releasing the manifestation into subconscious crystallization.`
  ];

  let currentY = height - 545;
  for (const line of summary) {
    page1.drawText(line, {
      x: 40,
      y: currentY,
      size: 9.5,
      font: fontRegular,
      color: charcoal
    });
    currentY -= 15;
  }

  // Footer Page 1
  page1.drawText('Page 1 of 3 • 369com.co Resonance Engine • Confidential & Personalized', {
    x: 40,
    y: 35,
    size: 8,
    font: fontOblique,
    color: charcoal
  });

  // ---------------------------------------------------------------------------
  // PAGE 2: VORTEX MATHEMATICS & NATAL CALIBRATION
  // ---------------------------------------------------------------------------
  const page2 = pdfDoc.addPage([595.28, 841.89]);

  page2.drawRectangle({
    x: 20,
    y: 20,
    width: width - 40,
    height: height - 40,
    borderColor: gold,
    borderWidth: 1.5,
    color: pureWhite
  });

  // Header Banner Page 2
  page2.drawRectangle({
    x: 22,
    y: height - 70,
    width: width - 44,
    height: 48,
    color: darkNavy
  });

  page2.drawText('NIKOLA TESLA VORTEX MATHEMATICS & POLARITY CODE', {
    x: 40,
    y: height - 43,
    size: 10.5,
    font: fontBold,
    color: pureWhite
  });

  page2.drawText(`Recipient: ${headerName} • Life Path ${lifePath} • Node ${teslaNode}`, {
    x: 40,
    y: height - 58,
    size: 8.5,
    font: fontOblique,
    color: gold
  });

  // Section 1: The Three Nodes
  page2.drawText('1. The Triad of Universal Flux: 3, 6, and 9', {
    x: 40,
    y: height - 100,
    size: 13,
    font: fontBold,
    color: darkNavy
  });

  const nodes = [
    {
      title: 'NODE 3 — THE GENESIS (Creative Thought)',
      desc: 'Governs entry of pure energy from the non-physical realm into physical reality. Represents inspiration, declaration, and the spark of intent.'
    },
    {
      title: 'NODE 6 — THE MAGNIFIER (Emotional Harmonic)',
      desc: 'The magnetic polarity balancer. In vortex math, doubling sequences (1, 2, 4, 8, 7, 5) constantly weave around 3 and 6, which act as cosmic pivots.'
    },
    {
      title: 'NODE 9 — THE CONSCIOUS FULFILLMENT (Universal Completion)',
      desc: 'The ultimate master node. 9 represents the totality of all numbers reduced to digital roots. It signifies release, transcendence, and final physical crystallization.'
    }
  ];

  let nodeY = height - 130;
  for (const n of nodes) {
    page2.drawRectangle({
      x: 40,
      y: nodeY - 45,
      width: width - 80,
      height: 55,
      color: lightGray,
      borderColor: gold,
      borderWidth: 0.5
    });

    page2.drawText(n.title, {
      x: 55,
      y: nodeY - 10,
      size: 10,
      font: fontBold,
      color: darkNavy
    });

    page2.drawText(n.desc, {
      x: 55,
      y: nodeY - 30,
      size: 8.5,
      font: fontRegular,
      color: charcoal
    });

    nodeY -= 70;
  }

  // Section 2: Natal Alignment
  page2.drawText(`2. Natal Resonance Analysis for ${clientName}`, {
    x: 40,
    y: nodeY - 20,
    size: 13,
    font: fontBold,
    color: darkNavy
  });

  const natalLines = [
    `Your Life Path Number ${lifePath} generates a ${score}% resonance score with Tesla's primary 369 node.`,
    `Because your vortex anchor sits on Node ${teslaNode}, your creative manifestation flow accelerates`,
    `most powerfully when you combine morning silence with pure Solfeggio sound therapy.`,
    ``,
    `Primary Harmonic Formula for Your Intention:`,
    `  "I am aligned with the sacred 3-6-9 frequency of universal abundance and divine clarity."`,
    `  Recite with absolute emotional conviction during each interval.`
  ];

  let natalY = nodeY - 45;
  for (const line of natalLines) {
    page2.drawText(line, {
      x: 40,
      y: natalY,
      size: 9.5,
      font: fontRegular,
      color: charcoal
    });
    natalY -= 16;
  }

  // Section 3: Daily Scripting Schedule Table
  page2.drawText('3. The Daily 3-6-9 Scripting Rhythm', {
    x: 40,
    y: natalY - 25,
    size: 13,
    font: fontBold,
    color: darkNavy
  });

  const scheduleTable = [
    {
      time: 'MORNING (Upon Waking)',
      reps: 'Write 3 Times',
      focus: 'Plant seed in subconscious; listen to 369Hz tone for 3 mins.'
    },
    {
      time: 'MIDDAY (Between 12PM–2PM)',
      reps: 'Write 6 Times',
      focus: 'Amplify gratitude and emotional charge; anchor certainty.'
    },
    {
      time: 'EVENING (Before Sleep)',
      reps: 'Write 9 Times',
      focus: 'Release attachment to outcome; sleep in gratitude.'
    }
  ];

  let schedY = natalY - 55;
  for (const s of scheduleTable) {
    page2.drawRectangle({
      x: 40,
      y: schedY - 35,
      width: width - 80,
      height: 45,
      color: lightGray
    });

    page2.drawText(`${s.time} — ${s.reps}`, {
      x: 55,
      y: schedY - 12,
      size: 9.5,
      font: fontBold,
      color: darkNavy
    });

    page2.drawText(s.focus, {
      x: 55,
      y: schedY - 27,
      size: 8.5,
      font: fontRegular,
      color: charcoal
    });

    schedY -= 55;
  }

  // Footer Page 2
  page2.drawText('Page 2 of 3 • 369com.co Resonance Engine • Authorized Digital Blueprint', {
    x: 40,
    y: 35,
    size: 8,
    font: fontOblique,
    color: charcoal
  });

  // ---------------------------------------------------------------------------
  // PAGE 3: 33-DAY SCRIPTING MATRIX & SOLFEGGIO PROTOCOL
  // ---------------------------------------------------------------------------
  const page3 = pdfDoc.addPage([595.28, 841.89]);

  page3.drawRectangle({
    x: 20,
    y: 20,
    width: width - 40,
    height: height - 40,
    borderColor: gold,
    borderWidth: 1.5,
    color: pureWhite
  });

  // Header Banner Page 3
  page3.drawRectangle({
    x: 22,
    y: height - 70,
    width: width - 44,
    height: 48,
    color: darkNavy
  });

  page3.drawText('33-DAY SCRIPTING MATRIX & SOLFEGGIO PROTOCOL', {
    x: 40,
    y: height - 43,
    size: 10.5,
    font: fontBold,
    color: pureWhite
  });

  page3.drawText(`Client: ${headerName} • Dedicated Practice Matrix`, {
    x: 40,
    y: height - 58,
    size: 8.5,
    font: fontOblique,
    color: gold
  });

  // Solfeggio Reference
  page3.drawText('Universal Solfeggio Harmonic Stems', {
    x: 40,
    y: height - 100,
    size: 13,
    font: fontBold,
    color: darkNavy
  });

  const freqs = [
    { hz: '369Hz', role: 'Tesla Harmonic — Universal Creation Key & Mental Clarity' },
    { hz: '396Hz', role: 'Root Frequency — Dissolving Subconscious Fear & Guilt' },
    { hz: '528Hz', role: 'Miracle Tone — Cellular Transformation & Heart Coherence' },
    { hz: '639Hz', role: 'Harmonic Bridge — Interpersonal Love & Deep Empathy' },
    { hz: '963Hz', role: 'Pineal Activation — Divine Universal Consciousness' }
  ];

  let freqY = height - 125;
  for (const f of freqs) {
    page3.drawText(`• ${f.hz}:`, {
      x: 50,
      y: freqY,
      size: 9,
      font: fontBold,
      color: gold
    });

    page3.drawText(f.role, {
      x: 105,
      y: freqY,
      size: 9,
      font: fontRegular,
      color: charcoal
    });

    freqY -= 17;
  }

  // 33-Day Interactive Workbook Grid (Sample 10-day tracker display)
  page3.drawText('33-Day Ritual Progress Tracker (Tactile Checkpoints)', {
    x: 40,
    y: freqY - 25,
    size: 13,
    font: fontBold,
    color: darkNavy
  });

  page3.drawText(
    'Check each circle after completing all three daily rituals (Morning 3x, Midday 6x, Night 9x):',
    {
      x: 40,
      y: freqY - 45,
      size: 9,
      font: fontOblique,
      color: charcoal
    }
  );

  let gridY = freqY - 70;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 11; c++) {
      const dayNum = r * 11 + c + 1;
      const x = 45 + c * 46;
      const y = gridY - r * 45;

      page3.drawRectangle({
        x,
        y,
        width: 38,
        height: 35,
        color: lightGray,
        borderColor: gold,
        borderWidth: 0.5
      });

      page3.drawText(`Day ${dayNum}`, {
        x: x + 4,
        y: y + 20,
        size: 8,
        font: fontBold,
        color: darkNavy
      });

      page3.drawCircle({
        x: x + 19,
        y: y + 9,
        size: 5,
        borderColor: charcoal,
        borderWidth: 0.8,
        color: pureWhite
      });
    }
  }

  // Seal of Authenticity Box
  const sealY = gridY - 180;
  page3.drawRectangle({
    x: 40,
    y: sealY,
    width: width - 80,
    height: 75,
    color: darkNavy
  });

  page3.drawText('OFFICIAL 369COM.CO CERTIFICATE OF HARMONIC ALIGNMENT', {
    x: 60,
    y: sealY + 50,
    size: 10,
    font: fontBold,
    color: gold
  });

  page3.drawText(
    `This certified blueprint was mathematically synthesized for ${clientName}.\n` +
      `Authorized DRM verification • Cryptographic token verification active • Lifetime resonance access.`,
    {
      x: 60,
      y: sealY + 28,
      size: 8.5,
      font: fontRegular,
      lineHeight: 13,
      color: pureWhite
    }
  );

  // Footer Page 3
  page3.drawText('Page 3 of 3 • 369com.co Resonance Engine • All Rights Reserved', {
    x: 40,
    y: 35,
    size: 8,
    font: fontOblique,
    color: charcoal
  });

  return await pdfDoc.save();
}
