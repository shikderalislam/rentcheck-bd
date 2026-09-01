# RentCheck BD — Deployment & Scaling

MERN app: **backend** (Node/Express, `/backend`) + **frontend** (React/Vite, `/frontend`) + **MongoDB**.

## 1. Environment (`backend/.env`)

| var | notes |
|---|---|
| `NODE_ENV` | `production` in prod — enables secure cookies, disables dev verify tokens |
| `PORT` | app port (e.g. 5000) |
| `MONGO_URI` | MongoDB connection string (Atlas recommended) |
| `JWT_SECRET` | long random string — **rotate before launch** |
| `JWT_EXPIRES_IN` | e.g. `7d` |
| `COOKIE_NAME` | auth cookie name (default `rc_token`) |
| `CLIENT_URL` | public site origin, used for CORS + email verification links |
| `REDIS_URL` | *(future)* shared cache/session store for multi-instance |

Never commit `.env` (already git-ignored). Frontend is static — build with `VITE_*` vars if any.

## 2. Build

```bash
# frontend -> static bundle in frontend/dist
cd frontend && npm ci && npm run build

# backend runs as-is
cd backend && npm ci
```

Serve `frontend/dist` from the CDN / a static host; proxy `/api/*` to the backend.

## 3. Topology

```
            ┌─────────── Cloudflare / CDN ───────────┐
Internet ──▶│  static: frontend/dist                 │
            │  cache: images, JS/CSS, HTML           │
            └───────────────┬───────────────────────┘
                            │  /api/*
                     ┌──────▼──────┐   Load balancer (nginx / ALB / Render)
                     │   LB / TLS  │   - TLS termination
                     └──┬───────┬──┘   - health check: GET /api/health
              ┌─────────▼─┐  ┌──▼────────┐
              │ app node 1│  │ app node 2│   (Node process behind PM2 / Docker;
              └─────┬─────┘  └────┬──────┘    stateless — scale horizontally)
                    └──────┬──────┘
              ┌────────────▼────────────┐   ┌──────────────┐
              │ MongoDB (Atlas replset) │   │ Redis (later)│
              └─────────────────────────┘   └──────────────┘
```

A single app instance is fine to start. The backend keeps **no local state** (JWT is
stateless, uploads would go to object storage), so adding instances behind the LB
needs no code change **except the cache** (next section).

## 4. Caching

- **CDN** does the heavy lifting for static assets + images.
- **App-level response cache**: `backend/middleware/cache.js` memoizes a few hot
  public GETs (`/public/stats`, `/public/reports/stats`, `/public/reports/by-area`,
  `/public/site-settings`) for 15–60s. This is an in-process `Map` — **per instance**.
- **Multi-instance**: swap that `Map` for Redis (`REDIS_URL`) so the cache and the
  rate-limit counters are shared. `express-rate-limit` already supports a Redis store;
  `cachePublic()` just needs its get/set pointed at Redis. `bustCache()` is exported
  for explicit invalidation after writes.

## 5. Server process

- `npm start` runs `node server.js`. In prod use **PM2** (`pm2 start server.js -i max`)
  or a container:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY backend .
EXPOSE 5000
CMD ["node", "server.js"]
```

- Health check endpoint: `GET /api/health` → `{ success: true }`.
- Security already in place: `helmet`, CORS with credentials, `express-rate-limit`
  (global + per-route on auth/report/confirm), bcrypt(12) password hashing,
  httpOnly + `sameSite=lax` + `secure`(prod) cookies, JWT, server-side RBAC
  (`requireRole` / `requireRoleGroup`) on every protected route, Mongoose schema
  validation, ObjectId guards, and an append-only `AuditLog`.

## 6. Database

- **MongoDB Atlas** (M10+ for prod): enable automated backups + point-in-time
  restore, restrict network access to the app's egress IPs, use a scoped DB user.
- Indexes are declared in the models (`Report`, `Property`, `ReviewReport`,
  `AuditLog`, …). Run once against a fresh cluster; Mongoose builds them on boot.
- Seeds: `npm run seed:admin` (super admin), `npm run seed:demo` (sample Mirpur
  data — safe to delete from the dashboard), `npm run seed` (larger dev dataset —
  **never** against prod).

## 7. Email verification

`register` issues a token; `POST /api/auth/verify-email` consumes it. With no mail
provider the link is logged and (dev only) returned to the client for the one-click
button. **For prod:** plug a provider (Resend/SES/Postmark) into `issueVerification()`
in `backend/controllers/authController.js` and stop returning `devToken`. Landlords
must have `isEmailVerified` before `POST /api/landlord/properties` succeeds.

## 8. Observability (recommended next)

Error tracking (Sentry), request logging (already `morgan`), uptime check on
`/api/health`, MongoDB Atlas metrics, and LB access logs.
