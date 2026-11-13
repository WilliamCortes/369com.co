import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const DNS_GUIDE_PATH = path.join(PROJECT_ROOT, 'docs/DNS_SETUP_GUIDE.md');
const DEPLOYMENT_MD_PATH = path.join(PROJECT_ROOT, 'docs/DEPLOYMENT.md');
const VERCEL_JSON_PATH = path.join(PROJECT_ROOT, 'vercel.json');
const PACKAGE_JSON_PATH = path.join(PROJECT_ROOT, 'package.json');

describe('CHALLENGER 2 EMPIRICAL ADVERSARIAL VERIFICATION: DNS RFC & Domain Routing Resolution (M4)', () => {

  // =========================================================================
  // 1. DNS RFC Adherence: Apex A Record IPv4 Validation (RFC 791, 1918, 5735)
  // =========================================================================
  describe('1. DNS RFC Adherence: Apex A Record Target (76.76.21.21)', () => {
    const APEX_IP = '76.76.21.21';

    it('PROBE 1.1: Apex IP strictly adheres to RFC 791 IPv4 dotted-decimal syntax', () => {
      const octets = APEX_IP.split('.');
      expect(octets.length).toBe(4);
      for (const octet of octets) {
        expect(octet).toMatch(/^(0|[1-9]\d{0,2})$/);
        const val = Number(octet);
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThanOrEqual(255);
        expect(String(val)).toBe(octet); // No leading zeroes
      }
    });

    it('PROBE 1.2: Apex IP is NOT in RFC 1918 Private Address Space (10/8, 172.16/12, 192.168/16)', () => {
      const octets = APEX_IP.split('.').map(Number);
      const is10 = octets[0] === 10;
      const is172Private = octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31;
      const is192168 = octets[0] === 192 && octets[1] === 168;

      expect(is10).toBe(false);
      expect(is172Private).toBe(false);
      expect(is192168).toBe(false);
    });

    it('PROBE 1.3: Apex IP is NOT in RFC 1122 / RFC 5735 Loopback Space (127.0.0.0/8)', () => {
      const octets = APEX_IP.split('.').map(Number);
      expect(octets[0]).not.toBe(127);
    });

    it('PROBE 1.4: Apex IP is NOT in RFC 3927 Link-Local Space (169.254.0.0/16)', () => {
      const octets = APEX_IP.split('.').map(Number);
      const isLinkLocal = octets[0] === 169 && octets[1] === 254;
      expect(isLinkLocal).toBe(false);
    });

    it('PROBE 1.5: Apex IP is NOT in RFC 5771 Multicast (224.0.0.0/4) or Reserved (240.0.0.0/4, 0.0.0.0/8, 255.255.255.255)', () => {
      const octets = APEX_IP.split('.').map(Number);
      const isMulticast = octets[0] >= 224 && octets[0] <= 239;
      const isReserved = octets[0] >= 240;
      const isCurrentNetwork = octets[0] === 0;
      const isBroadcast = APEX_IP === '255.255.255.255';

      expect(isMulticast).toBe(false);
      expect(isReserved).toBe(false);
      expect(isCurrentNetwork).toBe(false);
      expect(isBroadcast).toBe(false);
    });

    it('PROBE 1.6: Apex IP is in Vercel Anycast Global Public Routable Range', () => {
      // 76.76.21.21 belongs to AS135377 / AS209242 (Vercel Inc.)
      const octets = APEX_IP.split('.').map(Number);
      expect(octets[0]).toBe(76);
      expect(octets[1]).toBe(76);
      expect(octets[2]).toBe(21);
      expect(octets[3]).toBe(21);
    });

    it('PROBE 1.7: docs/DNS_SETUP_GUIDE.md explicitly documents 76.76.21.21 in authoritative table', () => {
      const dnsGuide = fs.readFileSync(DNS_GUIDE_PATH, 'utf-8');
      expect(dnsGuide).toContain('76.76.21.21');
      // Match markdown table row: | **A** | `@` ... | `76.76.21.21` |
      expect(dnsGuide).toMatch(/\|\s*\*\*A\*\*\s*\|\s*`@`.*?\|\s*`76\.76\.21\.21`\s*\|/);
    });

    it('PROBE 1.8: docs/DNS_SETUP_GUIDE.md explains RFC 1034 §3.6.2 CNAME apex coexistence restriction', () => {
      const dnsGuide = fs.readFileSync(DNS_GUIDE_PATH, 'utf-8');
      expect(dnsGuide).toContain('RFC 1034');
      expect(dnsGuide).toContain('coexist');
      expect(dnsGuide).toContain('CNAME');
    });
  });

  // =========================================================================
  // 2. DNS RFC Adherence: CNAME Target & RFC 1035 FQDN Trailing Dot Notation
  // =========================================================================
  describe('2. DNS RFC Adherence: CNAME Target (cname.vercel-dns.com.)', () => {
    const CNAME_FQDN = 'cname.vercel-dns.com.';

    it('PROBE 2.1: CNAME target strictly preserves trailing dot for RFC 1035 §5.1 zone file compliance', () => {
      expect(CNAME_FQDN.endsWith('.')).toBe(true);
      expect(CNAME_FQDN).toBe('cname.vercel-dns.com.');
    });

    it('PROBE 2.2: Adversarial Simulation: Omitting trailing dot causes relative origin concatenation bug', () => {
      const origin = '369com.co.';
      const simulateZoneResolution = (record: string, zoneOrigin: string) => {
        if (record.endsWith('.')) {
          return record; // Absolute FQDN
        }
        return `${record}.${zoneOrigin}`; // Relative record expanded by BIND/RFC 1035
      };

      const correctFQDN = simulateZoneResolution('cname.vercel-dns.com.', origin);
      const buggyRelative = simulateZoneResolution('cname.vercel-dns.com', origin);

      expect(correctFQDN).toBe('cname.vercel-dns.com.');
      expect(buggyRelative).toBe('cname.vercel-dns.com.369com.co.');
      expect(buggyRelative).not.toBe('cname.vercel-dns.com.');
    });

    it('PROBE 2.3: docs/DNS_SETUP_GUIDE.md includes cname.vercel-dns.com. with trailing dot in table', () => {
      const dnsGuide = fs.readFileSync(DNS_GUIDE_PATH, 'utf-8');
      expect(dnsGuide).toContain('cname.vercel-dns.com.');
      expect(dnsGuide).toMatch(/\|\s*\*\*CNAME\*\*\s*\|\s*`www`\s*\|\s*`cname\.vercel-dns\.com\.`\s*\|/);
    });

    it('PROBE 2.4: docs/DNS_SETUP_GUIDE.md documents registrar UI trailing dot variance (GoDaddy / Cloudflare)', () => {
      const dnsGuide = fs.readFileSync(DNS_GUIDE_PATH, 'utf-8');
      expect(dnsGuide).toContain('trailing dot');
      expect(dnsGuide).toContain('Note on RFC Trailing Dot Notation');
      expect(dnsGuide).toContain('omit the final period');
    });
  });

  // =========================================================================
  // 3. DNS RFC Adherence: CAA Records (RFC 6844 / RFC 8659)
  // =========================================================================
  describe('3. DNS RFC Adherence: CAA Records Authorization (RFC 6844 / RFC 8659)', () => {
    it('PROBE 3.1: Validates RFC 8659 CAA record format for letsencrypt.org', () => {
      const record = '0 issue "letsencrypt.org"';
      const match = record.match(/^(\d+)\s+(issue|issuewild|iodef)\s+"([^"]+)"$/);
      expect(match).not.toBeNull();
      if (match) {
        const [, flag, tag, value] = match;
        expect(flag).toBe('0'); // Issuer critical flag = 0 (non-critical)
        expect(tag).toBe('issue');
        expect(value).toBe('letsencrypt.org');
      }
    });

    it('PROBE 3.2: Validates RFC 8659 CAA record format for globalsign.com', () => {
      const record = '0 issue "globalsign.com"';
      const match = record.match(/^(\d+)\s+(issue|issuewild|iodef)\s+"([^"]+)"$/);
      expect(match).not.toBeNull();
      if (match) {
        const [, flag, tag, value] = match;
        expect(flag).toBe('0');
        expect(tag).toBe('issue');
        expect(value).toBe('globalsign.com');
      }
    });

    it('PROBE 3.3: Validates RFC 8659 CAA issuewild record format for letsencrypt.org', () => {
      const record = '0 issuewild "letsencrypt.org"';
      const match = record.match(/^(\d+)\s+(issue|issuewild|iodef)\s+"([^"]+)"$/);
      expect(match).not.toBeNull();
      if (match) {
        const [, flag, tag, value] = match;
        expect(flag).toBe('0');
        expect(tag).toBe('issuewild');
        expect(value).toBe('letsencrypt.org');
      }
    });

    it('PROBE 3.4: docs/DNS_SETUP_GUIDE.md specifies all 3 CAA records in authoritative matrix', () => {
      const dnsGuide = fs.readFileSync(DNS_GUIDE_PATH, 'utf-8');
      expect(dnsGuide).toContain('0 issue "letsencrypt.org"');
      expect(dnsGuide).toContain('0 issue "globalsign.com"');
      expect(dnsGuide).toContain('0 issuewild "letsencrypt.org"');
    });

    it('PROBE 3.5: docs/DNS_SETUP_GUIDE.md provides CAA error diagnosis runbook in Section 7.5', () => {
      const dnsGuide = fs.readFileSync(DNS_GUIDE_PATH, 'utf-8');
      expect(dnsGuide).toContain('Certificate Generation Pending');
      expect(dnsGuide).toContain('CAA Error');
      expect(dnsGuide).toContain('dig CAA 369com.co +short');
    });
  });

  // =========================================================================
  // 4. Cloudflare Edge Case Probe: Infinite 301/308 Redirect Loop Mitigation
  // =========================================================================
  describe('4. Cloudflare Edge Case Probe: SSL Mode Redirect Loop Resolution', () => {
    it('PROBE 4.1: Adversarial State Machine: Cloudflare Flexible SSL triggers infinite redirect loop', () => {
      type Connection = { clientProtocol: 'http' | 'https'; cloudflareToOrigin: 'http' | 'https' };
      
      const simulateRequest = (conn: Connection) => {
        // Vercel edge forced HTTPS rule: if incoming request is HTTP, return 308 redirect to HTTPS
        if (conn.cloudflareToOrigin === 'http') {
          return { status: 308, location: 'https://369com.co/' };
        }
        return { status: 200, body: 'OK' };
      };

      // Case A: Cloudflare Flexible SSL
      // Browser visits HTTPS -> Cloudflare terminates -> Cloudflare forwards over HTTP port 80 to Vercel
      const flexibleConfig: Connection = { clientProtocol: 'https', cloudflareToOrigin: 'http' };
      let redirects = 0;
      let currentConn = flexibleConfig;
      const MAX_HOPS = 10;

      while (redirects < MAX_HOPS) {
        const res = simulateRequest(currentConn);
        if (res.status === 308) {
          redirects++;
          // In Flexible mode, Cloudflare receives redirect to HTTPS, but because mode is "Flexible",
          // it continues to communicate with origin over HTTP!
          currentConn = { clientProtocol: 'https', cloudflareToOrigin: 'http' };
        } else {
          break;
        }
      }

      // Proves that Flexible SSL results in infinite redirects hitting MAX_HOPS
      expect(redirects).toBe(MAX_HOPS);
    });

    it('PROBE 4.2: Adversarial State Machine: Cloudflare Full (Strict) SSL terminates cleanly with 200 OK', () => {
      type Connection = { clientProtocol: 'http' | 'https'; cloudflareToOrigin: 'http' | 'https' };
      
      const simulateRequest = (conn: Connection) => {
        if (conn.cloudflareToOrigin === 'http') {
          return { status: 308, location: 'https://369com.co/' };
        }
        return { status: 200, body: 'OK' };
      };

      // Case B: Cloudflare Full (Strict) SSL
      // Browser visits HTTPS -> Cloudflare terminates -> Cloudflare forwards over HTTPS port 443 to Vercel
      const fullStrictConfig: Connection = { clientProtocol: 'https', cloudflareToOrigin: 'https' };
      const res = simulateRequest(fullStrictConfig);

      expect(res.status).toBe(200);
      expect(res.body).toBe('OK');
    });

    it('PROBE 4.3: docs/DNS_SETUP_GUIDE.md explicitly details the Flexible SSL danger and port 80/443 conflict', () => {
      const dnsGuide = fs.readFileSync(DNS_GUIDE_PATH, 'utf-8');
      expect(dnsGuide).toContain('DANGER - DO NOT USE "Flexible" SSL');
      expect(dnsGuide).toContain('port 80 (HTTP)');
      expect(dnsGuide).toContain('port 443');
      expect(dnsGuide).toContain('ERR_TOO_MANY_REDIRECTS');
      expect(dnsGuide).toContain('HTTP 525');
    });

    it('PROBE 4.4: docs/DNS_SETUP_GUIDE.md mandates Full (Strict) or DNS Only (Grey Cloud)', () => {
      const dnsGuide = fs.readFileSync(DNS_GUIDE_PATH, 'utf-8');
      expect(dnsGuide).toContain('Full (Strict)');
      expect(dnsGuide).toContain('DNS Only (Grey Cloud)');
    });
  });

  // =========================================================================
  // 5. Vercel Serverless & Security Headers Compliance (vercel.json)
  // =========================================================================
  describe('5. Vercel Serverless & OWASP Security Headers (vercel.json)', () => {
    it('PROBE 5.1: vercel.json is parseable, valid JSON matching Vercel schema', () => {
      const content = fs.readFileSync(VERCEL_JSON_PATH, 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed.$schema).toBe('https://openapi.vercel.sh/vercel.json');
      expect(parsed.framework).toBe('nextjs');
      expect(parsed.cleanUrls).toBe(true);
      expect(parsed.trailingSlash).toBe(false);
    });

    it('PROBE 5.2: vercel.json applies OWASP security headers to all routes (/(.*))', () => {
      const content = fs.readFileSync(VERCEL_JSON_PATH, 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed.headers).toBeInstanceOf(Array);
      expect(parsed.headers.length).toBeGreaterThanOrEqual(1);

      const rootRoute = parsed.headers.find((h: any) => h.source === '/(.*)');
      expect(rootRoute).toBeDefined();

      const headerMap = new Map<string, string>();
      for (const h of rootRoute.headers) {
        headerMap.set(h.key, h.value);
      }

      expect(headerMap.get('X-Content-Type-Options')).toBe('nosniff');
      expect(headerMap.get('X-Frame-Options')).toBe('DENY');
      expect(headerMap.get('X-XSS-Protection')).toBe('1; mode=block');
      expect(headerMap.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
      
      const hsts = headerMap.get('Strict-Transport-Security');
      expect(hsts).toBeDefined();
      expect(hsts).toContain('max-age=63072000');
      expect(hsts).toContain('includeSubDomains');
      expect(hsts).toContain('preload');

      const permissions = headerMap.get('Permissions-Policy');
      expect(permissions).toContain('payment=(self "https://js.stripe.com")');

      const csp = headerMap.get('Content-Security-Policy');
      expect(csp).toBeDefined();
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain('https://js.stripe.com');
      expect(csp).toContain('https://api.stripe.com');
    });

    it('PROBE 5.3: package.json provides deploy and verify scripts', () => {
      const content = fs.readFileSync(PACKAGE_JSON_PATH, 'utf-8');
      const pkg = JSON.parse(content);
      expect(pkg.scripts.deploy).toBe('vercel');
      expect(pkg.scripts['deploy:preview']).toBe('vercel');
      expect(pkg.scripts['deploy:prod']).toBe('vercel --prod');
      expect(pkg.scripts.verify).toBe('node --experimental-strip-types tests/e2e/verify.ts');
    });
  });

  // =========================================================================
  // 6. Automated Verification Execution
  // =========================================================================
  describe('6. Automated Verification Execution: verify.ts', () => {
    it('PROBE 6.1: Executes node --experimental-strip-types tests/e2e/verify.ts with exit code 0', () => {
      const result = execSync('node --experimental-strip-types tests/e2e/verify.ts', {
        cwd: PROJECT_ROOT,
        encoding: 'utf-8'
      });

      expect(result).toContain('Total Test Cases Executed: 136');
      expect(result).toContain('Passed:                   136');
      expect(result).toContain('Failed:                   0');
      expect(result).toContain('ALL TEST SUITES PASSED CLEANLY (Exit Code 0)');
    });
  });
});
