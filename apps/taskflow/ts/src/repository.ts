import { eq } from "drizzle-orm";
import { getDb, issues, projects, workspaces } from "./db";
import { Issue, Project, Workspace } from "./types";
import generateId from "./ids";


class PostgresRepository {

    async findAllWorkspaces(): Promise<Array<Workspace>> {
        const db = getDb()
        const rows = await db.select().from(workspaces);

        return rows.map(r => ({
            id: r.id,
            name: r.name,
            created_at: r.created_at as Date
        }))
    }

    async findWorkspaceById(id: string): Promise<Workspace | undefined> {
        const db = getDb()
        const rows = await db.select().from(workspaces).where(eq(workspaces.id, (id)))
        const row = rows[0]

        return row ? {
            id: row.id,
            name: row.name,
            created_at: row.created_at as Date
        } : undefined
    }

    async saveWorkspace(name: string): Promise<Workspace> {
        const db = getDb()
        const id = generateId()

        const rows = await db
            .insert(workspaces)
            .values({ id, name })
            .returning();

        return {
            id: rows[0].id,
            name: rows[0].name,
            created_at: rows[0].created_at as Date
        }
    }

    async updateWorkspace(id: string, changes: Partial<Workspace>): Promise<Workspace | undefined> {
        const db = getDb()

        const row = await db
            .update(workspaces)
            .set(changes)
            .where(eq(workspaces.id, id))
            .returning();

        return row[0] ?? undefined
    }


    async deleteWorkspace(id: string): Promise<boolean> {
        const db = getDb()

        const rows = await db
            .delete(workspaces)
            .where(eq(workspaces.id, id))
            .returning();

        return rows.length > 0
    }

    /* --- Projects --- */

    async findAllProjects(): Promise<Array<Project>> {
        const db = getDb()
        const rows = await db.select().from(projects);
        return rows.map(r => ({
            id: r.id,
            workspace_id: r.workspace_id as string,
            name: r.name,
            created_at: r.created_at as Date
        }))
    }

    async findProjectById(id: string): Promise<Project | undefined> {
        const db = getDb()
        const rows = await db.select().from(projects).where(eq(projects.id, (id)))
        const row = rows[0]

        return row ? {
            id: row.id,
            workspace_id: row.workspace_id as string,
            name: row.name,
            created_at: row.created_at as Date
        } : undefined
    }

    async saveProject(workspace_id: string, name: string): Promise<Project> {
        const db = getDb()
        const id = generateId()

        const rows = await db
            .insert(projects)
            .values({ id, workspace_id, name })
            .returning();

        return {
            id: rows[0].id,
            workspace_id: rows[0].workspace_id as string,
            name: rows[0].name,
            created_at: rows[0].created_at as Date
        }
    }

    async updateProject(id: string, changes: Partial<Project>): Promise<Project | undefined> {
        const db = getDb()

        const rows = await db
            .update(projects)
            .set(changes)
            .where(eq(projects.id, id))
            .returning();

        return !!rows.length ? {
            id: rows[0].id,
            workspace_id: rows[0].workspace_id as string,
            name: rows[0].name,
            created_at: rows[0].created_at as Date
        } : undefined
    }

    async deleteProject(id: string): Promise<boolean> {
        const db = getDb()
        const rows = await db
            .delete(projects)
            .where(eq(projects.id, id))
            .returning();

        return rows.length > 0
    }

    /* --- Issues --- */

    async findAllIssues(): Promise<Array<Issue>> {
        const db = getDb()
        const rows = await db.select().from(issues);
        return rows.map(r => ({
            id: r.id,
            project_id: r.project_id as string,
            title: r.title,
            status: r.status as "open" | "closed",
            created_at: r.created_at as Date
        }))
    }

    async findIssueById(id: string): Promise<Issue | undefined> {
        const db = getDb()
        const rows = await db.select().from(issues).where(eq(issues.id, (id)))
        const row = rows[0]

        return row ? {
            id: row.id,
            project_id: row.project_id as string,
            title: row.title,
            status: row.status as "open" | "closed",
            created_at: row.created_at as Date
        } : undefined
    }

    async saveIssue(project_id: string, title: string, status?: "open" | "closed"): Promise<Issue> {
        const db = getDb()
        const id = generateId()

        const rows = await db
            .insert(issues)
            .values({ id, project_id, title, status })
            .returning();

        return {
            id: rows[0].id,
            project_id: rows[0].project_id as string,
            title: rows[0].title,
            status: rows[0].status as "open" | "closed",
            created_at: rows[0].created_at
        }
    }

    async updateIssue(id: string, changes: Partial<Issue>): Promise<Issue | undefined> {
        const db = getDb()

        const rows = await db
            .update(issues)
            .set(changes)
            .where(eq(issues.id, id))
            .returning();

        return !!rows.length ?
            {
                id: rows[0].id,
                project_id: rows[0].project_id as string,
                title: rows[0].title,
                status: rows[0].status as "open" | "closed",
                created_at: rows[0].created_at
            } : undefined
    }

    async deleteIssue(id: string): Promise<boolean> {
        const db = getDb()
        const rows = await db
            .delete(issues)
            .where(eq(issues.id, id))
            .returning();

        return rows.length > 0
    }

}

// export default InMemoryRepository;
export default PostgresRepository