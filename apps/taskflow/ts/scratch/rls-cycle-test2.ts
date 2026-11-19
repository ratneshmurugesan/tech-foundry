// Test 2: same cycle, but ALSO runs makeRequestDb (sets conn.options + drizzle) like the real door.
// This isolates whether makeRequestDb interferes with the postgres library's release().
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';

const url = process.env.DATABASE_URL || "postgres://taskflow_app:postgres@localhost:5432/taskflow";
const client = postgres(url, { max: 10 });

function makeRequestDb(conn: any) {
    if (!conn.options) {
        const o = client.options;
        conn.options = { ...o, parsers: { ...o.parsers }, serializers: { ...o.serializers } };
    }
    return drizzle(conn);
}

async function main() {
    for (let i = 1; i <= 12; i++) {
        const t0 = Date.now();
        const conn = await client.reserve();
        await conn.unsafe("SELECT set_config('app.current_user_id', $1, false)", [`user-${i}`]);
        const db = makeRequestDb(conn); // <-- the real door does this
        const row = await conn.unsafe("SELECT current_setting('app.current_user_id') AS v");
        const v = (row[0] as any).v;
        void db; // drizzle instance created (construct ran) — the point of this test
        // onClose equivalent:
        await conn.unsafe("SELECT set_config('app.current_user_id', '', false)");
        conn.release();
        console.log(`iter ${i}: stamp=${v} OK in ${Date.now() - t0}ms`);
    }
    await client.end();
    console.log("DONE — all 12 iterations completed with makeRequestDb, pool ended cleanly");
}

main().catch((e) => { console.error("FAILED:", e); process.exit(1); });
