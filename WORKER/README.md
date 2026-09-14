# Drivya Fast CDN Worker (`files.drivya.cloud`)

Cloudflare Edge Worker for accelerated file delivery, previews, and media streaming backed by Cloudflare R2 and Edge Caching.

---

## Features

- **Global Edge Caching**: Sub-10ms TTFB across Cloudflare's 300+ data centers worldwide.
- **Zero-Latency R2 Fetch**: Zero egress cost and zero latency via internal Cloudflare R2 bucket bindings.
- **Short-Lived JWT Verification**: Validated in <1ms via native Web Crypto API (`HS256`).
- **Media Streaming (HTTP Range)**: Native `206 Partial Content` support for video scrubbing, audio streaming, and resumable downloads.
- **Seamless Frontend Compatibility**: Transparently delivers file previews and downloads.

---

## 1. Setup & Installation

Navigate into the `WORKER` directory:

```bash
cd WORKER
npm install
```

---

## 2. Set the JWT Secret

The Worker validates JWTs signed by your backend. Set the secret in Cloudflare:

```bash
npx wrangler secret put JWT_SECRET
```

When prompted, enter the value of `FILE_WORKER_JWT_SECRET` (or `JWT_ACCESS_SECRET`) from your Backend `.env`.

---

## 3. Configure R2 Bucket Binding (in `wrangler.toml`)

Verify that your bucket name in `wrangler.toml` matches your Cloudflare R2 bucket:

```toml
[[r2_buckets]]
binding = "BUCKET"
bucket_name = "drivya-storage" # Replace with your actual R2 bucket name if different
```

---

## 4. Deploy to Cloudflare

Deploy the worker:

```bash
npm run deploy
# or
npx wrangler deploy
```

---

## 5. Backend Configuration

Ensure your `BACKEND/.env` contains:

```env
FILES_BASE_URL=https://files.drivya.cloud
FILE_WORKER_JWT_SECRET=your_jwt_secret_same_as_worker
```
