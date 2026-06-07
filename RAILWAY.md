# Deploying to Railway

This app has two services (API + Frontend) and a PostgreSQL database.
Follow these steps in order.

---

## Step 1 — Push code to GitHub

1. Create a new repo at github.com
2. Push this project to it:
```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

---

## Step 2 — Create a Railway project

1. Go to [railway.app](https://railway.app) and sign up / log in
2. Click **New Project**
3. Choose **Empty Project**

---

## Step 3 — Add PostgreSQL database

1. In your Railway project, click **+ New** → **Database** → **Add PostgreSQL**
2. Wait ~30 seconds for it to provision
3. Click the PostgreSQL service → **Variables** tab
4. Copy the value of `DATABASE_URL` — you will need it in the next steps

---

## Step 4 — Deploy the API Server

1. Click **+ New** → **GitHub Repo** → select your repo
2. Railway will auto-detect settings — **do not deploy yet**
3. Go to **Settings** tab of this new service:
   - Name: `api-server`
   - Root Directory: `.` (leave as repo root)
   - Config File Path: `railway.toml`
4. Go to **Variables** tab and add all of these:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Paste from Step 3 |
| `SESSION_SECRET` | Any random string (e.g. `openssl rand -hex 32`) |
| `CLERK_SECRET_KEY` | From [clerk.com](https://dashboard.clerk.com) → API Keys |
| `CLERK_PUBLISHABLE_KEY` | From Clerk dashboard → API Keys |
| `OPENAI_API_KEY` | From [platform.openai.com](https://platform.openai.com) → API Keys |
| `PORT` | `8080` |

5. Click **Deploy** — wait for the build to finish (3–5 min)
6. Copy the generated domain for this service (e.g. `api-server-production-xxxx.up.railway.app`)

---

## Step 5 — Run database migrations

After the API deploys successfully:

1. Click the API service → **Settings** → scroll to **Deploy** section
2. Under **Pre-deploy Command**, enter:
```
pnpm --filter @workspace/db run push
```
3. Redeploy — this runs the migration once before starting the server

---

## Step 6 — Deploy the Frontend

1. In Railway project, click **+ New** → **GitHub Repo** → same repo again
2. Go to **Settings** tab:
   - Name: `frontend`
   - Root Directory: `.` (repo root)
   - Config File Path: `railway.frontend.toml`
3. Go to **Variables** tab and add:

| Variable | Value |
|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | From Clerk dashboard → API Keys |
| `VITE_API_BASE_URL` | Your API domain from Step 4 (e.g. `https://api-server-xxxx.up.railway.app`) |

4. Click **Deploy** — wait for build (~2 min)
5. Copy the generated frontend domain (e.g. `frontend-production-xxxx.up.railway.app`)

---

## Step 7 — Connect frontend → API (CORS)

1. Go back to the **API Server** service → **Variables**
2. Add: `FRONTEND_URL` = your frontend domain from Step 6
3. Redeploy the API server

---

## Step 8 — Configure Clerk for your live domain

1. Go to [dashboard.clerk.com](https://dashboard.clerk.com) → your app
2. Click **Domains** → **Add domain**
3. Add your frontend Railway domain (e.g. `frontend-production-xxxx.up.railway.app`)
4. This is required — without it, sign-in will be blocked on the live URL

---

## Done!

Your app is live. Visit your frontend Railway domain to see it running.

- Frontend: `https://frontend-production-xxxx.up.railway.app`
- API health check: `https://api-server-xxxx.up.railway.app/api/healthz`

---

## Custom domain (optional)

1. In Railway → your frontend service → **Settings** → **Networking** → **Custom Domain**
2. Add your domain and follow the DNS instructions
3. Also add the custom domain to Clerk (Step 8)
