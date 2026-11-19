// Isolated test of the reserve / set_config / release cycle that the TS door uses.
// Mimics auth.ts (reserve + stamp) and server.ts onClose (clear + release), 12 times.
import postgres from 'postgres';

const url = process.env.DATABASE_URL || "postgres://taskflow_app:postgres@localhost:5432/taskflow";
const pool = postgres(url, { max: 10 });

async function main() {
    for (let i = 1; i <= 12; i++) {
        const t0 = Date.now();
        const conn = await pool.reserve();
        await conn.unsafe("SELECT set_config('app.current_user_id', $1, false)", [`user-${i}`]);
        const row = await conn.unsafe("SELECT current_setting('app.current_user_id') AS v");
        const v = (row[0] as any).v;
        // onClose equivalent:
        await conn.unsafe("SELECT set_config('app.current_user_id', '', false)");
        conn.release();
        console.log(`iter ${i}: stamp=${v} in ${Date.now() - t0}ms`);
    }
    await pool.end();
    console.log("DONE — all 12 iterations completed, pool ended cleanly");
}

main().catch((e) => { console.error("FAILED:", e); process.exit(1); });
