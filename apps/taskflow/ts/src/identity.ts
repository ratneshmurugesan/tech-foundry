import { AsyncLocalStorage } from "async_hooks";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

export const DOORLESS = "__doorless__";
export const requestDb = new AsyncLocalStorage<PostgresJsDatabase<any>>();