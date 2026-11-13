# Serverless Deployment Runbook: 369com.co on Vercel

**Target Domain**: `369com.co`  
**Hosting Architecture**: Vercel Serverless Edge Platform  
**Runtime**: Node.js 20.x Serverless Functions & Edge Routing  
**Framework**: Next.js 14+ App Router  
**Package Manager**: `pnpm` (>= 9.0.0)  

---

## 1. Architecture & Platform Overview

The `369com.co` application is built on the Next.js 14 App Router, deployed to Vercel's global serverless edge infrastructure.

- **Static Pages (`○`)**: Landing page (`/`), delivery confirmation page (`/success`), and error pages are statically optimized at build time and served directly from Vercel's global Anycast CDN cache with sub-millisecond TTFB.
- **Dynamic Serverless Route Handlers (`ƒ`)**:
  - `POST /api/checkout`: Generates Stripe Checkout sessions and mock sandbox sessions.
  - `POST /api/webhook/stripe`: Validates incoming Stripe HMAC-SHA256 signatures, unpacks metadata, and provisions fulfillment tokens.
  - `GET /api/download`: Cryptographically verifies signed DRM download tokens and streams dynamic personalized PDFs or asset archives.
  - `GET /api/order/status`: Returns fulfillment status for polling checkout clients.
- **Zero COGS Infrastructure**: Runs on Vercel's generous free tier with zero fixed monthly compute costs.

---

## 2. Prerequisites & Tooling

Before deploying, ensure you have:

1. **Node.js**: Version `>= 20.9.0` (`node -v`).
2. **Package Manager**: `pnpm` version `>= 9.0.0` (`pnpm -v`).
3. **Vercel CLI**: Optional for local CLI deployment:
   ```bash
   pnpm add -g vercel
   # Or invoke via npx:
   npx vercel --version
   ```
4. **Vercel Account**: Linked to your GitHub/GitLab account.
5. **Stripe Account**: Access to both Test and Live API keys.
6. **Domain DNS Access**: Administrative rights to manage DNS for `369com.co`.

---

## 3. Step-by-Step Vercel Deployment

### Method A: Git-Integrated Continuous Deployment (Recommended)

1. **Push Repository to GitHub / GitLab**:
   Ensure your local branch is committed and pushed:
   ```bash
   git status
   git push origin main
   ```
2. **Import Project into Vercel**:
   - Go to the [Vercel Dashboard](https://vercel.com/new).
   - Click **Import** next to `domain_369com_co`.
   - In **Project Settings**:
     - **Framework Preset**: `Next.js` (automatically detected).
     - **Root Directory**: `./`.
     - **Build Command**: `pnpm run build` (or leave default).
     - **Output Directory**: `.next` (default).
     - **Install Command**: `pnpm install` (default).
3. **Configure Environment Variables**:
   Under **Environment Variables**, add the mandatory production variables (see Section 5 below).
4. **Deploy**:
   Click **Deploy**. Vercel will clone the repository, run `pnpm build`, deploy static assets to the CDN, and provision Node.js 20 Serverless Functions.

---

### Method B: Vercel CLI Deployment

From the project root (`/Users/will/teamwork_projects/domain_369com_co`):

1. **Authenticate to Vercel**:
   ```bash
   vercel login
   ```
2. **Link Local Directory to Vercel Project**:
   ```bash
   vercel link
   ```
3. **Deploy a Preview Build**:
   ```bash
   pnpm run deploy:preview
   # Or directly: vercel
   ```
   This generates an ephemeral preview URL (e.g. `domain-369com-co-abc123.vercel.app`) for staging verification.
4. **Deploy Directly to Production**:
   ```bash
   pnpm run deploy:prod
   # Or directly: vercel --prod
   ```
   This uploads and assigns the build directly to `369com.co`.

---

## 4. Custom Domain Binding

Once your project is created in Vercel:

1. In the Vercel Dashboard, go to **Settings** -> **Domains**.
2. Enter `369com.co` and click **Add**:
   - Select **Add 369com.co and redirect www.369com.co to it**.
3. Verify the DNS records match the configuration in `docs/DNS_SETUP_GUIDE.md`:
   - Apex A Record: `@` -> `76.76.21.21` (TTL 300)
   - Subdomain CNAME: `www` -> `cname.vercel-dns.com.` (TTL 300)
   - CAA Records: `0 issue "letsencrypt.org"`, `0 issue "globalsign.com"`
4. Within 1–5 minutes, Vercel will complete DNS challenge verification and issue a free automated TLS 1.3 certificate.

---

## 5. Stripe Webhook Registration

To enable autonomous order fulfillment for live credit card and debit payments:

1. Open the [Stripe Dashboard](https://dashboard.stripe.com/).
2. Switch to **Developers** -> **Webhooks**.
3. Click **Add endpoint**.
4. Enter the endpoint URL:
   ```text
   https://369com.co/api/webhook/stripe
   ```
5. Select events to listen to:
   - Check `checkout.session.completed`.
6. Click **Add endpoint**.
7. In the newly created endpoint details page, locate the **Signing secret** (starts with `whsec_...`).
8. Click **Reveal** and copy the secret.
9. In the Vercel Dashboard, navigate to **Settings** -> **Environment Variables**.
10. Add `STRIPE_WEBHOOK_SECRET` with the revealed `whsec_...` value, scoped to **Production**.
11. Redeploy the latest commit or trigger an instant redeployment so the serverless functions pick up the new secret.

---

## 6. Production Security & Fail-Safe Configuration

Before opening traffic to public customers, review these security safeguards:

### 1. Disable Mock Payments in Production
Set the following environment variables in Vercel:
```bash
MOCK_PAYMENTS=false
ALLOW_MOCK_PAYMENTS_IN_PRODUCTION=false
```
*Fail-Safe Protection*: Even if someone attempts to craft an unauthenticated request to the mock payment sandbox on the production domain, the application will reject it with HTTP 503 (`Service Unavailable`), ensuring no unpaid digital fulfillment can ever occur in production.

### 2. High-Entropy Download Signing Key
Generate a 64-character cryptographic random hex key for DRM token generation:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Set both `DOWNLOAD_SIGNING_SECRET` and `FULFILLMENT_JWT_SECRET` to this value in Vercel.

### 3. OWASP Security Headers
The included `vercel.json` automatically injects the following security headers on every response:
- `X-Content-Type-Options: nosniff`: Prevents MIME confusion attacks on PDF and asset downloads.
- `X-Frame-Options: DENY`: Blocks clickjacking and iframe framing.
- `Strict-Transport-Security`: Forces 2-year HTTPS preload (`max-age=63072000; includeSubDomains; preload`).
- `Permissions-Policy`: Restricts camera, microphone, and geolocation hardware access while allowing payment APIs (`payment=(self "https://js.stripe.com")`).
- `Content-Security-Policy`: Permits Next.js scripts, Tailwind CSS styling, Web Audio synthesis, and Stripe checkout integration.

---

## 7. Zero-Downtime Rollback & Disaster Recovery

Every deployment on Vercel is immutable and receives a unique, permanent deployment URL.

### Instant 1-Click Rollback via Dashboard
If a production defect is detected:
1. Open the Vercel Dashboard for `domain_369com_co`.
2. Navigate to the **Deployments** tab.
3. Locate the last known good deployment.
4. Click the three dots (`...`) -> **Instant Rollback** (or **Promote to Production**).
5. Vercel's Anycast edge router instantly switches traffic to the previous deployment in **< 300 milliseconds** without rebuilding or downtime.

### CLI Rollback
You can also trigger a rollback from your terminal:
```bash
vercel rollback [deployment-url-or-id]
```

### Stripe Webhook Replay for Lost Events
If an outage occurs while customers are purchasing:
1. Open the **Stripe Dashboard** -> **Developers** -> **Webhooks**.
2. Select the `https://369com.co/api/webhook/stripe` endpoint.
3. In the event log, filter by failed events (HTTP 5xx).
4. Click on any affected event and select **Resend event**.
5. The application's idempotent fulfillment handler processes the event, creates the digital dossier, and notifies the customer.

---

## 8. Verification Checklist

Run these commands locally to verify production readiness before every deployment:

```bash
# 1. Validate vercel.json format
node -e "JSON.parse(require('fs').readFileSync('vercel.json', 'utf8')); console.log('vercel.json valid!');"

# 2. Execute full automated test suite (Unit & E2E)
pnpm test

# 3. Execute offline verification test runner
pnpm run verify

# 4. Execute production Next.js compilation
pnpm run build

# 5. Run ESLint checks
pnpm run lint
```
All five checks must complete with **exit code 0** and zero warnings or errors.
