# RentCheck BD — বাসা নেওয়ার আগে জানুন

A rental transparency & reputation platform MVP built on the **MERN** stack
(MongoDB, Express, React, Node.js).

> This is a working MVP foundation covering the core trust loop: auth →
> property/landlord search → rental verification → reviews & ratings →
> landlord replies → moderation → admin. It is **not** the full 69-section
> enterprise spec (AI moderation service, subscriptions/payments, maps,
> Elasticsearch, S3 file uploads, WhatsApp OTP, etc.) — those are called out
> as "Phase 2 / Phase 3" below so you know exactly what's left to build.

---

## 1. What's included

**Backend** (`/backend`) — Node.js + Express + MongoDB (Mongoose)
- JWT auth (httpOnly cookies) — register, login, logout, delete account
- Role-based access control: tenant, landlord, property_manager, moderator, admin, super_admin
- Landlord profiles (create, claim, public-safe serialization — NID/phone/email never exposed)
- Property directory (create, search with filters, text search, SEO-friendly slugs)
- Rental relationships (submit, attach evidence metadata, moderator verification)
- Reviews (property + landlord reviews, category ratings, verified-tenant badge,
  landlord right-of-reply, reporting, helpful votes)
- Basic moderation heuristics (PII/phone/threat pattern flags) — a placeholder
  for a real AI moderation service
- Reputation recalculation for both properties and landlords
- Admin/moderation dashboard endpoints (stats, review queue, verification queue,
  landlord claim approval, user suspension)
- Security basics: helmet, rate limiting, CORS with credentials, bcrypt password hashing
- Dev-only seed script (20 landlords, 50 properties, 100+ rental relationships & reviews)

**Frontend** (`/frontend`) — React 18 + Vite + Tailwind CSS + React Router
- Bilingual (Bangla/English) homepage with search
- Search page with filters (area, rent range, verified-only)
- Property detail page (ratings, category breakdown, reviews, landlord card)
- Landlord detail page (reputation breakdown, properties, claim button, reviews)
- Auth pages (login/register)
- Tenant dashboard (your reviews + status)
- Multi-step review submission flow
- Admin/moderation dashboard (review queue, rental verification queue)
- Minimal, modern design system (Airbnb/Trustpilot-inspired), light/dark-ready Tailwind config

---

## 2. Quick start

### Prerequisites
- Node.js 18+
- MongoDB (local install, Atlas, or Docker)

### 2.1 Start MongoDB (Docker option)
```bash
docker compose up -d
```
This starts MongoDB on `mongodb://127.0.0.1:27017`.

If you don't use Docker, install MongoDB locally or use a free MongoDB Atlas
cluster and put its connection string in `backend/.env`.

### 2.2 Backend
```bash
cd backend
cp .env.example .env
# edit .env if needed (MONGO_URI, JWT_SECRET, CLIENT_URL)
npm install
npm run seed     # optional: populate development sample data
npm run dev       # starts on http://localhost:5000
```

Seed script creates:
- Admin login: `admin@rentcheckbd.dev` / `Admin@12345`
- Sample tenant: `tenant1@rentcheckbd.dev` / `Tenant@12345` (through `tenant15`)

**All seed data is clearly for development only — never run `npm run seed` against production.**

### 2.3 Frontend
```bash
cd frontend
npm install
npm run dev       # starts on http://localhost:5173
```

The Vite dev server proxies `/api/*` to `http://localhost:5000`, so no extra
CORS configuration is needed in development.

Open **http://localhost:5173**.

---

## 3. Environment variables (`backend/.env`)

| Variable | Purpose |
|---|---|
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret used to sign auth tokens — change this |
| `JWT_EXPIRES_IN` | Token lifetime, e.g. `7d` |
| `COOKIE_NAME` | Name of the httpOnly auth cookie |
| `CLIENT_URL` | Frontend origin, used for CORS |
| `PORT` | API port (default 5000) |

The remaining variables (`GOOGLE_CLIENT_ID`, `S3_*`, `MAPBOX_TOKEN`,
`EMAIL_API_KEY`, etc.) are placeholders for Phase 2 integrations and are not
required for the MVP to run.

---

## 4. Core data model

```
User ──< RentalRelationship >── Property ──> Landlord
              │
              └──< Review (linked to a rentalRelationship when verified)
```

- A **Landlord** can have many **Properties**.
- A **Property** can have many **RentalRelationships** over time (different tenants).
- A **Review** always belongs to a Property + Landlord, and optionally a
  verified RentalRelationship (this is what earns the "✓ Verified Tenant
  Experience" badge).
- Reputation scores on `Landlord` and `Property` are recalculated whenever a
  review is approved or a rental relationship is verified.

---

## 5. What's deliberately NOT in this MVP (see original spec, phases 2–3)

- AI-generated review summaries and full AI moderation service (only a
  regex/heuristic placeholder exists in `reviewController.js` — swap this for
  a real moderation model or a hosted moderation API when ready)
- File uploads to S3/R2 with signed URLs for verification evidence (currently
  a `fileKey` string field is stored, but there's no upload endpoint yet)
- Google OAuth / phone OTP (email+password auth only for now)
- Subscriptions & payments (bKash/Nagad/card), featured listings billing
- Map search (Mapbox integration)
- Elasticsearch/OpenSearch (PostgreSQL-style full text search currently uses
  MongoDB's `$text` index — fine for MVP scale)
- Review disputes workflow, audit log table, notifications (email/in-app)
- Tenant reputation (future-facing, landlords rating tenants)
- Marketplace, rental market intelligence, lead generation

All of these slot cleanly into the existing structure — new Mongoose models
next to the existing ones, new controllers/routes following the same
patterns, and new pages/components on the frontend.

---

## 6. Security notes for going to production

- Rotate `JWT_SECRET` and never commit `.env`
- Put the API behind HTTPS and set `secure: true` on cookies (already
  conditional on `NODE_ENV=production`)
- Add file-upload validation and a private (non-public) bucket before
  building the verification-evidence upload endpoint
- Add stricter per-route rate limiting for review submission and login
- Review the moderation heuristics in `reviewController.js` — they are a
  starting point, not a substitute for real moderation before this handles
  real user-generated content at scale
