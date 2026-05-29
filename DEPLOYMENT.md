# Deploying to Render

This guide walks you through deploying the **Bank Ledger System Backend** to [Render](https://render.com).

---

## 1. Prerequisites

- A GitHub account with this repo pushed to it.
- A **MongoDB Atlas** cluster (free tier is fine). Get the connection string.
- A free **Render** account: https://render.com.
- Your Gmail OAuth2 credentials (only if you want email notifications to work).

---

## 2. Push your code to GitHub

```bash
git add .
git commit -m "Prepare for Render deployment + add Swagger docs"
git push origin main
```

> Make sure your `.env` file is in `.gitignore` and **never** pushed.

---

## 3. Whitelist Render in MongoDB Atlas

Render's outbound IPs are dynamic. The simplest way:

1. Go to your Atlas cluster → **Network Access**.
2. Click **Add IP Address** → **Allow Access from Anywhere** (`0.0.0.0/0`).
3. Confirm.

(For production, prefer a dedicated egress IP — see Render docs.)

---

## 4. Create the Render service

### Option A — Blueprint (recommended, uses `render.yaml`)

1. Go to https://dashboard.render.com/blueprints.
2. Click **New Blueprint Instance** → connect your GitHub repo.
3. Render reads [`render.yaml`](./render.yaml) and pre-fills everything.
4. Fill in the secret env vars (see step 5 below).
5. Click **Apply**.

### Option B — Manual

1. Go to https://dashboard.render.com → **New +** → **Web Service**.
2. Connect your GitHub repo.
3. Configure:
   - **Name:** `bank-ledger-system`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/health`
   - **Plan:** Free

---

## 5. Set environment variables

In the Render dashboard for your service → **Environment** → add each of these:

| Variable        | Description                                       |
| --------------- | ------------------------------------------------- |
| `MONGO_URI`     | MongoDB Atlas connection string                   |
| `JWT_SECRET`    | A long random string (e.g. `openssl rand -hex 32`)|
| `CLIENT_ID`     | Gmail OAuth2 client ID                            |
| `CLIENT_SECRET` | Gmail OAuth2 client secret                        |
| `REFRESH_TOKEN` | Gmail OAuth2 refresh token                        |
| `EMAIL_USER`    | The Gmail address sending notifications           |

> **Do NOT** set `PORT` — Render injects this automatically. The app reads `process.env.PORT` in [`server.js`](./server.js).

Click **Save Changes**. Render will redeploy automatically.

---

## 6. Verify the deployment

After the deploy goes green, open the service URL Render gives you (e.g. `https://bank-ledger-system.onrender.com`):

| Path             | Purpose                              |
| ---------------- | ------------------------------------ |
| `/`              | API info JSON                        |
| `/health`        | Health check (used by Render itself) |
| `/api-docs`      | **Swagger UI** — interactive docs    |
| `/api-docs.json` | Raw OpenAPI 3 spec                   |

Update the **second `servers` entry** in [`src/config/swagger.js`](./src/config/swagger.js) to match your actual Render URL, then commit + push.

---

## 7. Using the Swagger UI

1. Open `https://<your-service>.onrender.com/api-docs`.
2. Expand **POST `/api/auth/register`** → click **Try it out** → fill the body → **Execute**.
3. Copy the `token` from the response.
4. Click the green **Authorize** button at the top of the page.
5. Paste the token in the `bearerAuth` field → **Authorize**.
6. Every protected endpoint now sends your JWT automatically.

---

## Troubleshooting

| Symptom                                          | Fix                                                                                          |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| `MongooseServerSelectionError`                   | Check `MONGO_URI` and that Atlas allows `0.0.0.0/0` (or Render's IPs).                       |
| App boots locally but crashes on Render          | Check Render logs — usually a missing env var.                                               |
| Health check failing                             | The service must respond `200` on `/health` within 30s of starting.                          |
| Free instance sleeps after 15 min of inactivity  | This is normal on Render's free tier. First request after sleep takes ~30s.                  |
| `Error: listen EADDRINUSE`                       | You hard-coded a port. Use `process.env.PORT` (already fixed in `server.js`).                |
| MongoDB transactions throw on free Atlas tier    | Transactions require a replica set. Atlas free tier is a replica set by default — should work. |
