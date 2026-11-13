# Test Infrastructure & Methodology Specification: 369com.co

**Project**: `369com.co` Autonomous Revenue Engine  
**Author**: E2E Test Writer (`teamwork_test_writer_e2e`)  
**Standard**: Antigravity Autonomous Systems Verification Standard  
**Test Framework**: Vitest (Native ESM, TypeScript, Fast In-Memory Execution)  
**Target Coverage**: 100% Feature, Boundary, Pairwise & Real-World User Journey Coverage (F1–F11)  

---

## 1. Test Philosophy & Architecture

The test suite for `369com.co` is engineered to guarantee autonomous operation, monetization integrity, and serverless reliability without requiring human intervention or external service dependencies in CI/CD pipelines.

### 1.1 Core Principles

1. **Zero External Dependencies in CI (Deterministic Execution)**:
   - All tests must pass offline (`exit code 0`) with zero external network calls to live Stripe servers.
   - Deterministic sandbox mode (`MOCK_PAYMENTS=true`) simulates payment processing, session creation, and cryptographic webhook verification.
2. **Progressive Testability & Contract Integrity**:
   - Tests assert exact input/output contracts specified in `PROJECT.md` and `spec.md`.
   - Modularity ensures tests can validate individual subsystem modules (Numerology, Audio, Storage, Webhook, Checkout, Token DRM) independently as well as composed end-to-end user journeys.
3. **Defense-in-Depth Security Verification**:
   - Hardened verification of HMAC-SHA256 webhook signatures, timestamp tolerance (max 300s drift), download token cryptographic expiration, and production safeguards preventing unauthenticated mock bypass.
4. **Self-Contained & Isolated**:
   - Each test sets up its own state, isolates mocks, and cleans up after execution. No test depends on execution order or shared mutable global state.

---

## 2. Four-Tier Testing Methodology

```
┌────────────────────────────────────────────────────────────────────────┐
│                        TIER 4: REAL-WORLD SCENARIOS                    │
│      5+ Full User Journeys (Free Ritual -> Checkout -> PDF Delivery)    │
├────────────────────────────────────────────────────────────────────────┤
│                    TIER 3: CROSS-FEATURE COMBINATIONS                  │
│       Pairwise Integrations (Numerology + Checkout + Webhook + Token)   │
├────────────────────────────────────────────────────────────────────────┤
│                    TIER 2: BOUNDARY & CORNER CASES                     │
│    50+ Stress/Edge Tests (Master Numbers, Crypto Drift, Token Expiry)  │
├────────────────────────────────────────────────────────────────────────┤
│                       TIER 1: FEATURE COVERAGE                         │
│         55+ Base Tests (>=5 tests per feature covering F1–F11)         │
└────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Tier 1: Feature Coverage (F1 through F11)
Validates baseline functional requirements and happy paths across all 11 core features:
- **F1: Project Scaffolding & Foundation**: Next.js App Router structure, TypeScript configuration, Tailwind CSS, scripts, and build manifests.
- **F2: 369 Daily Manifestation Chamber**: Interactive 3 morning, 6 afternoon, 9 evening ritual inputs, completion status, and local persistence.
- **F3: Web Audio Frequency Synthesizer**: In-browser sound synthesis for 369Hz, 396Hz, 528Hz, 639Hz, 963Hz, volume gain, and binaural beat offset.
- **F4: Pythagorean & Tesla Numerology Engine**: Life Path reduction, Master Numbers (11, 22, 33), Destiny/Expression mapping, and Tesla 3-6-9 vortex alignment index.
- **F5: Digital Product Catalog & Pricing**: Tier 1 ($7.99 Blueprint), Tier 2 ($19.99 Master Bundle), Starter ($4.99), cent conversion, and feature sets.
- **F6: Autonomous Stripe Checkout Integration**: `POST /api/checkout`, hosted session creation, sandbox simulation, redirect URLs, and metadata preservation.
- **F7: Webhook Fulfillment & Signature Verification**: `POST /api/webhook/stripe`, HMAC-SHA256 cryptographic verification, timestamp tolerance, and fulfillment order creation.
- **F8: Autonomous Digital Delivery Center**: `/success` dashboard, dynamic personalized PDF generation, signed download tokens, and 1-click download delivery.
- **F9: Configuration & Environment Hardening**: `.env.example` schema enforcement, production fail-safe preventing unauthenticated mock bypass, secret key validation.
- **F10: Serverless Hosting & DNS Configuration Guide**: `vercel.json` deployment specification, OWASP security headers, and authoritative DNS records (A: 76.76.21.21, CNAME: cname.vercel-dns.com).
- **F11: Automated Verification Test Suite**: Offline test execution, mock isolation, error exit code behavior, and CI reliability.

*Minimum standard: >= 5 test cases per feature (Total >= 55 test cases).*

### 2.2 Tier 2: Boundary & Corner Cases
Tests edge conditions, boundary limits, invalid inputs, and adversarial cases:
- **Numerology**: Single-digit birth dates, leap day (2000-02-29), century boundaries (1999 vs 2000), names with non-ASCII accents, hyphens, numbers, and whitespace, master numbers (11, 22, 33).
- **Web Audio**: 0Hz boundary, extreme volume (0.0 to 1.0 clamped), unsupported frequencies, rapid start/stop toggles without clipping.
- **Manifestation Chamber**: Empty inputs, whitespace-only entries, strings exceeding 500 characters, corrupted localStorage JSON, quota exceeded errors.
- **Checkout API**: Invalid tier IDs, empty request body, missing intention strings, excess intention length (>500 chars), production mock bypass attempt without flag.
- **Webhook Processing**: Tampered payload body, corrupted signature header, missing timestamp (`t=`), expired timestamp (>300 seconds drift), replayed duplicate event IDs.
- **Token DRM & Delivery**: Expired JWT/HMAC token, tampered signature, unknown tier asset request, malformed base64 token.
- **DNS & Serverless**: Verifying trailing dot in DNS targets, case insensitivity in domain records, security header presence.

*Minimum standard: >= 5 test cases per feature where boundaries exist (Total >= 50 test cases).*

### 2.3 Tier 3: Cross-Feature Combinations
Tests pairwise and multi-component workflows:
1. **Numerology + Checkout + Webhook + Token**: User calculates numerology -> passes profile to checkout -> webhook records order with numerology metadata -> token dispenser delivers personalized download URL.
2. **Chamber + Local Storage + Streak Calculation**: Ritual inputs across multiple calendar days properly advance streaks and retain entries without overwriting previous sessions.
3. **Web Audio + Ritual Session**: Audio engine maintains state while user types affirmations, ensuring zero audio glitching or thread blocking.
4. **Mock Payment Fallback + Fulfillment Pipeline**: Synchronous mock checkout triggers instant fulfillment order creation and valid download token generation.
5. **Environment Configuration + API Route Security**: Application enforces strict production guards when `NODE_ENV=production`, disabling mock mode unless explicitly overridden.

### 2.4 Tier 4: Real-World Application Scenarios
Simulates 5 complete end-to-end user journeys:
- **Scenario 1: The Free Daily Practitioner**: A visitor opens `369com.co`, synthesizes 369Hz sound, completes morning (3x), afternoon (6x), and evening (9x) affirmations, and returns the next day with preserved progress.
- **Scenario 2: The Personalized Blueprint Buyer (Tier 1 - $7.99)**: A seeker inputs their birth date and name, receives their Tesla vortex score, triggers checkout for Tier 1, completes checkout in mock/live mode, lands on `/success`, and downloads their customized PDF blueprint.
- **Scenario 3: The Sacred Frequency Master (Tier 2 - $19.99)**: A user selects the Sacred Master Bundle, completes checkout, receives instant access to the full 9-frequency Solfeggio soundscape and master PDF guide.
- **Scenario 4: Webhook Replay & Idempotent Recovery**: A network drop causes Stripe to retry `checkout.session.completed` 3 times; the system processes the first, gracefully acknowledges duplicates without re-granting, and allows the user to re-download the asset via `/api/order/status`.
- **Scenario 5: Autonomous Zero-Credential CI Pipeline**: The automated test suite executes in a cold CI container without internet access or live credentials, completing all verification checks with exit code 0.

---

## 3. Test Runner & Configuration

- **Runner**: `vitest`
- **Configuration**: `vitest.config.ts`
- **Environment**: `node` / `jsdom`
- **Execution Commands**:
  ```bash
  # Run all E2E tests
  vitest run tests/e2e

  # Run specific tiers
  vitest run tests/e2e/tier1-features.test.ts
  vitest run tests/e2e/tier2-boundaries.test.ts
  vitest run tests/e2e/tier3-cross-feature.test.ts
  vitest run tests/e2e/tier4-scenarios.test.ts

  # Run via package script
  pnpm test:e2e
  ```

---

## 4. Test Suite Inventory & Target Counts

| Test File | Focus | Feature Scope | Target Tests |
|---|---|---|---|
| `tests/e2e/tier1-features.test.ts` | Base Feature Coverage | F1 through F11 | >= 55 tests |
| `tests/e2e/tier2-boundaries.test.ts` | Boundary & Corner Cases | F1 through F11 Boundaries | >= 50 tests |
| `tests/e2e/tier3-cross-feature.test.ts` | Pairwise & Cross-Feature Integration | F2+F3, F4+F6, F6+F7+F8, F9+F6 | >= 15 tests |
| `tests/e2e/tier4-scenarios.test.ts` | Real-World Application User Journeys | Complete End-to-End Flows | >= 5 journeys |
| **Total Test Suite** | **Comprehensive E2E Verification** | **F1–F11 All Tiers** | **>= 125 tests** |
