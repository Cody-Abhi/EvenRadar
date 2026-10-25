# EventRadar Deployment Guide

This guide covers deployment options for the EventRadar Next.js 15 application, OpenAPI 3.1 specification portal, and FastAPI microservice.

---

## 1. Deploy with Vercel (Recommended for Next.js)

The fastest and most reliable deployment platform for EventRadar's Next.js 15 App Router:

### Option A: Via Vercel Dashboard (1-Click Git Integration)
1. Go to [vercel.com/new](https://vercel.com/new).
2. Connect your GitHub account and select repository: [`Cody-Abhi/EvenRadar`](https://github.com/Cody-Abhi/EvenRadar).
3. Under **Environment Variables**, add:
   - `GEMINI_API_KEY`: Your Google Gemini API key
   - `TINYFISH_API_KEY`: Your TinyFish API key
   - `GEMINI_MODEL`: `gemini-3.1-flash-lite` (or `gemini-2.5-flash`)
   - `NEXT_PUBLIC_MAPBOX_TOKEN`: Your Mapbox public access token
   - `NEXT_PUBLIC_FIREBASE_API_KEY`: Your Firebase web API key
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`: `eventradar-f59b9.firebaseapp.com`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`: `eventradar-f59b9`
4. Click **Deploy**. Vercel will build and serve your app at `https://evenradar.vercel.app`.

### Option B: Via Vercel CLI
```bash
# 1. Login to your Vercel account
npx vercel login

# 2. Deploy directly with production flags
npx vercel deploy --prod
```

---

## 2. Deploy with Docker & Docker Compose

Deploy the Next.js app and the FastAPI service together on any VPS, AWS EC2, DigitalOcean Droplet, or GCP Compute Engine:

```bash
# 1. Ensure .env.local has your keys
docker compose build

# 2. Start services in detached mode
docker compose up -d

# 3. Verify health
docker compose ps
curl http://localhost:3000/api/openapi.json
curl http://localhost:8000/health
```

---

## 3. Deploy with Render / Railway

### Render:
1. Connect [`Cody-Abhi/EvenRadar`](https://github.com/Cody-Abhi/EvenRadar) as a **Web Service**.
2. Environment: `Node`.
3. Build Command: `npm install && npm run build`.
4. Start Command: `npm run start`.
5. Set the Environment Variables (`GEMINI_API_KEY`, `TINYFISH_API_KEY`, etc.).

### Railway:
1. Create a New Project -> **Deploy from GitHub Repo**.
2. Select [`Cody-Abhi/EvenRadar`](https://github.com/Cody-Abhi/EvenRadar).
3. Set the variables in the **Variables** tab. Railway automatically runs `npm run build` and `npm run start`.

---

## 4. Live Verification Endpoints

Once deployed, verify these endpoints:
- **Web App**: `https://<your-domain>/`
- **Interactive API Documentation Portal**: `https://<your-domain>/docs`
- **OpenAPI 3.1 JSON Specification**: `https://<your-domain>/api/openapi.json`
- **Events Search API**: `https://<your-domain>/api/events?topic=AI&location=India`
- **CV Matchmaker API**: `POST https://<your-domain>/api/cv-match`
