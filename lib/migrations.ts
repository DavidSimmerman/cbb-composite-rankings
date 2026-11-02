// Database migrations, applied automatically when the server starts (instrumentation.ts), so every
// deploy brings the schema up to date before cron jobs or pages use it.
//
// Migrations are the .sql files in scripts/migrations, applied in filename order, each once. Applied
// names are recorded in schema_migrations. A Postgres advisory lock keeps two starting servers from
// running them at the same time. Each file runs in its own transaction; a failure is logged and stops
// the remaining files, but never takes the server down.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';

const DIR = join(process.cwd(), 'scripts', 'migrations');
const LOCK_ID = 727_001; // any fixed number unique to this app's advisory locks

export async function runMigrations(): Promise<void> {
	if (!process.env.DATABASE_URL) return;
	let files: string[];
	try {
		files = readdirSync(DIR).filter(f => f.endsWith('.sql')).sort();
	} catch {
		return; // no migrations folder in this build
	}
	if (!files.length) return;

	const client = new Client({ connectionString: process.env.DATABASE_URL });
	try {
		await client.connect();
		await client.query('SELECT pg_advisory_lock($1)', [LOCK_ID]);
		await client.query(
			'CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz DEFAULT now())'
		);
		const done = new Set((await client.query<{ name: string }>('SELECT name FROM schema_migrations')).rows.map(r => r.name));
		for (const file of files) {
			if (done.has(file)) continue;
			try {
				await client.query('BEGIN');
				await client.query(readFileSync(join(DIR, file), 'utf8'));
				await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
				await client.query('COMMIT');
				console.log(`[migrations] applied ${file}`);
			} catch (e) {
				await client.query('ROLLBACK').catch(() => {});
				console.error(`[migrations] ${file} failed; later migrations skipped:`, e);
				break;
			}
		}
	} catch (e) {
		console.error('[migrations] could not run:', e);
	} finally {
		await client.query('SELECT pg_advisory_unlock($1)', [LOCK_ID]).catch(() => {});
		await client.end().catch(() => {});
	}
}
