# Hosting RentCheck BD for free (with a live backend)

Three free pieces: **database** (MongoDB Atlas), **backend** (Render or Railway or
Fly.io), **frontend** (Vercel or Netlify or Cloudflare Pages). All have a
no-credit-card free tier that is enough to demo and launch small.

Recommended combo: **Atlas M0 + Render Web Service + Vercel**.

---

## 1. Database — MongoDB Atlas (free M0)

1. Create an account at mongodb.com/cloud/atlas → **Build a Database → M0 (Free)**.
2. Region: pick the closest (e.g. Mumbai / Singapore for Bangladesh).
3. **Database Access** → add a user (username + password, "Read and write to any
   database").
4. **Network Access** → add IP `0.0.0.0/0` (allow from anywhere) for now. Tighten
   later to your backend host's egress IPs.
5. **Connect → Drivers** → copy the connection string. It looks like
   `mongodb+srv://USER:PASS@cluster0.xxxxx.mongodb.net/rentcheck_bd?retryWrites=true&w=majority`
   — keep the `/rentcheck_bd` database name.

M0 gives 512 MB storage — plenty for reports, listings and the translation cache.

---

## 2. Backend — Render (free Web Service)

1. Push this repo to GitHub (already done).
2. render.com → **New → Web Service** → connect the repo.
3. Settings:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Instance Type:** Free
4. **Environment** → add:
   | key | value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `MONGO_URI` | your Atlas string from step 1 |
   | `JWT_SECRET` | a long random string (e.g. `openssl rand -hex 32`) |
   | `JWT_EXPIRES_IN` | `7d` |
   | `COOKIE_NAME` | `rc_token` |
   | `CLIENT_URL` | your frontend URL from step 3 (fill after deploying it) |
   | `TRANSLATE_EMAIL` | *(optional)* your email — raises the free translation quota |
5. Deploy. Your API is now at `https://rentcheck-bd-api.onrender.com` (or similar).
   Check `https://<that>/api/health` → `{ "success": true }`.
6. Seed the admin + demo data **once** from your machine (or Render Shell):
   ```bash
   cd backend
   MONGO_URI="<atlas string>" SUPERADMIN_EMAIL=you@example.com SUPERADMIN_PASSWORD='StrongPass1!' npm run seed:admin
   MONGO_URI="<atlas string>" npm run seed:demo
   ```

> Render's free web service **sleeps after ~15 min idle** and takes ~30–50 s to
> wake on the next request. Fine for a demo. Alternatives with no sleep on the
> free tier: **Railway** (free monthly credit) or **Fly.io** (small always-on VM).
> Same env vars, same start command.

### Cookies across domains
The app authenticates with an httpOnly cookie. If the frontend and backend are on
**different domains** (they will be), the browser needs `SameSite=None; Secure` and
the frontend must send credentials. This repo already sends credentials
(`withCredentials`) and sets `secure` cookies when `NODE_ENV=production`. Two
options:

- **Easiest:** put the API behind the **same domain** as the frontend using a
  proxy/rewrite (Vercel `rewrites`, see step 3) so the browser sees one origin.
  Then nothing else is needed. **Recommended.**
- Or set `sameSite: "none"` in `backend/utils/generateToken.js` +
  `backend/controllers/reportController.js` (the `rc_anon` cookie) and add your
  exact frontend origin to `CLIENT_URL` for CORS.

---

## 3. Frontend — Vercel (free)

1. vercel.com → **Add New → Project** → import the repo.
2. Settings:
   - **Root Directory:** `frontend`
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Add a **rewrite** so `/api/*` hits your backend on the same origin (avoids all
   cross-domain cookie pain). Create `frontend/vercel.json`:
   ```json
   {
     "rewrites": [
       { "source": "/api/:path*", "destination": "https://YOUR-RENDER-URL.onrender.com/api/:path*" }
     ]
   }
   ```
4. Deploy. You get `https://rentcheck-bd.vercel.app`.
5. Go back to Render → set `CLIENT_URL` to that URL → redeploy backend.

The Vite dev proxy already points `/api` at the backend locally, and axios uses a
relative `/api` base — so with the rewrite above, **no frontend code changes are
needed**.

(Netlify: same, with a `netlify.toml` `[[redirects]]` rule `from = "/api/*"` `to =
"https://YOUR-RENDER-URL/api/:splat"` `status = 200`. Cloudflare Pages: use a
`_redirects` file or a Functions proxy.)

---

## 4. After it's live

- Log in at `/login` with the super-admin you seeded → you land on `/admin`.
- Manage everything from the dashboard: reports, **Properties** (verify/delete
  anonymous listings), users, site content, audit log.
- Delete the demo data (`demo.tenant@…`, `demo.landlord@…` and their rows) from
  the dashboards whenever you want; re-add with `npm run seed:demo`.

## 5. When you outgrow free

- Render/Railway paid tier (no sleep) or a $5 VPS + PM2 + nginx.
- Atlas M10 for backups + point-in-time restore.
- Add Redis (`REDIS_URL`) and move the response cache + rate-limit store to it so
  you can run more than one backend instance behind a load balancer — see
  `docs/deployment.md`.
- Object storage (S3 / Cloudflare R2) for real photo uploads (listings currently
  take image URLs).
