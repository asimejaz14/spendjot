# Deploying Spend Jot (Vercel + Render + Supabase)

The **frontend (Next.js) runs on Vercel** and the **backend (FastAPI) runs on
Render**, backed by your **Supabase** Postgres database.

```
Browser ──HTTPS──> spendjot.vercel.app (Next.js) ──/api/* proxy──> spendjot-api.onrender.com (FastAPI) ──> Supabase Postgres
```

The Next.js app reverse-proxies `/api/*` to the backend, so the browser only ever
talks to one origin: **no CORS, and the auth refresh cookie stays first-party.**

**Frontend on Vercel:** import the repo, set **Root Directory = `frontend`**, leave
`NEXT_PUBLIC_API_BASE_URL` unset (the proxy handles the API). The proxy target
defaults to `https://spendjot-api.onrender.com` (baked in `next.config.mjs`);
override with a `BACKEND_INTERNAL_URL` env var in Vercel if the API URL changes.

---

## 0. Before you start (security)

- The database password you have should be **rotated** in Supabase
  (Settings → Database → *Reset database password*) since it was shared in plain text.
- Never commit secrets. `DATABASE_URL` and `JWT_SECRET_KEY` live only in Render's
  encrypted environment variables (this repo's `render.yaml` marks them `sync: false`).

---

## 1. Get the right Supabase connection string

Render's outbound traffic is IPv4, but Supabase's **direct** connection
(`db.<ref>.supabase.co`) is IPv6-only — it will **not** connect from Render.
Use the **Session pooler** (IPv4) instead:

1. Supabase → your project → **Connect** (top bar).
2. Choose **Session pooler** → copy the URI. It looks like:
   ```
   postgresql://postgres.<ref>:[YOUR-PASSWORD]@aws-0-<region>.pooler.supabase.com:5432/postgres
   ```
3. Convert it for our async driver and URL-encode the password:
   - prefix `postgresql://` → `postgresql+asyncpg://`
   - replace the password with its URL-encoded form
     (e.g. `#`→`%23`, `$`→`%24`, `@`→`%40`, `,`→`%2C`).

   Final value (this is your `DATABASE_URL`):
   ```
   postgresql+asyncpg://postgres.<ref>:<ENCODED-PW>@aws-0-<region>.pooler.supabase.com:5432/postgres
   ```

> The backend already disables prepared-statement caching so it works with the
> pooler — no other change needed.

---

## 2. Push the code to GitHub

From the project root:

```bash
git init
git add .
git commit -m "Spend Jot: initial deployable version"
git branch -M main
git remote add origin https://github.com/asimejaz14/spendjot.git
git push -u origin main
```

`.env`, `node_modules`, build artifacts, and local DBs are already git-ignored.

---

## 3. Create the Render Blueprint

1. Render dashboard → **New +** → **Blueprint**.
2. Connect the GitHub repo `asimejaz14/spendjot`. Render reads `render.yaml`
   and shows two services: `spendjot-api` and `spendjot-web`.
3. When prompted for the **`DATABASE_URL`** of `spendjot-api`, paste the
   `postgresql+asyncpg://…pooler…` value from step 1.
   (`JWT_SECRET_KEY` is auto-generated.)
4. Also set **`SMTP_PASSWORD`** on `spendjot-api` to the `noreply@spendjot.com`
   mailbox password (enables the welcome email on signup; leave blank to disable).
5. **Apply** — Render builds both Docker images and deploys.

### Welcome email

New signups receive a branded welcome email from `noreply@spendjot.com` via SMTP
over implicit TLS (`server188.web-hosting.com:465`). All settings except the
password are pre-filled in `render.yaml`; the send is best-effort and runs in the
background, so a mail outage never blocks signup. If `SMTP_PASSWORD` is blank,
emails are simply skipped.

On first boot the backend automatically runs `alembic upgrade head` (creating the
tables and seeding the 6 categories).

---

## 4. Verify

- API health: `https://spendjot-api.onrender.com/health` → `{"status":"ok"}`
- API docs:   `https://spendjot-api.onrender.com/docs`
- App:        `https://spendjot-web.onrender.com` → sign up and add an expense.

---

## Notes & gotchas

- **Free plan cold starts:** both services sleep after ~15 min idle and take
  ~30–60s to wake on the next request. Upgrade the plan to keep them warm.
- **Supabase free tier** pauses a project after ~1 week of inactivity; just resume
  it from the dashboard.
- **Service names matter:** `render.yaml` wires the frontend proxy to
  `https://spendjot-api.onrender.com`. If you rename the API service, update
  `BACKEND_INTERNAL_URL` (and `CORS_ORIGINS`) to match.
- **Seeding demo data:** set `SEED_DEMO_DATA=true` on `spendjot-api` if you want
  the demo user + sample expenses created on boot.
- **Custom domain:** add it on `spendjot-web` in Render, then update
  `CORS_ORIGINS` on the API.
