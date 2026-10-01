# Deploying the glance

Vercel can detect this as **Next.js** (not Other). It should, from `package.json` (`next` 16.3.6), `next.config.ts`, and the `app/` directory. Set the project Node.js version to **22**. The app uses the built-in `node:sqlite` module, which Node 20 does not provide.

The public glance loads without Turso. `lib/db.ts` no longer creates `data/walpole.sqlite` inside the deployed app. Vercel’s filesystem is read-only except `/tmp`, and a write under the app root is what produced “This page couldn't load”.

| Where it runs | SQLite file | Feed cache |
| --- | --- | --- |
| Your machine, `DATA_DIR` unset | `data/walpole.sqlite` | `data/cache/` |
| Vercel, `DATA_DIR` unset | `/tmp/walpole.sqlite` | `/tmp/walpole-cache/` |
| `DATA_DIR` set and writable, and not inside the Vercel app | `$DATA_DIR/walpole.sqlite` | `$DATA_DIR/cache/` |
| That directory cannot be created, including on Vercel | `/tmp/walpole.sqlite`, or an in-memory database if `/tmp` refuses the file | `/tmp/walpole-cache/`, or process memory |

`/tmp` is wiped when the instance goes away. That is enough for the public sheet: wall heights fall back to the seeded working estimate (3.50 m and 3.35 m above Chart Datum), and a failed tide or weather fetch is reported on the page instead of taking it down. Approved notes, desk edits, and observation writes do **not** survive a new instance. Demo notes are seeded only for a durable file outside the OS temp directory, so a cold start does not put the local sample plates back on the public page.

The keeper’s desk and `/observe` still open against that ephemeral file. Treat them as temporary until a durable database is connected.

## Environment

Set these on the Vercel project. No Admiralty, WorldTides, or Surfers Against Sewage key is used. Leave `DATA_DIR` unset on Vercel.

| Variable | Required | Purpose |
| --- | --- | --- |
| `ADMIN_PASSWORD` | Yes, once the desk is in production | Keeper’s desk password. If this is unset in production, the desk stays shut. Locally, with `NODE_ENV` not `production`, the fallback is `walpole-dip`. |
| `ADMIN_SESSION_SECRET` | Strongly yes | Signs the desk cookie. If unset, the cookie is signed with `ADMIN_PASSWORD`. Use a long random string. |
| `CHOP_LIGHT_KT` | No | Chop pilot, knots. Default 10. |
| `CHOP_STRONG_KT` | No | Chop pilot, knots. Default 18. Must be greater than `CHOP_LIGHT_KT`. |
| `DATA_DIR` | No | Writable directory for the SQLite file and feed cache. Unset locally means `data/` next to the app. Unset on Vercel means `/tmp`. If the value is not a writable directory, or it sits inside the deployed app, it is skipped. |
| `TURSO_DATABASE_URL` | No | Reserved for a later durable store. This version does not read it. The glance still uses the file or memory database above. |
| `TURSO_AUTH_TOKEN` | No | Reserved, paired with `TURSO_DATABASE_URL`. This version does not read it. |

## Turso follow-up

Notes, approvals, and edited wall heights need a host that outlives the function. The database API in `lib/db.ts` is still synchronous `node:sqlite`. Callers assume that. Swapping it is the persistence work, not a requirement for the public page.

1. Create a Turso database and note `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`.
2. Replace `DatabaseSync` in `lib/db.ts` with `@libsql/client` when those two variables are set, and keep the file or `/tmp` path when they are not. The client is async, so `getDb()` and every caller have to become async.
3. Keep the same tables: `settings` and `observations`. Seed the wall heights and the demo notes once, on purpose, rather than on every cold start.
4. Redeploy. Then check the glance, a note submission, and an approve on the desk. Those three writes are what “persists” means.

## After a deploy

Open `/`. You should get the section clip and today’s sheet, or “No reading” / “tide quiet” if Margate did not answer. A server error page means a write is still aimed at the app directory.
