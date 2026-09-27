# Deploying the glance

Vercel can detect this as **Next.js** (not Other). It should, from `package.json` (`next` 16.3.6), `next.config.ts`, and the `app/` directory. Set the project Node.js version to **22**. The app uses the built-in `node:sqlite` module, which Node 20 does not provide.

This is **not** ready for a public Vercel URL yet. The home page, the conditions API, and the keeper’s desk all open `data/walpole.sqlite` on local disk (`lib/db.ts`). Vercel’s filesystem is read-only except `/tmp`, and `/tmp` is wiped between invocations. The first request will fail when it tries to create that file, and notes, approvals, and wall heights would not persist even if the file were written under `/tmp`.

Do not import this into Vercel and expect the pool page to stay up until the database is Turso (or another libSQL host).

## Environment

Set these on the Vercel project. No Admiralty, WorldTides, or Surfers Against Sewage key is used.

| Variable | Required | Purpose |
| --- | --- | --- |
| `ADMIN_PASSWORD` | Yes, once it is in production | Keeper’s desk password. If this is unset in production, the desk stays shut. Locally, with `NODE_ENV` not `production`, the fallback is `walpole-dip`. |
| `ADMIN_SESSION_SECRET` | Strongly yes | Signs the desk cookie. If unset, the cookie is signed with `ADMIN_PASSWORD`. Use a long random string. |
| `CHOP_LIGHT_KT` | No | Chop pilot, knots. Default 10. |
| `CHOP_STRONG_KT` | No | Chop pilot, knots. Default 18. Must be greater than `CHOP_LIGHT_KT`. |

## Turso follow-up

The database API in `lib/db.ts` is synchronous `node:sqlite`. Callers (`getConditions`, the desk, observation writes) assume that. Swapping it is the blocker, not a Vercel setting.

1. Create a Turso database and note `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`.
2. Replace `DatabaseSync` in `lib/db.ts` with `@libsql/client` (libSQL). The client is async, so `getDb()` and every caller have to become async. Do not point production at a file under `process.cwd()`.
3. Keep the same tables: `settings` and `observations`. Seed the wall heights and the demo notes once, on purpose, rather than on every cold start.
4. Add the two Turso variables next to `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET`.
5. Redeploy. Then check the glance, a note submission, and an approve on the desk. Those three writes are what “persists” means.
