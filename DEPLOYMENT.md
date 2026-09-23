# Production Deployment Guide

This guide details step-by-step instructions for deploying the **Real-Time Chat Application** to cloud hosting platforms (FastAPI backend on **Render**, React frontend on **Vercel**, managed **PostgreSQL**, and managed **Redis**).

---

## 🏗️ Production Architecture Overview

```text
                 INTERNET
                    |
          ┌─────────▼─────────┐
          │ React Frontend    │ (Vercel)
          │ https://chat.app  │
          └─────────┬─────────┘
                    |
             HTTPS / WSS
                    |
          ┌─────────▼─────────┐
          │ FastAPI Backend   │ (Render)
          │ https://api.chat  │
          └──────┬──────┬─────┘
                 │      │
          ┌──────▼─┐  ┌─▼──────┐
          │Postgres│  │ Redis  │
          │Cloud   │  │Cloud   │
          └────────┘  └────────┘
```

---

## 📋 Step 1: Push Project to GitHub

1. Initialize git repository if needed:
   ```bash
   git init
   git add .
   git commit -m "feat: complete production-ready real-time chat application"
   ```
2. Create a new repository on GitHub.
3. Link and push your code:
   ```bash
   git remote add origin https://github.com/YOUR_GITHUB_USERNAME/realtime-chat-app.git
   git branch -M main
   git push -u origin main
   ```

---

## 🗄️ Step 2: Set Up Managed PostgreSQL Database

1. Choose a managed PostgreSQL provider (e.g. Render PostgreSQL, Neon.tech, or Supabase).
2. Create a new PostgreSQL database instance.
3. Copy the database connection URL (`DATABASE_URL`). Example:
   ```text
   postgresql://user:password@ep-sample-12345.us-east-1.aws.neon.tech/chatdb?sslmode=require
   ```

---

## 🔴 Step 3: Set Up Managed Redis Instance

1. Choose a managed Redis provider (e.g. Upstash Redis, Render Redis, or Redis Cloud).
2. Create a Redis database instance.
3. Copy the Redis connection URL (`REDIS_URL`). Example:
   ```text
   rediss://default:password@sample-redis-1234.upstash.io:6379
   ```

---

## ⚙️ Step 4: Deploy FastAPI Backend on Render

1. Log in to [Render Dashboard](https://dashboard.render.com).
2. Click **New +** -> **Web Service**.
3. Connect your GitHub repository `realtime-chat-app`.
4. Set the build configuration:
   - **Root Directory**: `backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Configure Environment Variables in Render Dashboard:

   | Variable Key | Example Production Value |
   | :--- | :--- |
   | `ENVIRONMENT` | `production` |
   | `DEBUG` | `False` |
   | `PORT` | `8000` (auto-set by Render) |
   | `DATABASE_URL` | `postgresql://user:pass@ep-sample.neon.tech/chatdb?sslmode=require` |
   | `REDIS_URL` | `rediss://default:pass@redis.upstash.io:6379` |
   | `JWT_SECRET` | `LONG_SECURE_RANDOM_SECRET_KEY_MIN_32_CHARACTERS` |
   | `JWT_ALGORITHM` | `HS256` |
   | `ACCESS_TOKEN_EXPIRE_MINUTES` | `10080` |
   | `FRONTEND_URL` | `https://YOUR_FRONTEND_DOMAIN.vercel.app` |
   | `BACKEND_URL` | `https://YOUR_BACKEND_DOMAIN.onrender.com` |
   | `CORS_ORIGINS` | `https://YOUR_FRONTEND_DOMAIN.vercel.app` |

6. Deploy the web service and copy your backend domain (e.g. `https://YOUR_BACKEND_DOMAIN.onrender.com`).

---

## 🔄 Step 5: Run Database Migrations in Production

Run Alembic migrations to initialize production database tables:

Via Render Shell / CLI:
```bash
cd backend
alembic upgrade head
```

---

## 🩺 Step 6: Verify Backend Health & OpenAPI Docs

Open the following URLs in your browser:
1. Health Check Endpoint: `https://YOUR_BACKEND_DOMAIN.onrender.com/health`
   Expected response:
   ```json
   {
     "status": "ok",
     "database": "connected",
     "redis": "connected",
     "environment": "production"
   }
   ```
2. Swagger API Documentation: `https://YOUR_BACKEND_DOMAIN.onrender.com/docs`

---

## 🌐 Step 7: Deploy React Frontend on Vercel

1. Log in to [Vercel Dashboard](https://vercel.com).
2. Click **Add New...** -> **Project**.
3. Import the `realtime-chat-app` GitHub repository.
4. Set **Root Directory** to `frontend`.
5. Framework Preset: **Vite**.
6. Configure Environment Variables in Vercel Dashboard:

   | Variable Key | Example Production Value |
   | :--- | :--- |
   | `VITE_API_URL` | `https://YOUR_BACKEND_DOMAIN.onrender.com/api` |
   | `VITE_WS_URL` | `wss://YOUR_BACKEND_DOMAIN.onrender.com` |

   > **CRITICAL**: In production, `VITE_WS_URL` **MUST** use the secure WebSocket protocol (`wss://`), not `ws://` or `localhost`.

7. Click **Deploy**. Vercel will build and assign your domain (e.g. `https://YOUR_FRONTEND_DOMAIN.vercel.app`).

---

## 🔒 Step 8: Update CORS Settings

Ensure your Render backend `FRONTEND_URL` and `CORS_ORIGINS` environment variables strictly match your final deployed Vercel URL (e.g., `https://YOUR_FRONTEND_DOMAIN.vercel.app`).

---

## ✅ Final Production Verification Checklist

- [x] Backend service returns status `ok` at `/health`.
- [x] OpenAPI interactive docs load at `/docs`.
- [x] User registration creates user with hashed password in PostgreSQL.
- [x] User login returns valid JWT token.
- [x] WebSocket establishes secure `wss://` connection to `/ws/chat/{conversation_id}`.
- [x] Real-time messaging, typing indicators, and presence updates sync instantly.
- [x] File uploads save correctly and serve with validation checks.
- [x] Full-text message search query executes cleanly.
- [x] Responsive layout renders seamlessly on desktop and mobile browsers.
