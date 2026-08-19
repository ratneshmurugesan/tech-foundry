import { initDb } from "./db";
import { startServer } from "./server";


async function main() {
    try {
        await initDb();
        await startServer(8000);
    } catch (error) {
        console.log(error);
    }
    console.log("Day 3 TypeScript track: COMPLETE");
}

await main();