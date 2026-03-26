# Railway Deployment Guide

This project deploys as **4 Railway services** inside one project:
- **Postgres** (plugin)
- **Redis** (plugin)
- **Backend** (NestJS — port 3001)
- **Frontend** (Next.js — port 3000)

---

## Step 1 — Push your code to GitHub

Make sure your latest code is pushed to GitHub (Railway deploys from a repo).

---

## Step 2 — Create a Railway project

1. Go to [railway.app](https://railway.app) → **New Project**
2. Choose **Deploy from GitHub repo** → select your repo

---

## Step 3 — Add Postgres plugin

1. In your Railway project, click **+ New** → **Database** → **Add PostgreSQL**
2. Railway creates a Postgres instance and auto-sets `DATABASE_URL` in every service

---

## Step 4 — Add Redis plugin

1. Click **+ New** → **Database** → **Add Redis**
2. Railway auto-sets `REDIS_URL` in every service

---

## Step 5 — Configure the Backend service

Railway will have created a service from your repo automatically. Configure it:

### Source settings
| Setting | Value |
|---|---|
| **Root Directory** | `/` (leave blank) |
| **Build Command** | *(leave blank — Dockerfile handles it)* |
| **Dockerfile Path** | `apps/backend/Dockerfile` |

### Variables
Go to the service's **Variables** tab and add:

```
NODE_ENV=production
PORT=3001
CORS_ORIGINS=https://<your-frontend-domain>.up.railway.app
JWT_SECRET=<generate a random 64-char string>
JWT_EXPIRY=7d
REFRESH_TOKEN_SECRET=<another random string>
REFRESH_TOKEN_EXPIRY=30d
DB_SYNC=true
RUN_SEED=true
```

> **`DATABASE_URL` and `REDIS_URL`** are injected automatically by Railway — do not set them manually.

### Networking
1. Go to **Settings → Networking**
2. Click **Generate Domain** to get a public URL (e.g. `workforce-backend.up.railway.app`)
3. Copy this URL — you'll need it for the frontend's `NEXT_PUBLIC_API_URL`

---

## Step 6 — Configure the Frontend service

1. In your Railway project, click **+ New** → **GitHub Repo** (same repo)

### Source settings
| Setting | Value |
|---|---|
| **Root Directory** | `/` (leave blank) |
| **Dockerfile Path** | `apps/frontend/Dockerfile` |

### Variables
```
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_API_URL=https://<your-backend-domain>.up.railway.app/api/v1
```

> ⚠️ `NEXT_PUBLIC_API_URL` is baked into the Next.js build at build time.
> If you change the backend URL later, you must **redeploy** the frontend.

### Networking
Click **Generate Domain** to get your frontend public URL.

---

## Step 7 — First deploy checklist

1. Deploy the **backend** first (it needs to seed the database)
2. Check backend logs — you should see `🚀 Backend running at: http://localhost:3001/api`
3. Check for seed output: `✅ Roles seeded`, `✅ Demo users seeded`, etc.
4. Deploy the **frontend**
5. Open the frontend URL → log in with a demo account

### Demo accounts (seeded automatically)
| Email | Password | Role |
|---|---|---|
| svp@workforce.com | Password123! | SVP |
| cno@workforce.com | Password123! | CNO |
| director@workforce.com | Password123! | Director |
| manager@workforce.com | Password123! | Manager |
| nurse@workforce.com | Password123! | Nurse |

---

## Step 8 — After first deploy

Once the seed has run successfully, update the backend variables:

```
RUN_SEED=false   ← prevents re-seeding on every restart
DB_SYNC=false    ← prevents accidental schema changes
```

> You can re-run the seed anytime by temporarily setting `RUN_SEED=true` and redeploying.

---

## Environment variable reference

### Backend
| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Auto | Set by Railway Postgres plugin |
| `REDIS_URL` | Auto | Set by Railway Redis plugin |
| `NODE_ENV` | Yes | Set to `production` |
| `PORT` | Yes | `3001` |
| `JWT_SECRET` | Yes | Random string, min 32 chars |
| `JWT_EXPIRY` | Yes | e.g. `7d` |
| `REFRESH_TOKEN_SECRET` | Yes | Random string |
| `REFRESH_TOKEN_EXPIRY` | Yes | e.g. `30d` |
| `CORS_ORIGINS` | Yes | Comma-separated list of allowed frontend origins |
| `DB_SYNC` | First deploy | `true` to auto-create tables; set `false` after |
| `RUN_SEED` | First deploy | `true` to seed demo data; set `false` after |

### Frontend
| Variable | Required | Description |
|---|---|---|
| `NODE_ENV` | Yes | `production` |
| `PORT` | Yes | `3000` |
| `NEXT_PUBLIC_API_URL` | Yes | Backend public URL + `/api/v1` |

---

## Troubleshooting

**Backend crashes on start**
- Check `DATABASE_URL` is set (Postgres plugin attached?)
- Check `REDIS_URL` is set (Redis plugin attached?)
- Check logs for TypeORM connection errors

**Frontend shows "Network Error" / API calls fail**
- Confirm `NEXT_PUBLIC_API_URL` points to your backend's Railway domain
- Confirm the backend domain has been generated (Settings → Networking)
- CORS: make sure the frontend domain is in the backend's `CORS_ORIGINS`

**Seed fails**
- It's usually safe to ignore — the seed is idempotent and skips existing data
- Check logs for specific error messages
- You can re-run by setting `RUN_SEED=true` and redeploying

**"relation does not exist" errors**
- Set `DB_SYNC=true` temporarily and redeploy the backend to recreate tables
