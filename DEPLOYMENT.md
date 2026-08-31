# SupportPilot Deployment Guide

SupportPilot is designed for containerized cloud deployment (e.g. AWS ECS, GCP Cloud Run, DigitalOcean App Platform) and static frontend hosting (e.g. Vercel, Netlify).

---

## 1. Production Environment Variables

Ensure the following variables are configured in your container hosting platform:

```text
# Backend Environment
PORT=5000
DATABASE_URL="postgresql://<USER>:<PASSWORD>@<HOST>:5432/<DB>?sslmode=require"
MONGO_URI="mongodb+srv://<USER>:<PASSWORD>@<CLUSTER>/supportpilot?retryWrites=true&w=majority"
REDIS_URL="rediss://:<PASSWORD>@<HOST>:<PORT>"
JWT_SECRET="<SECURE_RANDOM_STRING>"
NODE_ENV=production

# API Keys
GEMINI_API_KEY="<GEMINI_KEY>"
STRIPE_SECRET_KEY="<STRIPE_SECRET>"
STRIPE_WEBHOOK_SECRET="<STRIPE_WEBHOOK_SECRET>"

# Frontend Environment
NEXT_PUBLIC_API_URL="https://api.yourdomain.com/api/v1"
NEXT_PUBLIC_SOCKET_URL="https://api.yourdomain.com"
```

---

## 2. Relational Database Migrations

Prisma requires applying migrations to production PostgreSQL databases before starting backend instances. Apply schema changes using:

```bash
npx prisma migrate deploy
```

Add this command to your backend build pipeline or Docker start entrypoint:
`npx prisma migrate deploy && node dist/server.js`

---

## 3. Production Container Builds (Docker Compose)

To spin up a complete sandbox production bundle locally:
```bash
docker compose -f docker-compose.yml up --build -d
```

### Health Check Endpoints
Cloud load-balancers should poll the following endpoint to monitor backend container health:
`GET https://api.yourdomain.com/health`

---

## 4. Frontend Deployment (Vercel)

The Next.js frontend can be deployed directly to Vercel:
1. Link your GitHub repository.
2. Select **Next.js** framework preset.
3. Configure environment parameters:
   - `NEXT_PUBLIC_API_URL`
   - `NEXT_PUBLIC_SOCKET_URL`
4. Click **Deploy**. Vercel will handle automatic bundle optimization and serverless static asset distributions.
