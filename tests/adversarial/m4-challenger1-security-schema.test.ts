/**
 * Milestone 4 Adversarial Challenger 1 Test Suite
 * JSON Schema & Security Header Integrity Empirical Probes
 *
 * Validates vercel.json strictly against filesystem, JSON syntax, Vercel schema,
 * OWASP security headers, Permissions-Policy, CSP directives compatibility with
 * Next.js 14 hydration, Stripe.js, Web Audio API, and API routes.
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const PROJECT_ROOT = path.resolve(__dirname, '../../');
const VERCEL_JSON_PATH = path.join(PROJECT_ROOT, 'vercel.json');
const NEXT_CONFIG_PATH = path.join(PROJECT_ROOT, 'next.config.mjs');
const PACKAGE_JSON_PATH = path.join(PROJECT_ROOT, 'package.json');

describe('Milestone 4 Challenger 1: vercel.json Schema & OWASP Security Headers Integrity', () => {
  // Read and parse vercel.json once for the suite
  const rawVercelJson = fs.readFileSync(VERCEL_JSON_PATH, 'utf-8');
  let parsedConfig: any;
  try {
    parsedConfig = JSON.parse(rawVercelJson);
  } catch (err) {
    parsedConfig = null;
  }

  // ---------------------------------------------------------------------------
  // Suite 1: Physical File & JSON Schema Integrity (Probes 1 - 10)
  // ---------------------------------------------------------------------------
  describe('Suite 1: Physical File & JSON Schema Integrity', () => {
    it('Probe 1: vercel.json exists as a physical file on disk and is readable', () => {
      expect(fs.existsSync(VERCEL_JSON_PATH)).toBe(true);
      const stat = fs.statSync(VERCEL_JSON_PATH);
      expect(stat.isFile()).toBe(true);
      expect(stat.size).toBeGreaterThan(100);
    });

    it('Probe 2: File parses strictly with JSON.parse without syntax errors', () => {
      expect(parsedConfig).not.toBeNull();
      expect(typeof parsedConfig).toBe('object');
    });

    it('Probe 3: Raw file contains no JSON comments, unquoted keys, single quotes, or trailing commas', () => {
      expect(rawVercelJson).not.toMatch(/^\s*\/\/.*/m); // No single-line comments
      expect(rawVercelJson).not.toMatch(/\/\*[\s\S]*?\*\//); // No block comments
      expect(rawVercelJson).not.toMatch(/,\s*([}\]])/); // No trailing commas before } or ]
      expect(rawVercelJson).not.toMatch(/^\s*'[^']+'\s*:/m); // No single-quoted JSON property keys
    });

    it('Probe 4: $schema is a valid URL string pointing to Vercel schema', () => {
      expect(parsedConfig.$schema).toBe('https://openapi.vercel.sh/vercel.json');
    });

    it('Probe 5: framework property is strictly string "nextjs"', () => {
      expect(parsedConfig.framework).toBe('nextjs');
      expect(typeof parsedConfig.framework).toBe('string');
    });

    it('Probe 6: cleanUrls property is strictly boolean true', () => {
      expect(typeof parsedConfig.cleanUrls).toBe('boolean');
      expect(parsedConfig.cleanUrls).toBe(true);
      expect(parsedConfig.cleanUrls).not.toBe('true');
    });

    it('Probe 7: trailingSlash property is strictly boolean false', () => {
      expect(typeof parsedConfig.trailingSlash).toBe('boolean');
      expect(parsedConfig.trailingSlash).toBe(false);
      expect(parsedConfig.trailingSlash).not.toBe('false');
    });

    it('Probe 8: Does not contain deprecated or conflicting routes property', () => {
      // Vercel CLI forbids mixing `routes` with `headers` or `cleanUrls`
      expect(parsedConfig.routes).toBeUndefined();
    });

    it('Probe 9: Top-level properties are only allowed Vercel configuration keys', () => {
      const allowedKeys = new Set(['$schema', 'framework', 'cleanUrls', 'trailingSlash', 'headers']);
      const actualKeys = Object.keys(parsedConfig);
      for (const k of actualKeys) {
        expect(allowedKeys.has(k)).toBe(true);
      }
    });

    it('Probe 10: headers property is a non-empty array with exactly 1 route rule', () => {
      expect(Array.isArray(parsedConfig.headers)).toBe(true);
      expect(parsedConfig.headers.length).toBe(1);
      expect(parsedConfig.headers[0]).toHaveProperty('source');
      expect(parsedConfig.headers[0]).toHaveProperty('headers');
      expect(Array.isArray(parsedConfig.headers[0].headers)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Suite 2: Route Matcher Regex & URL Coverage (Probes 11 - 20)
  // ---------------------------------------------------------------------------
  describe('Suite 2: Route Matcher Regex & URL Coverage', () => {
    const sourcePattern = parsedConfig.headers[0].source;
    // Vercel uses PCRE-style regex matching for source; /(.*) maps to any path starting with /
    const routeRegex = new RegExp(`^${sourcePattern.replace(/\(\.\*\)/g, '.*')}$`);

    it('Probe 11: source pattern is string "/(.*)"', () => {
      expect(sourcePattern).toBe('/(.*)');
    });

    it('Probe 12: Matches root URL "/"', () => {
      expect(routeRegex.test('/')).toBe(true);
    });

    it('Probe 13: Matches static landing page "/success"', () => {
      expect(routeRegex.test('/success')).toBe(true);
    });

    it('Probe 14: Matches path with query string "/success?session_id=cs_test_mock_369"', () => {
      expect(routeRegex.test('/success?session_id=cs_test_mock_369')).toBe(true);
    });

    it('Probe 15: Matches API route "/api/checkout"', () => {
      expect(routeRegex.test('/api/checkout')).toBe(true);
    });

    it('Probe 16: Matches API route "/api/webhook/stripe"', () => {
      expect(routeRegex.test('/api/webhook/stripe')).toBe(true);
    });

    it('Probe 17: Matches API route "/api/download"', () => {
      expect(routeRegex.test('/api/download')).toBe(true);
    });

    it('Probe 18: Matches API route "/api/order/status"', () => {
      expect(routeRegex.test('/api/order/status')).toBe(true);
    });

    it('Probe 19: Matches Next.js static asset chunk "/_next/static/chunks/app/page-c1b489.js"', () => {
      expect(routeRegex.test('/_next/static/chunks/app/page-c1b489.js')).toBe(true);
    });

    it('Probe 20: Matches deep nested paths and encoded characters', () => {
      expect(routeRegex.test('/a/b/c/d/e/f/g/h')).toBe(true);
      expect(routeRegex.test('/manifest%20ritual')).toBe(true);
      expect(routeRegex.test('/favicon.ico')).toBe(true);
      expect(routeRegex.test('/robots.txt')).toBe(true);
      // Fails on relative paths without leading slash
      expect(routeRegex.test('api/checkout')).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Suite 3: OWASP Core Security Headers Verification (Probes 21 - 30)
  // ---------------------------------------------------------------------------
  describe('Suite 3: OWASP Core Security Headers Verification', () => {
    const headerList: Array<{ key: string; value: string }> = parsedConfig.headers[0].headers;
    const headerMap = new Map<string, string>();
    for (const h of headerList) {
      headerMap.set(h.key.toLowerCase(), h.value);
    }

    it('Probe 21: X-Content-Type-Options header exists and value is strictly "nosniff"', () => {
      expect(headerMap.has('x-content-type-options')).toBe(true);
      expect(headerMap.get('x-content-type-options')).toBe('nosniff');
    });

    it('Probe 22: X-Frame-Options header exists and value is strictly "DENY"', () => {
      expect(headerMap.has('x-frame-options')).toBe(true);
      expect(headerMap.get('x-frame-options')).toBe('DENY');
    });

    it('Probe 23: X-XSS-Protection header exists and value is strictly "1; mode=block"', () => {
      expect(headerMap.has('x-xss-protection')).toBe(true);
      expect(headerMap.get('x-xss-protection')).toBe('1; mode=block');
    });

    it('Probe 24: Referrer-Policy header exists and value is strictly "strict-origin-when-cross-origin"', () => {
      expect(headerMap.has('referrer-policy')).toBe(true);
      expect(headerMap.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
    });

    it('Probe 25: Strict-Transport-Security header exists and specifies max-age=63072000 (2 years)', () => {
      expect(headerMap.has('strict-transport-security')).toBe(true);
      const hsts = headerMap.get('strict-transport-security')!;
      expect(hsts).toMatch(/max-age=63072000/);
    });

    it('Probe 26: Strict-Transport-Security header includes includeSubDomains', () => {
      const hsts = headerMap.get('strict-transport-security')!;
      expect(hsts).toMatch(/includeSubDomains/);
    });

    it('Probe 27: Strict-Transport-Security header includes preload for HSTS preload list eligibility', () => {
      const hsts = headerMap.get('strict-transport-security')!;
      expect(hsts).toMatch(/preload/);
    });

    it('Probe 28: All header keys use standard valid HTTP header casing and string values', () => {
      for (const h of headerList) {
        expect(typeof h.key).toBe('string');
        expect(typeof h.value).toBe('string');
        expect(h.key.length).toBeGreaterThan(0);
        expect(h.value.length).toBeGreaterThan(0);
        expect(h.key).not.toMatch(/[\s:]/); // No spaces or colons in header keys
      }
    });

    it('Probe 29: No duplicated header keys in the configuration', () => {
      const keySet = new Set<string>();
      for (const h of headerList) {
        const lower = h.key.toLowerCase();
        expect(keySet.has(lower)).toBe(false);
        keySet.add(lower);
      }
    });

    it('Probe 30: No insecure header values present', () => {
      const xfo = headerMap.get('x-frame-options')!;
      expect(xfo).not.toBe('ALLOWALL');
      expect(xfo).not.toBe('SAMEORIGIN'); // DENY is strictest

      const hsts = headerMap.get('strict-transport-security')!;
      expect(hsts).not.toMatch(/max-age=0/);
    });
  });

  // ---------------------------------------------------------------------------
  // Suite 4: Permissions-Policy Directives & Payment API Access (Probes 31 - 36)
  // ---------------------------------------------------------------------------
  describe('Suite 4: Permissions-Policy Directives & Payment API Access', () => {
    const headerList: Array<{ key: string; value: string }> = parsedConfig.headers[0].headers;
    const permissionsPolicy = headerList.find((h) => h.key.toLowerCase() === 'permissions-policy')?.value;

    it('Probe 31: Permissions-Policy header exists and is a non-empty string', () => {
      expect(permissionsPolicy).toBeDefined();
      expect(typeof permissionsPolicy).toBe('string');
      expect(permissionsPolicy!.length).toBeGreaterThan(10);
    });

    it('Probe 32: camera=() is strictly enforced to disable unauthorized video capture', () => {
      expect(permissionsPolicy).toMatch(/camera=\(\)/);
    });

    it('Probe 33: microphone=() is strictly enforced to disable unauthorized audio recording', () => {
      expect(permissionsPolicy).toMatch(/microphone=\(\)/);
    });

    it('Probe 34: geolocation=() is strictly enforced to disable unauthorized location tracking', () => {
      expect(permissionsPolicy).toMatch(/geolocation=\(\)/);
    });

    it('Probe 35: payment directive explicitly allows self and https://js.stripe.com', () => {
      // Must allow Stripe for Apple Pay / Google Pay / Payment Request Button
      expect(permissionsPolicy).toMatch(/payment=\(self\s+"https:\/\/js\.stripe\.com"\)/);
    });

    it('Probe 36: Permissions-Policy syntax has balanced parentheses and quotes', () => {
      const openParens = (permissionsPolicy!.match(/\(/g) || []).length;
      const closeParens = (permissionsPolicy!.match(/\)/g) || []).length;
      expect(openParens).toBe(closeParens);

      const quotes = (permissionsPolicy!.match(/"/g) || []).length;
      expect(quotes % 2).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Suite 5: Content-Security-Policy Directives & Compatibility (Probes 37 - 50)
  // ---------------------------------------------------------------------------
  describe('Suite 5: Content-Security-Policy Directives & Compatibility', () => {
    const headerList: Array<{ key: string; value: string }> = parsedConfig.headers[0].headers;
    const csp = headerList.find((h) => h.key.toLowerCase() === 'content-security-policy')?.value;

    // Parse CSP into directive map
    const directiveMap = new Map<string, string[]>();
    if (csp) {
      const parts = csp.split(';').map((s) => s.trim()).filter(Boolean);
      for (const part of parts) {
        const tokens = part.split(/\s+/);
        const name = tokens[0].toLowerCase();
        const values = tokens.slice(1);
        directiveMap.set(name, values);
      }
    }

    it('Probe 37: Content-Security-Policy exists with valid directive structure', () => {
      expect(csp).toBeDefined();
      expect(typeof csp).toBe('string');
      expect(directiveMap.size).toBeGreaterThanOrEqual(7);
    });

    it('Probe 38: default-src includes \'self\'', () => {
      const tokens = directiveMap.get('default-src');
      expect(tokens).toBeDefined();
      expect(tokens).toContain("'self'");
    });

    it('Probe 39: script-src includes \'self\' and \'unsafe-inline\' for Next.js 14 App Router inline script hydration', () => {
      const tokens = directiveMap.get('script-src');
      expect(tokens).toBeDefined();
      expect(tokens).toContain("'self'");
      expect(tokens).toContain("'unsafe-inline'");
    });

    it('Probe 40: script-src includes \'unsafe-eval\' for Next.js dynamic chunk loading and React hydration', () => {
      const tokens = directiveMap.get('script-src');
      expect(tokens).toBeDefined();
      expect(tokens).toContain("'unsafe-eval'");
    });

    it('Probe 41: script-src includes https://js.stripe.com for Stripe payment SDK scripts', () => {
      const tokens = directiveMap.get('script-src');
      expect(tokens).toBeDefined();
      expect(tokens).toContain('https://js.stripe.com');
    });

    it('Probe 42: style-src includes \'self\' and \'unsafe-inline\' for Tailwind CSS and SSR style tags', () => {
      const tokens = directiveMap.get('style-src');
      expect(tokens).toBeDefined();
      expect(tokens).toContain("'self'");
      expect(tokens).toContain("'unsafe-inline'");
    });

    it('Probe 43: img-src includes \'self\', data:, and https: for SVG icons and remote assets', () => {
      const tokens = directiveMap.get('img-src');
      expect(tokens).toBeDefined();
      expect(tokens).toContain("'self'");
      expect(tokens).toContain('data:');
      expect(tokens).toContain('https:');
    });

    it('Probe 44: font-src includes \'self\' and data: for embedded web fonts', () => {
      const tokens = directiveMap.get('font-src');
      expect(tokens).toBeDefined();
      expect(tokens).toContain("'self'");
      expect(tokens).toContain('data:');
    });

    it('Probe 45: media-src includes \'self\', blob:, and data: for Web Audio API tone synthesis and audio buffers', () => {
      const tokens = directiveMap.get('media-src');
      expect(tokens).toBeDefined();
      expect(tokens).toContain("'self'");
      expect(tokens).toContain('blob:');
      expect(tokens).toContain('data:');
    });

    it('Probe 46: connect-src includes \'self\' for fetch calls to internal API routes', () => {
      const tokens = directiveMap.get('connect-src');
      expect(tokens).toBeDefined();
      expect(tokens).toContain("'self'");
    });

    it('Probe 47: connect-src includes https://api.stripe.com for Stripe API communication', () => {
      const tokens = directiveMap.get('connect-src');
      expect(tokens).toBeDefined();
      expect(tokens).toContain('https://api.stripe.com');
    });

    it('Probe 48: frame-src includes https://js.stripe.com for Stripe 3D-Secure and card iframes', () => {
      const tokens = directiveMap.get('frame-src');
      expect(tokens).toBeDefined();
      expect(tokens).toContain('https://js.stripe.com');
    });

    it('Probe 49: CSP does NOT contain breaking sandbox or require-trusted-types-for directives', () => {
      expect(directiveMap.has('sandbox')).toBe(false);
      expect(directiveMap.has('require-trusted-types-for')).toBe(false);
    });

    it('Probe 50: All external endpoints in CSP directives use HTTPS protocol', () => {
      for (const [directive, tokens] of directiveMap.entries()) {
        for (const token of tokens) {
          if (token.startsWith('http://')) {
            throw new Error(`Insecure HTTP endpoint detected in CSP directive "${directive}": ${token}`);
          }
        }
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Suite 6: Runtime Alignment & Next.js Compatibility (Probes 51 - 55)
  // ---------------------------------------------------------------------------
  describe('Suite 6: Runtime Alignment & Next.js Compatibility', () => {
    it('Probe 51: next.config.mjs disables poweredByHeader for defense-in-depth', () => {
      const content = fs.readFileSync(NEXT_CONFIG_PATH, 'utf-8');
      expect(content).toMatch(/poweredByHeader:\s*false/);
    });

    it('Probe 52: next.config.mjs does not define conflicting or duplicate headers() hook', () => {
      const content = fs.readFileSync(NEXT_CONFIG_PATH, 'utf-8');
      expect(content).not.toMatch(/async\s+headers\(\)/);
    });

    it('Probe 53: package.json defines deployment scripts for Vercel', () => {
      const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf-8'));
      expect(pkg.scripts.deploy).toBe('vercel');
      expect(pkg.scripts['deploy:preview']).toBe('vercel');
      expect(pkg.scripts['deploy:prod']).toBe('vercel --prod');
    });

    it('Probe 54: package.json defines verify script referencing tests/e2e/verify.ts', () => {
      const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf-8'));
      expect(pkg.scripts.verify).toBe('node --experimental-strip-types tests/e2e/verify.ts');
      const verifyScriptPath = path.join(PROJECT_ROOT, 'tests/e2e/verify.ts');
      expect(fs.existsSync(verifyScriptPath)).toBe(true);
    });

    it('Probe 55: package.json build script compiles Next.js with next build', () => {
      const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf-8'));
      expect(pkg.scripts.build).toBe('next build');
    });
  });

  // ---------------------------------------------------------------------------
  // Suite 7: Compiled HTML Hydration & CSP Compatibility Verification (Probes 56 - 60)
  // ---------------------------------------------------------------------------
  describe('Suite 7: Compiled HTML Hydration & CSP Compatibility Verification', () => {
    const INDEX_HTML_PATH = path.join(PROJECT_ROOT, '.next/server/app/index.html');
    const SUCCESS_HTML_PATH = path.join(PROJECT_ROOT, '.next/server/app/success.html');

    it('Probe 56: Compiled production index.html exists and is readable', () => {
      expect(fs.existsSync(INDEX_HTML_PATH)).toBe(true);
      const content = fs.readFileSync(INDEX_HTML_PATH, 'utf-8');
      expect(content.length).toBeGreaterThan(1000);
    });

    it('Probe 57: All external script tags in index.html use relative paths matching CSP \'self\'', () => {
      const html = fs.readFileSync(INDEX_HTML_PATH, 'utf-8');
      const scriptTags = [...html.matchAll(/<script\b([^>]*)>/gi)];
      for (const s of scriptTags) {
        const srcMatch = s[1].match(/src="([^"]+)"/);
        if (srcMatch) {
          const src = srcMatch[1];
          // Either relative (/_next/...) or matches https://js.stripe.com
          const isSelf = src.startsWith('/');
          const isStripe = src.startsWith('https://js.stripe.com');
          expect(isSelf || isStripe, `Script src violates CSP: ${src}`).toBe(true);
        }
      }
    });

    it('Probe 58: Inline scripts present in index.html are permitted by CSP \'unsafe-inline\'', () => {
      const html = fs.readFileSync(INDEX_HTML_PATH, 'utf-8');
      const inlineScripts = [...html.matchAll(/<script\b(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi)];
      expect(inlineScripts.length).toBeGreaterThan(0);
      // CSP script-src includes 'unsafe-inline' so these inline Next.js hydration scripts execute
      const headerList = parsedConfig.headers[0].headers;
      const csp = headerList.find((h: any) => h.key.toLowerCase() === 'content-security-policy')?.value;
      expect(csp).toMatch(/script-src[^;]*'unsafe-inline'/);
    });

    it('Probe 59: Stylesheets in index.html use relative paths conforming to CSP style-src \'self\'', () => {
      const html = fs.readFileSync(INDEX_HTML_PATH, 'utf-8');
      const styleLinks = [...html.matchAll(/<link\b([^>]*rel="stylesheet"[^>]*)>/gi)];
      expect(styleLinks.length).toBeGreaterThanOrEqual(1);
      for (const link of styleLinks) {
        const hrefMatch = link[1].match(/href="([^"]+)"/);
        if (hrefMatch) {
          expect(hrefMatch[1].startsWith('/')).toBe(true);
        }
      }
    });

    it('Probe 60: Compiled success.html exists and scripts/styles conform to CSP directives', () => {
      expect(fs.existsSync(SUCCESS_HTML_PATH)).toBe(true);
      const html = fs.readFileSync(SUCCESS_HTML_PATH, 'utf-8');
      const scriptTags = [...html.matchAll(/<script\b([^>]*)>/gi)];
      for (const s of scriptTags) {
        const srcMatch = s[1].match(/src="([^"]+)"/);
        if (srcMatch) {
          const src = srcMatch[1];
          const isSelf = src.startsWith('/');
          const isStripe = src.startsWith('https://js.stripe.com');
          expect(isSelf || isStripe, `Script src violates CSP in success.html: ${src}`).toBe(true);
        }
      }
    });
  });
});
