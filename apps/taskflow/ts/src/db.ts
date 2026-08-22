import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import postgres, { Sql } from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'

export const workspaces = pgTable("workspaces", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
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


let db: ReturnType<typeof drizzle> | undefined;

export async function initDb() {
    const url = process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/taskflow";
    const client = postgres(url)
    db = drizzle(client)
    console.log("TypeScript DB connected")
}

export function getDb() {
    if (!db) throw new Error("Database not initialized. Call initDb() first.")
    return db;
}