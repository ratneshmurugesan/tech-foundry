import { startServer } from "./server";


async function main() {
    try {
        await startServer(8000);
    } catch (error) {
        console.log(error);
    }
    console.log("Day 2 TypeScript track: COMPLETE");
}

await main();