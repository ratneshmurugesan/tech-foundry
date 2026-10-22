import { and, eq } from "drizzle-orm";
import { getDb, issues, paymentPlans, projects, workspaceMembers, workspaces } from "./db";
import { Issue, Plan, Project, Workspace, WorkspaceMember } from "./types";
import generateId from "./ids";
import { transition } from "./razorpay";


class PostgresRepository {
    async findAllWorkspaces(): Promise<Array<Workspace>> {
        const db = getDb()
        const rows = await db.select().from(workspaces);

        return rows.map(r => ({
            id: r.id,
            name: r.name,
            plan_tier: r.plan_tier as string,
            created_at: r.created_at as Date
        }))
    }

    async findWorkspaceById(id: string): Promise<Workspace> {
        const db = getDb()
        const rows = await db.select().from(workspaces).where(eq(workspaces.id, (id)))
        const row = rows[0]

        return {
            id: row.id,
            name: row.name,
            plan_tier: row.plan_tier as string,
            created_at: row.created_at as Date
        }
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
            plan_tier: rows[0].plan_tier as string,
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

        return (row[0] as Workspace) ?? undefined
    }

    async deleteWorkspace(id: string): Promise<boolean> {
        const db = getDb()

        const rows = await db
            .delete(workspaces)
            .where(eq(workspaces.id, id))
            .returning();

        return rows.length > 0
    }

    async findWorkspaceIdFor(worspaceId: string, userId: string): Promise<Workspace>{
        const db = getDb()
        const rows = await db
            .select({
                id: workspaces.id,
                name: workspaces.name,
                plan_tier: workspaces.plan_tier,
                created_at: workspaces.created_at,
            })
            .from(workspaces)
            .innerJoin(
                workspaceMembers,
                eq(workspaceMembers.workspace_id, workspaces.id)
            )
            .where(
                and(
                    eq(workspaceMembers.user_id, userId),
                    eq(workspaces.id, worspaceId)
                )
            )
            .limit(1)

        return rows[0] as Workspace
    }

    async findWorkspacesFor(userId: string): Promise<Workspace[]>{
        const db = getDb()
        const rows = await db
            .select({
                id: workspaces.id,
                name: workspaces.name,
                plan_tier: workspaces.plan_tier,
                created_at: workspaces.created_at,
            })
            .from(workspaces)
            .innerJoin(
                workspaceMembers,
                eq(workspaceMembers.workspace_id, workspaces.id)
            )
            .where(eq(workspaceMembers.user_id, userId))
        return rows as Workspace[]
    }

    async findWorkspaceTier(workspaceId: string): Promise<string>{
        const db = getDb()
        const rows = await db
            .select({
                plan_tier: workspaces.plan_tier,
            })
            .from(workspaces)
            .where(
                eq(workspaces.id, workspaceId)
            )
        // A missing workspace reads as "free" — the default tier that leaves the day-10
        // ladder untouched (the plan->role link's input). Mirrors py `find_workspace_tier`.
        return rows[0]?.plan_tier ?? "free"
    }

    async mintPlan(workspaceId: string, razorpayOrderId: string): Promise<Plan> {
        const db = getDb()

        const rows = await db
        .insert(paymentPlans)
        .values({
            id: generateId(),
            workspace_id: workspaceId,
            razorpay_order_id: razorpayOrderId,
            state: "trial"
        })
        .returning()
        const row = rows[0]

        return {
            id: row.id,
            workspace_id: row.workspace_id,
            razorpay_order_id: row.razorpay_order_id,
            state: row.state ?? "trial",
            created_at: row.created_at as Date
        }
    }

    async findPlan(workspaceId: string): Promise<Plan | undefined>{
        const db = getDb()
        const rows = await db
        .select({
            id: paymentPlans.id,
            workspace_id: paymentPlans.workspace_id,
            state: paymentPlans.state,
            razorpay_order_id: paymentPlans.razorpay_order_id,
            created_at: paymentPlans.created_at
        })
        .from(paymentPlans)
        .where(eq(paymentPlans.workspace_id, workspaceId))
        .limit(1)
        const row = rows[0]
        if (!row) return undefined
        return {
            id: row.id,
            workspace_id: row.workspace_id,
            state: row.state ?? "trial",
            razorpay_order_id: row.razorpay_order_id,
            created_at: row.created_at as Date
        }
    }

    async findPlanByOrderId(razorpayOrderId: string): Promise<Plan | undefined> {
        // Find a plan by its Razorpay order id (the webhook's lookup key).
        const db = getDb()
        const rows = await db.select({
            id: paymentPlans.id,
            workspace_id: paymentPlans.workspace_id,
            state: paymentPlans.state,
            razorpay_order_id: paymentPlans.razorpay_order_id,
            created_at: paymentPlans.created_at
        })
        .from(paymentPlans)
        .where(eq(paymentPlans.razorpay_order_id, razorpayOrderId))
        .limit(1)
        const row = rows[0]
        if (!row) return undefined
        return {
            id: row.id,
            workspace_id: row.workspace_id,
            state: row.state ?? "trial",
            razorpay_order_id: row.razorpay_order_id,
            created_at: row.created_at as Date
        }
    }

    async applyPlanTransition(workspaceId: string, event: string): Promise<Plan | undefined> {
        // General plan state transition: find the plan, call transition(state, event),
        // update the plan row + sync the workspace tier. Idempotent: if the (state, event)
        // pair is not in the table, the plan is returned as-is (no DB write).
        const db = getDb()

        const rows = await db.select({
            id: paymentPlans.id,
            workspace_id: paymentPlans.workspace_id,
            state: paymentPlans.state,
            razorpay_order_id: paymentPlans.razorpay_order_id,
            created_at: paymentPlans.created_at
        })
        .from(paymentPlans)
        .where(eq(paymentPlans.workspace_id, workspaceId))
        .limit(1)

        const row = rows[0]
        if (!row) return undefined
        const plan: Plan = {
            id: row.id,
            workspace_id: row.workspace_id,
            state: row.state ?? "trial",
            razorpay_order_id: row.razorpay_order_id,
            created_at: row.created_at as Date
        }
        const newState = transition(plan.state, event)
        if (newState === null) {
            return plan
        }
        await db
            .update(paymentPlans)
            .set({ state: newState as Plan["state"] })
            .where(eq(paymentPlans.id, plan.id))
        if (newState === "active") {
            await db
                .update(workspaces)
                .set({ plan_tier: "starter" })
                .where(eq(workspaces.id, workspaceId))
        } else if (newState === "canceled") {
            await db
                .update(workspaces)
                .set({ plan_tier: "free" })
                .where(eq(workspaces.id, workspaceId))
        }
        plan.state = newState as Plan["state"]
        return plan
    }

    async activatePlan(workspaceId: string): Promise<Plan | undefined> {
        // The day-15 convenience: trial -> active (the `paid` event). Delegates to the
        // general applyPlanTransition. Mirrors py `activate_plan`.
        return this.applyPlanTransition(workspaceId, "paid")
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

    // "mine" scope (day-11 parity): projects in workspaces the caller belongs to.
    // Doorless (sub undefined): the membership join can never match — serve all projects, like the pre-Day-10 read.
    async findProjectsFor(sub?: string): Promise<Array<Project>> {
        if (sub === undefined) {
            return this.findAllProjects()
        }
        const db = getDb()
        const rows = await db
            .select({
                id: projects.id,
                workspace_id: projects.workspace_id,
                name: projects.name,
                created_at: projects.created_at
            })
            .from(projects)
            .innerJoin(
                workspaceMembers,
                eq(workspaceMembers.workspace_id, projects.workspace_id)
            )
            .where(eq(workspaceMembers.user_id, sub))
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

    // "mine" scope (day-11 parity): issues in projects in workspaces the caller belongs to.
    // Doorless (sub undefined): the membership join can never match — serve all issues, like the pre-Day-10 read.
    async findIssuesFor(sub?: string): Promise<Array<Issue>> {
        if (sub === undefined) {
            return this.findAllIssues()
        }
        const db = getDb()
        const rows = await db
            .select({
                id: issues.id,
                project_id: issues.project_id,
                title: issues.title,
                status: issues.status,
                created_at: issues.created_at
            })
            .from(issues)
            .innerJoin(
                projects,
                eq(projects.id, issues.project_id)
            )
            .innerJoin(
                workspaceMembers,
                eq(workspaceMembers.workspace_id, projects.workspace_id)
            )
            .where(eq(workspaceMembers.user_id, sub))
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
            created_at: rows[0].created_at as Date
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
                created_at: rows[0].created_at as Date
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



    async findMembership(workspaceId: string, sub: string): Promise<WorkspaceMember | undefined> {
        const db = getDb()
        const membershipRows = await db
            .select()
            .from(workspaceMembers)
            .where(
                and(
                    eq(workspaces.id, (workspaceId)),
                    eq(workspaceMembers.user_id, (sub)))
            )
        return membershipRows.length
            ? membershipRows[0] as WorkspaceMember
            : undefined
    }

    async inviteMember(workspaceId: string, sub: string) {
        const db = getDb()
        const id = generateId()

        const rows = await db
            .insert(workspaceMembers)
            .values({ id, workspace_id: workspaceId, role: "member", user_id: sub })
            .returning();

        return rows[0]
    }
}

// export default InMemoryRepository;
export default PostgresRepository