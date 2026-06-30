# Spend Jot

Jot expenses in seconds. A fast, friendly, fully-responsive expense tracker — log an
expense, see your month at a glance, and browse your spending history.

- **Frontend:** Next.js 14 (App Router, TypeScript), Tailwind CSS + Radix UI, TanStack
  Query, Recharts, Framer Motion.
- **Backend:** FastAPI, SQLAlchemy 2 (async) + Alembic, JWT auth (email **or** phone +
  6-digit PIN), bcrypt-hashed PINs.
- **Database:** PostgreSQL (Supabase in production; bundled Postgres for local dev).

---

## Quick start with Docker (recommended)

The fastest way to run the whole stack with a local database:

```bash
cp .env.example .env          # adjust JWT_SECRET_KEY etc. if you like
docker compose --profile local-db up --build
```

- App:  http://localhost:3000
- API docs (Swagger):  http://localhost:8000/docs

On first boot the backend runs migrations and seeds demo data. Sign in with:

> **Email:** `demo@spendjot.app`   **PIN:** `123456`

To use **Supabase / an external Postgres** instead of the bundled one, put your async
connection string in `.env` and run without the profile:

```bash
# .env
DATABASE_URL=postgresql+asyncpg://postgres:YOUR_PASSWORD@db.YOUR_REF.supabase.co:5432/postgres
docker compose up --build
```

---

## Running locally without Docker

### Backend

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate      # Windows
# source .venv/bin/activate # macOS/Linux
pip install -r requirements.txt
cp .env.example .env        # set DATABASE_URL

alembic upgrade head        # create schema + seed categories
python -m app.seed          # add the demo user + mock expenses
uvicorn app.main:app --reload
```

The API is at http://localhost:8000 (`/docs` for Swagger).

> Tip: for a zero-setup local DB you can point `DATABASE_URL` at SQLite —
> `sqlite+aiosqlite:///./spendjot.db` — then just run `python -m app.seed` (it creates
> the tables) and start uvicorn.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local   # NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
npm run dev
```

Open http://localhost:3000.

---

## Tests

```bash
cd backend
.venv/Scripts/python -m pytest        # auth, expenses, dashboard, isolation
```

---

## Project layout

```
backend/    FastAPI service (app/, alembic/, tests/, Dockerfile)
frontend/   Next.js app (src/app, src/components, src/lib, Dockerfile)
branding/   Brand kit (logos, icons, colours) — mirrored into frontend/public/brand
docker-compose.yml
```

## Categories

Categories are seeded and live in the database (`categories` table): **Food, Utility Bill,
Shisha, Entertainment, Travel, Miscellaneous**. Add more directly in the DB (or edit
`backend/app/core/categories.py` and re-run the seed / add a migration) — each `icon`
key maps to the frontend `CategoryIcon` component.

## Notes & limitations

- Currency is **PKR** (whole rupees) throughout.
- Money model is **expense-only**; the monthly "closing balance" is shown as *total spent
  this month*.
- A 6-digit PIN is low-entropy, so login is protected by per-account lockout
  (configurable via `MAX_FAILED_LOGINS` / `LOCKOUT_MINUTES`) plus per-IP rate limiting.
- **Forgot-PIN reset is not in v1** (no email provider configured); change your PIN from
  **Settings** while signed in.
- Deployment (DigitalOcean / Render / Vercel) is intended as a later step.
