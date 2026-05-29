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

## Email on Render — important

**Render's free tier blocks outbound SMTP** (ports 25 / 465 / 587). That means the
Nodemailer + Gmail OAuth2 path will fail with `ETIMEDOUT` on Render free — even
though OAuth2 uses an HTTP token exchange, the actual mail send still goes over
SMTP to `smtp.gmail.com:465`.

The app handles this gracefully:
- No more startup `transporter.verify()` spam in logs.
- Email sends are fire-and-forget — registration / transactions still succeed.
- Set `EMAIL_ENABLED=false` in Render env vars to skip the attempt entirely
  (cleanest logs).

### Want real emails on free tier? Switch to an HTTP-based provider

These services use HTTPS (port 443) instead of SMTP, so they work on Render free:

| Provider                              | Free quota              |
| ------------------------------------- | ----------------------- |
| [Resend](https://resend.com)          | 3,000 emails/month      |
| [SendGrid](https://sendgrid.com)      | 100 emails/day          |
| [Mailgun](https://mailgun.com)        | 100 emails/day (trial)  |
| [Brevo](https://brevo.com) (Sendinblue) | 300 emails/day        |

Minimal swap to **Resend** — `npm install resend`, then replace
[`src/services/email.service.js`](./src/services/email.service.js) with:

```js
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

async function sendRegistrationEmail(to, name) {
    await resend.emails.send({
        from: 'Bank Ledger <onboarding@resend.dev>',  // verified sender
        to,
        subject: 'Welcome to Backend Banking System',
        html: `<p>Hello ${name},</p><p>Thanks for registering.</p>`
    });
}
// ... export the same function names so callers don't change
```

Then add `RESEND_API_KEY` in Render → Environment.

Alternatively, upgrade to a Render **Starter** plan ($7/mo) which removes the SMTP
block, and Gmail-OAuth2 Nodemailer keeps working as-is.

---

## Troubleshooting

| Symptom                                                       | Fix                                                                                          |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Swagger UI shows **"Failed to fetch"** on Execute             | Make sure the `Servers` dropdown at the top of `/api-docs` shows your Render URL. The app reads `RENDER_EXTERNAL_URL` automatically — if it's empty, set `PUBLIC_URL` in env vars. |
| Logs show `Error configuring email transporter: ETIMEDOUT`    | Render free tier blocks SMTP. Set `EMAIL_ENABLED=false`, or switch to an HTTP provider (see above). |
| Register API hangs ~5–10 s before responding                  | Was caused by `await` on a blocked SMTP send. Fixed — email is now fire-and-forget.          |
| `MongooseServerSelectionError`                                | Check `MONGO_URI` and that Atlas allows `0.0.0.0/0` (or Render's IPs).                       |
| App boots locally but crashes on Render                       | Check Render logs — usually a missing env var.                                               |
| Health check failing                                          | The service must respond `200` on `/health` within 30s of starting.                          |
| Free instance sleeps after 15 min of inactivity               | Normal on Render's free tier. First request after sleep takes ~30s.                          |
| `Error: listen EADDRINUSE`                                    | You hard-coded a port. Use `process.env.PORT` (already fixed in `server.js`).                |
| MongoDB transactions throw on free Atlas tier                 | Transactions require a replica set. Atlas free tier is a replica set by default — should work. |
