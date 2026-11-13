# Authoritative DNS Setup & Domain Routing Guide: 369com.co

**Target Domain**: `369com.co`  
**Platform**: Vercel Serverless Edge Network  
**Primary Canonical URL**: `https://369com.co`  
**Secondary URL**: `https://www.369com.co` (308 Permanent Redirect to canonical)  
**Security Standard**: OWASP Compliant, TLS 1.3, Strict HSTS Preload  

---

## 1. Architecture Overview

The web service for `369com.co` is hosted on Vercel's Anycast serverless edge network. Incoming HTTP/HTTPS traffic to `369com.co` is routed to Vercel's global Anycast IP infrastructure, providing low latency, automated distributed denial-of-service (DDoS) mitigation, and zero-cost serverless execution.

### Canonical Routing Topology
- **Apex Domain (`369com.co`)**: Configured as the **Primary Production Domain**.
- **Subdomain (`www.369com.co`)**: Configured with an **HTTP 308 Permanent Redirect** to `https://369com.co`. This guarantees canonical SEO equity, prevents duplicate content penalties, and avoids session or cookie fragmentation across origins.

---

## 2. Authoritative DNS Records Matrix

Configure the following records in the authoritative DNS zone of your registrar or DNS provider for `369com.co`:

| Record Type | Name / Host | Target / Value | TTL | Status / Purpose |
|---|---|---|---|---|
| **A** | `@` (or `369com.co`) | `76.76.21.21` | `300` (5 min) / Auto | **Mandatory**: Routes apex domain to Vercel Anycast edge |
| **CNAME** | `www` | `cname.vercel-dns.com.` | `300` (5 min) / Auto | **Mandatory**: Routes `www` subdomain to Vercel DNS router |
| **CAA** | `@` (or `369com.co`) | `0 issue "letsencrypt.org"` | `300` (5 min) / Auto | **Mandatory**: Authorizes Let's Encrypt automated TLS issuance |
| **CAA** | `@` (or `369com.co`) | `0 issue "globalsign.com"` | `300` (5 min) / Auto | **Mandatory**: Authorizes GlobalSign TLS issuance fallback |
| **CAA** | `@` (or `369com.co`) | `0 issuewild "letsencrypt.org"` | `300` (5 min) / Auto | **Recommended**: Authorizes wildcard certificate renewal |

> **Note on RFC Trailing Dot Notation**:  
> Per RFC 1034/1035, Fully Qualified Domain Names (FQDNs) in zone files include a trailing dot (`cname.vercel-dns.com.`) to indicate the root DNS zone. If your registrar's web management interface displays an error such as *"Invalid character in target host: trailing dot not allowed"*, omit the final period and enter `cname.vercel-dns.com`. The registrar's DNS compiler appends the root zone dot automatically.

---

## 3. Registrar-Specific Step-by-Step Walkthroughs

### 3.1 Cloudflare DNS
If Cloudflare manages DNS for `369com.co`:
1. Log in to the Cloudflare Dashboard and select the **369com.co** domain.
2. Navigate to **DNS** -> **Records**.
3. Add the apex **A Record**:
   - **Type**: `A`
   - **Name**: `@` (or `369com.co`)
   - **IPv4 address**: `76.76.21.21`
   - **Proxy status**: **DNS Only (Grey Cloud)** during initial certificate provisioning.
   - **TTL**: `Auto`
4. Add the subdomain **CNAME Record**:
   - **Type**: `CNAME`
   - **Name**: `www`
   - **Target**: `cname.vercel-dns.com`
   - **Proxy status**: **DNS Only (Grey Cloud)**
   - **TTL**: `Auto`
5. Add the **CAA Records**:
   - **Type**: `CAA` | **Name**: `@` | **Tag**: `Only allow specific CAs to issue certs (issue)` | **Value**: `letsencrypt.org`
   - **Type**: `CAA` | **Name**: `@` | **Tag**: `issue` | **Value**: `globalsign.com`
6. **Critical SSL/TLS Mode Configuration**:
   - If you later enable Cloudflare Proxying (**Orange Cloud**), navigate to **SSL/TLS** -> **Overview**.
   - Set encryption mode strictly to **Full (Strict)**.
   - ⚠️ **DANGER - DO NOT USE "Flexible" SSL**: Using "Flexible" SSL mode forces Cloudflare to connect to Vercel on port 80 (HTTP). Because Vercel immediately redirects port 80 to HTTPS (port 443), an infinite redirect loop (`ERR_TOO_MANY_REDIRECTS`) or HTTP 525 (SSL Handshake Failed) will occur.

### 3.2 Namecheap
1. Log in to Namecheap, open your **Domain List**, and click **Manage** next to `369com.co`.
2. Go to the **Advanced DNS** tab.
3. Remove any default parking records (such as `URL Redirect Record` or parking `A` records pointing to `parkingpage.namecheap.com`).
4. In the **Host Records** section, click **Add New Record**:
   - **Type**: `A Record` | **Host**: `@` | **Value**: `76.76.21.21` | **TTL**: `Automatic` (or `5 min`)
   - **Type**: `CNAME Record` | **Host**: `www` | **Value**: `cname.vercel-dns.com.` | **TTL**: `Automatic`
5. In the same section, add the CAA records:
   - **Type**: `CAA Record` | **Host**: `@` | **Tag**: `issue` | **Value**: `letsencrypt.org`
   - **Type**: `CAA Record` | **Host**: `@` | **Tag**: `issue` | **Value**: `globalsign.com`
6. Click **Save All Changes**.

### 3.3 GoDaddy
1. Log in to GoDaddy and open the **Domain Portfolio**.
2. Select `369com.co` and navigate to **DNS** -> **DNS Records**.
3. Under the records table:
   - Edit the existing `@` `A` record (or click **Add New Record**):
     - **Type**: `A` | **Name**: `@` | **Data**: `76.76.21.21` | **TTL**: `1/2 Hour` (or Custom `600 seconds`)
   - Edit or add the `www` `CNAME` record:
     - **Type**: `CNAME` | **Name**: `www` | **Data**: `cname.vercel-dns.com` *(omit trailing dot if GoDaddy rejects it)* | **TTL**: `1/2 Hour`
   - Add CAA Records:
     - **Type**: `CAA` | **Name**: `@` | **Flags**: `0` | **Tag**: `issue` | **Value**: `letsencrypt.org` | **TTL**: `1/2 Hour`
     - **Type**: `CAA` | **Name**: `@` | **Flags**: `0` | **Tag**: `issue` | **Value**: `globalsign.com` | **TTL**: `1/2 Hour`
4. Click **Save**.

### 3.4 AWS Route 53
1. Log in to the AWS Management Console and open **Route 53** -> **Hosted zones**.
2. Select the hosted zone for `369com.co`.
3. Create the apex **A Record**:
   - Click **Create record**.
   - **Record name**: leave blank (represents apex `369com.co`).
   - **Record type**: `A - Routes traffic to an IPv4 address and some AWS resources`.
   - **Alias toggle**: **OFF** (Do not use Route 53 Alias for external IPs).
   - **Value**: `76.76.21.21`.
   - **TTL (seconds)**: `300`.
   - **Routing policy**: `Simple routing`.
4. Create the subdomain **CNAME Record**:
   - Click **Create record**.
   - **Record name**: `www`.
   - **Record type**: `CNAME`.
   - **Value**: `cname.vercel-dns.com.`.
   - **TTL (seconds)**: `300`.
5. Create the **CAA Records**:
   - Click **Create record**.
   - **Record name**: leave blank.
   - **Record type**: `CAA`.
   - **Value** (multi-line textarea):
     ```text
     0 issue "letsencrypt.org"
     0 issue "globalsign.com"
     0 issuewild "letsencrypt.org"
     ```
   - **TTL (seconds)**: `300`.
6. Click **Create records**.

### 3.5 Google Domains / Squarespace Domains
1. Access the DNS settings panel for `369com.co`.
2. Scroll to **Custom records**.
3. Create:
   - **Host name**: `@` | **Type**: `A` | **TTL**: `300` | **Data**: `76.76.21.21`
   - **Host name**: `www` | **Type**: `CNAME` | **TTL**: `300` | **Data**: `cname.vercel-dns.com.`
   - **Host name**: `@` | **Type**: `CAA` | **TTL**: `300` | **Data**: `0 issue "letsencrypt.org"`
   - **Host name**: `@` | **Type**: `CAA` | **TTL**: `300` | **Data**: `0 issue "globalsign.com"`
4. Click **Save**.

---

## 4. Vercel Custom Domain Configuration

To link the domain in your Vercel project:

1. Open your project on the [Vercel Dashboard](https://vercel.com).
2. Go to **Settings** -> **Domains**.
3. Enter `369com.co` and click **Add**:
   - Select **Add 369com.co and redirect www.369com.co to it** (Recommended canonical setup).
4. Vercel automatically performs Anycast DNS verification and provisions a multi-domain TLS certificate using Let's Encrypt / GlobalSign via ACME challenges.
5. Once verified, both domains display green status badges (`Valid Configuration`).

---

## 5. CLI Verification & Diagnostic Playbook

Run these commands from your local terminal to verify DNS resolution and security posture across every layer:

### 1. Apex A Record Verification
```bash
dig A 369com.co +short
```
*Expected Output:*
```text
76.76.21.21
```

### 2. Subdomain CNAME Record Verification
```bash
dig CNAME www.369com.co +short
```
*Expected Output:*
```text
cname.vercel-dns.com.
```

### 3. CAA Authorization Verification
```bash
dig CAA 369com.co +short
```
*Expected Output:*
```text
0 issue "letsencrypt.org"
0 issue "globalsign.com"
```

### 4. Recursive DNS Authority Trace
```bash
dig A 369com.co +trace
```
*Expected Output:*  
Verifies full delegation path from root root-servers (`.`), down to `.co` ccTLD nameservers, down to your authoritative nameservers, returning `76.76.21.21`.

### 5. Standard NSLookup Cross-Resolution
```bash
nslookup -type=A 369com.co
```
*Expected Output:*
```text
Non-authoritative answer:
Name:    369com.co
Address: 76.76.21.21
```

### 6. Canonical HTTP Redirect Verification (HTTP -> HTTPS)
```bash
curl -I http://369com.co
```
*Expected Output:*
```text
HTTP/1.1 308 Permanent Redirect
Location: https://369com.co/
```

### 7. Subdomain Redirection Verification (www -> Apex)
```bash
curl -I https://www.369com.co
```
*Expected Output:*
```text
HTTP/2 308 
location: https://369com.co/
```

### 8. Live Security Headers & HTTPS Response Verification
```bash
curl -I https://369com.co
```
*Expected Headers Present:*
```text
HTTP/2 200 
content-type: text/html; charset=utf-8
x-content-type-options: nosniff
x-frame-options: DENY
x-xss-protection: 1; mode=block
referrer-policy: strict-origin-when-cross-origin
strict-transport-security: max-age=63072000; includeSubDomains; preload
permissions-policy: camera=(), microphone=(), geolocation=(), payment=(self "https://js.stripe.com")
```

### 9. TLS/SSL Handshake & Certificate Authority Inspection
```bash
openssl s_client -connect 369com.co:443 -servername 369com.co < /dev/null 2>/dev/null | openssl x509 -noout -issuer -subject -dates
```
*Expected Output:*
```text
issuer=C = US, O = Let's Encrypt, CN = R10 (or GlobalSign)
subject=CN = 369com.co
notBefore=...
notAfter=...
```

---

## 6. Production Environment Variables Activation Checklist

Before activating production traffic, configure the following environment variables in **Vercel Project Settings** -> **Environment Variables** (scoped to **Production**):

| Variable Name | Required In Prod? | Sample / Value Format | Description & Security Constraint |
|---|---|---|---|
| `NODE_ENV` | Yes | `production` | Enables Next.js compiler optimizations and minification. |
| `PORT` | Optional | `3000` | Local port; automatically managed by Vercel in production. |
| `NEXT_PUBLIC_APP_URL` | Yes | `https://369com.co` | **Canonical site origin**. Used for Stripe Checkout success/cancel redirects, download tokens, and OpenGraph metadata. |
| `MOCK_PAYMENTS` | Yes | `false` | **CRITICAL**: Must be `false` in production to route orders through the live Stripe gateway. |
| `ALLOW_MOCK_PAYMENTS_IN_PRODUCTION` | Yes | `false` | **CRITICAL FAIL-SAFE**: When `false`, the API strictly rejects any attempt to bypass payments in production with HTTP 503. |
| `STRIPE_SECRET_KEY` | Yes (Live) | `sk_live_51...` | Live Secret API key from Stripe Dashboard. Keep secret; never commit to Git. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Yes (Live) | `pk_live_51...` | Live Publishable API key from Stripe Dashboard. Loaded by browser client. |
| `STRIPE_WEBHOOK_SECRET` | Yes (Live) | `whsec_...` | Webhook signing secret obtained when registering `https://369com.co/api/webhook/stripe` in Stripe Dashboard. |
| `DOWNLOAD_SIGNING_SECRET` | Yes | `[>= 32 random hex chars]` | **Cryptographic Key**: Secret key used for HMAC-SHA256 digital asset download tokens. Minimum 32 characters; failure to provide >=32 characters throws runtime validation errors. |
| `FULFILLMENT_JWT_SECRET` | Yes | `[same as above]` | Backward-compatibility alias for download signing secret. |
| `PRICE_STARTER_CENTS` | Optional | `499` | Price in USD cents for Tier 1 Starter Blueprint ($4.99 fallback). Default: `799` ($7.99). |
| `PRICE_PRO_CENTS` | Optional | `999` | Price in USD cents for Tier 2 Master Frequency Bundle ($9.99). Default: `999`. |
| `PRICE_MASTER_CENTS` | Optional | `1999` | Price in USD cents for Complete Abundance Master Bundle ($19.99). Default: `1999`. |

---

## 7. Troubleshooting & Diagnostics Runbook

### 7.1 DNS Propagation Delays
- **Symptom**: `dig A 369com.co` returns NXDOMAIN or an outdated server IP.
- **Root Cause**: External ISP resolvers cache DNS records until their Time-to-Live (TTL) expires. If your previous DNS records had an 86400s (24h) TTL, resolvers may take hours to pick up the change.
- **Remedy**:
  1. Check global propagation progress across 30+ Anycast points of presence using [DNSChecker.org for 369com.co](https://dnschecker.org/#A/369com.co).
  2. Query Google Public DNS directly: `dig @8.8.8.8 A 369com.co +short`.
  3. Query Cloudflare Public DNS directly: `dig @1.1.1.1 A 369com.co +short`.
  4. Flush local DNS cache (`sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder` on macOS).

### 7.2 Infinite Redirect Loop (`ERR_TOO_MANY_REDIRECTS`) or HTTP 525
- **Symptom**: Browser reports "Too Many Redirects" or Cloudflare displays Error 525 (SSL Handshake Failed).
- **Root Cause**: Cloudflare proxy is active (Orange Cloud) with SSL/TLS encryption mode set to "Flexible". Cloudflare sends HTTP requests to Vercel on port 80; Vercel edge forces HTTPS (port 443) and returns a 308 redirect; Cloudflare catches the 308 and loops back over HTTP.
- **Remedy**:
  1. In Cloudflare Dashboard, go to **SSL/TLS** -> set encryption mode to **Full (Strict)**.
  2. Alternatively, set DNS record proxy status to **DNS Only (Grey Cloud)**.

### 7.3 Apex Domain CNAME Rejection
- **Symptom**: Registrar displays an error: *"CNAME record cannot coexist with other record types on apex/root domain"*.
- **Root Cause**: RFC 1034 section 3.6.2 specifies that if a CNAME record is present at a node, no other data (SOA, NS, MX) should exist. The root zone `@` already contains SOA and NS records.
- **Remedy**: Do **not** use a CNAME for the apex domain `@`. Use an **`A` Record** pointing to `76.76.21.21`. Reserve `CNAME` strictly for the `www` subdomain pointing to `cname.vercel-dns.com.`.

### 7.4 Trailing Dot Rejection
- **Symptom**: Registrar input validation flags `cname.vercel-dns.com.` as an invalid domain name.
- **Root Cause**: Some registrar control panels do not allow users to manually type the root period.
- **Remedy**: Strip the final period and enter `cname.vercel-dns.com`. The registrar automatically adds the trailing dot internally in the BIND zone.

### 7.5 Vercel Shows "Certificate Generation Pending" or "CAA Error"
- **Symptom**: Domain status in Vercel remains yellow with "Issuing Certificate" for longer than 15 minutes.
- **Root Cause**: A pre-existing CAA record (e.g. for Sectigo, DigiCert, or Amazon Trust Services) is blocking Let's Encrypt or GlobalSign from issuing the SSL certificate.
- **Remedy**:
  1. Run `dig CAA 369com.co +short`.
  2. Ensure records `0 issue "letsencrypt.org"` and `0 issue "globalsign.com"` are published.
  3. Delete any obsolete third-party CA records that do not authorize Let's Encrypt or GlobalSign.

### 7.6 Stale DNSSEC Causing SERVFAIL
- **Symptom**: `dig A 369com.co` returns status `SERVFAIL`.
- **Root Cause**: DNSSEC was previously enabled with old registrar nameservers, leaving invalid DS records at the `.co` registry.
- **Remedy**: In your registrar dashboard, navigate to DNSSEC settings. Delete all stale DS records, wait 15 minutes, or re-sign using the current authoritative DNS keys.
