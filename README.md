# Stillworth

Personal finance app. Native Next.js App Router, React, TypeScript, Neon Postgres, and Vercel.

## Access

The owner has explicitly chosen **public link access** until app sign-in is added. Anyone who can reach the URL can view and edit the shared ledger. There are no separate user accounts yet. The source repository is public. Database credentials and financial backups are excluded from Git.

Set `LEDGER_ACCESS_MODE=public-link` for the current deployment. To restore a hosting login, enable Vercel Authentication for All Deployments and use `vercel-protected`. Local development can use `local`. Production refuses to run outside the configured Vercel environment. Keep the same-origin checks and optimistic concurrency protections in either mode.

## Development

Use Node 22 or newer. Run `npm ci`, copy `.env.example` to `.env.local`, add the Neon connection string, and set local access mode. Then run `npm run db:migrate` and `npm run dev`.

Import your existing JSON backup with `npm run db:import -- /absolute/path/to/backup.json`. Import only inserts an absent ledger; a retry verifies exact content and will not overwrite existing data. Financial records and credentials are not stored in Git.

## Behaviour

An audit is a verified snapshot. Later entries build on the latest active audit. Edit audit names, dates and balances from the audit detail; dates stay between neighbouring audits. Removing an audit keeps all transactions. Removing the latest snapshot rebuilds the estimate from the preceding snapshot. One audit is always kept as a baseline. Save, edit and deletion have undo.

Exchange rates can be entered in either direction. For example, enter `1 SAR = 75 PKR`; internally this is stored as `1 PKR = 1/75 SAR`. Both views use the same rate. New audits retain their conversion rates; correcting a historical audit preserves its recorded total and applies balance differences at the stored rate (or original sheet rates for imports).

The ledger is stored as a versioned JSONB document in Postgres. Writes use optimistic concurrency, so a stale device gets a conflict instead of overwriting a newer save. JSON backups and CSV exports are available in Preferences.

## Checks

`npm test`, `npm run typecheck`, and `npm run build`.

## Deployment

Connect this GitHub repository to the Vercel project. Connect the Neon **free** integration to production, add `LEDGER_ACCESS_MODE`, apply the schema, import the current backup, and deploy. Current production uses `public-link` with Vercel Authentication disabled, as requested by the owner. Add application sign-in before supporting separate users. Do not point preview deployments at production data when collaborating with others.

## Canonical checkout and Git deployment

The canonical local checkout is `/Users/urwahsajjad/Projects/stillworth`. Source is in `https://github.com/usajjad123/stillworth`. Pushes to `main` deploy through the connected personal Vercel project `stillworth` in `usajjad123s-projects`. Manual deployments must explicitly use `--scope usajjad123s-projects`; never use Skoop for this app.
