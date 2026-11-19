import { index, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core'
import postgres, { Sql } from 'postgres'
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { requestDb } from './identity';

export const workspaces = pgTable("workspaces", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    plan_tier: text("plan_tier").notNull().default("free"),
    created_at: timestamp("created_at", { mode: "date" }).defaultNow()
})

export const projects = pgTable("projects", {
    id: text("id").primaryKey(),
    workspace_id: text("workspace_id").references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text("name").notNull(),
    created_at: timestamp("created_at", { mode: "date" }).defaultNow()
})

export const issues = pgTable("issues", {
    id: text("id").primaryKey(),
    project_id: text("project_id").references(() => projects.id, { onDelete: 'cascade' }),
    title: text("title").notNull(),
    status: text("status").default("open"),
    created_at: timestamp("created_at", { mode: "date" }).defaultNow()
})

export const workspaceMembers = pgTable("workspace_members", {
    id: text("id").primaryKey(),
    workspace_id: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade"}),
    user_id: text("user_id").notNull(),
    role: text("role", { enum: ["owner", "member"]}).notNull().default("member"),
    created_at: timestamp("created_at", { mode: "date" }).defaultNow(),
}, (t) => [
    unique("uq_ws_member").on(t.workspace_id, t.user_id),
    index("ix_ws_member_user").on(t.user_id),
])

export const paymentPlans = pgTable("payment_plans", {
    id: text("id").primaryKey(),
    workspace_id: text("workspace_id").references(() => workspaces.id, { onDelete: 'cascade'}),
    state: text("state", { enum: ["trial", "active", "past_due", "canceled"]}).default("trial"),
    razorpay_order_id: text("razorpay_order_id"),
    created_at: timestamp("created_at", { mode: "date" }).defaultNow()
})


let client: Sql | undefined;
let db: PostgresJsDatabase<any> | undefined;

export async function initDb() {
    // taskflow_app (NOT postgres): a non-owner role, so Postgres RLS binds it (cellar.sql).
    const url = process.env.DATABASE_URL || "postgres://taskflow_app:postgres@postgres:5432/taskflow";
    client = postgres(url)
    db = drizzle(client)
    console.log("TypeScript DB connected")
}

// The shared pool — the door grabs a DEDICATED connection from it per request, stamps it with
// the identity, and binds it via AsyncLocalStorage. The pool itself is never stamped (shared).
export function getClient() {
    if (!client) throw new Error("Database not initialized. Call initDb() first.")
    return client
}

// The door checks this before stamping: the DB-free contract tests (lighthouse, doorless,
// badge, validation) build the app WITHOUT initDb(), and the door must stay open for them —
// parity with the PY door, which never touches the DB (the stamp is deferred to get_session()).
// In a real deployment initDb() has run, so this is always true and the door stamps as designed.
export function isDbInitialized(): boolean {
    return client !== undefined;
}

// Build a drizzle instance bound to a dedicated (stamped) connection — one per request.
// reserve() hands out a bare Sql(handler) that has NO .options, but drizzle's construct()
// unconditionally reads client.options.parsers/serializers. Attach a CLONE of the pool's
// options so construct() runs; each reserve() is a fresh object, so drizzle's
// transparent-parser mutation can't leak into the shared pool. The reserved connection
// routes queries to the real pooled connection (its own options), so parsing is unaffected.
export function makeRequestDb(conn: any): PostgresJsDatabase<any> {
    if (!conn.options) {
        const o = getClient().options;
        conn.options = { ...o, parsers: { ...o.parsers }, serializers: { ...o.serializers } };
    }
    return drizzle(conn)
}

export function getDb(): PostgresJsDatabase<any> {
    if (!db) throw new Error("Database not initialized. Call initDb() first.")
    return requestDb.getStore() ?? db;
}