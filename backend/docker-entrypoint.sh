#!/usr/bin/env bash
set -e

echo "→ Waiting for database…"
python - <<'PY'
import asyncio, os, sys
from sqlalchemy.ext.asyncio import create_async_engine

url = os.environ.get("DATABASE_URL", "")

async def wait():
    for attempt in range(30):
        try:
            engine = create_async_engine(url)
            async with engine.connect():
                pass
            await engine.dispose()
            print("→ Database is ready.")
            return
        except Exception as exc:  # noqa: BLE001
            print(f"  …not ready yet ({attempt+1}/30): {exc}")
            await asyncio.sleep(2)
    print("Database never became ready.", file=sys.stderr)
    sys.exit(1)

asyncio.run(wait())
PY

echo "→ Running migrations…"
alembic upgrade head

if [ "${SEED_DEMO_DATA:-false}" = "true" ]; then
  echo "→ Seeding demo data…"
  python -m app.seed || echo "  (seed skipped or already applied)"
else
  echo "→ Skipping demo data seed (SEED_DEMO_DATA != true). Categories come from migrations."
fi

# Render (and most PaaS) inject the port to bind via $PORT; default to 8000 locally.
echo "→ Starting API on port ${PORT:-8000}…"
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
