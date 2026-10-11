import Fastify from 'fastify'
import PostgresRepository from './repository'
import z from 'zod'
import { serializerCompiler, validatorCompiler, type ZodTypeProvider } from 'fastify-type-provider-zod'
import { registerErrorHandler } from './errorHandler'
import { DatabaseCrashError, ForbiddenError, NotFoundError } from './errors'
import { doorHook } from './auth'
import { authorizeHook } from './authorize';

const repo = new PostgresRepository()

const fastify = Fastify({ logger: true })

// Assigning Zod compilers globally to Fastify
fastify.setValidatorCompiler(validatorCompiler)
fastify.setSerializerCompiler(serializerCompiler)

// Setting Zod as the default Type Provider
const app = fastify
    .addHook("onRequest", doorHook)
    .addHook("onRequest", authorizeHook)
    .withTypeProvider<ZodTypeProvider>()

// Registering custom semantic error handler
registerErrorHandler(app)

// --- Response schemas: the WIRE contract. The field SET + ORDER must match the PY kitchen
//     byte-for-byte (the parity wall, ADR-001). `created_at` / `plan_tier` were added here
//     2026-10-10 to close the known wire-level gap (build ledger §4 callout): these schemas
//     predate those columns, and setSerializerCompiler was silently stripping them — so the
//     two kitchens returned different JSON for every resource.
const workspaceSchema = z.object({
    id: z.uuid(),
    name: z.string().min(3),
    // `z.string()` on purpose — the PY kitchen's Workspace.plan_tier is a plain `str` (not a
    // Literal), so the parity-faithful TS is a plain string too. The plan state machine (11b)
    // is what constrains it to free/starter at runtime, in both kitchens.
    plan_tier: z.string(),
    created_at: z.date(),
})
// Request schemas pick ONLY the user-settable fields — `plan_tier` and `created_at` are
// system-managed (the plan state machine / the DB clock set them), never client-settable.
const createWorkspaceSchema = workspaceSchema.pick({ name: true })
const updateWorkspaceSchema = createWorkspaceSchema.partial()
const idParamSchema = z.object({ id: z.uuid() });

const projectSchema = z.object({
    id: z.uuid(),
    name: z.string().min(3),
    created_at: z.date(),
    workspace_id: z.uuid()
})
const createProjectSchema = projectSchema.pick({ name: true, workspace_id: true })
const updateProjectSchema = createProjectSchema.partial()

const issueSchema = z.object({
    id: z.uuid(),
    project_id: z.uuid(),
    title: z.string().min(3),
    status: z.enum(["open", "closed"]),
    created_at: z.date(),
})
const createIssueSchema = issueSchema.pick({ project_id: true, title: true }).extend({ status: z.enum(["open", "closed"]).optional().default("open") })
const updateIssueSchema = createIssueSchema.partial()

// `workspaceMemberSchema` deliberately has NO `created_at`: the PY kitchen's WorkspaceMember
// pydantic model omits it too, so both kitchens already agree on the wire (id, workspace_id,
// user_id, role). Adding it here would *break* parity, not fix it.
const workspaceMemberSchema = z.object({
    id: z.uuid(),
    workspace_id: z.uuid(),
    user_id: z.uuid(),
    role: z.enum(["owner", "member"]),
})
const createWorkspaceMemberSchema = workspaceMemberSchema.omit({ id: true })

app.get("/", {
    schema: {
        response: {
            200: z.object({ status: z.string(), service: z.string() }),
        }
    }
}, async (request, response) => {
    try {
        return response.code(200).send({
            status: 'ok',
            service: 'taskflow-ts'
        })
    } catch (dbError) {
        throw new DatabaseCrashError(dbError)
    }
})

app.get("/workspaces", {
    schema: {
        response: {
            200: z.array(workspaceSchema),
        }
    }
}, async (request, response) => {
    const sub = request.user?.sub
    try {
        const data = await repo.findWorkspacesFor(sub!)
        return response.code(200).send(data)
    } catch (dbError) {
        throw new DatabaseCrashError(dbError)
    }
})
app.post("/workspaces", {
    schema: {
        body: createWorkspaceSchema,
        response: {
            201: workspaceSchema,
        }
    }
},
    async (request, response) => {
        const { name } = request.body
        try {
            const newWorkspace = await repo.saveWorkspace(name)
            return response.code(201).send(newWorkspace)
        } catch (dbError) {
            throw new DatabaseCrashError(dbError)
        }
    })
app.get("/workspaces/:id", {
    schema: {
        params: idParamSchema,
        response: {
            200: workspaceSchema,
        },
    }
}, async (request, response) => {
    const { id } = request.params
    const sub = request.user?.sub

    let existingWorkspace;

    try {
        existingWorkspace = await repo.findWorkspaceIdFor(id, sub!)
    } catch (dbError) {
        // 500 Error: Hidden from user, fully logged internally
        throw new DatabaseCrashError(dbError);
    }

    // 404 Error: Safe semantic error
    if (!existingWorkspace) {
        throw new NotFoundError(`Workspace with ID ${id} does not exist`)
    }

    return response.code(200).send(existingWorkspace)
})
app.patch("/workspaces/:id", {
    schema: {
        body: updateWorkspaceSchema,
        params: idParamSchema,
        response: {
            200: workspaceSchema,
        },
    }
}, async (request, response) => {
    const { id } = request.params
    const changes = request.body

    const sub = request.user?.sub
    if(!sub){
        throw new ForbiddenError("Not a member of this workspace")
    }
    const existingWsm = await repo.findMembership(id, sub)
    if(existingWsm?.role !== "owner") {
        throw new ForbiddenError("Requires the owner role")
    }

    let existingWorkspace;
    try {
        existingWorkspace = await repo.findWorkspaceById(id)
    } catch (dbError) {
        // 500 Error: Hidden from user, fully logged internally
        throw new DatabaseCrashError(dbError);
    }
    // 404 Error: Safe semantic error
    if (!existingWorkspace) {
        throw new NotFoundError(`Workspace with ID ${id} does not exist`)
    }

    const updatedWorkspace = await repo.updateWorkspace(id, changes)
    return response.code(200).send(updatedWorkspace!)
})
app.delete("/workspaces/:id", {
    schema: {
        params: idParamSchema,
        response: {
            204: z.void(),
            404: z.object({ error: z.string() }),
            500: z.object({ error: z.string() })
        }
    }
}, async (request, response) => {
    const { id } = request.params

    const sub = request.user?.sub
    if(!sub){
        throw new ForbiddenError("Not a member of this workspace")
    }
    const existingWsm = await repo.findMembership(id, sub)
    if(existingWsm?.role !== "owner") {
        throw new ForbiddenError("Requires the owner role")
    }

    let isDeleted: boolean
    try {
        isDeleted = await repo.deleteWorkspace(id)
    } catch (dbError) {
        throw new DatabaseCrashError(dbError)
    }
    if (!isDeleted) {
        throw new NotFoundError(`Workspace with ID ${id} does not exist`)
    }
    return response.code(204).send()
})
app.get("/workspaces/:id/members", {
    schema: {
        params: idParamSchema,
        response: {
            200: workspaceMemberSchema,
        },
    }
},async (request, response) => {
    const { id } = request.params
    const sub = request.user?.sub

    let existingMembership;

    try {
        existingMembership = await repo.findMembership(id, sub!)
    } catch (dbError) {
        throw new DatabaseCrashError(dbError);
    }

    // 404 Error: Safe semantic error
    if (!existingMembership) {
        throw new NotFoundError(`WorkspaceMember with ID ${id} does not exist`)
    }

    return response.code(200).send(existingMembership)
})
app.post("/workspaces/:id/members", {
    schema: {
        body: createWorkspaceMemberSchema,
        response: {
            201: workspaceMemberSchema,
        }
    }
},
    async (request, response) => {
        const { workspace_id } = request.body
        const sub = request.user?.sub
        try {
            const newMemberData = await repo.inviteMember(workspace_id, sub!)
            return response.code(201).send(newMemberData)
        } catch (dbError) {
            throw new DatabaseCrashError(dbError)
        }
    })


app.get("/projects", {
    schema: {
        response: {
            200: z.array(projectSchema),
            500: z.object({
                error: z.string()
            })
        }
    }
}, async (request, response) => {
    const sub = request.user?.sub
    try {
        const data = await repo.findProjectsFor(sub)
        return response.code(200).send(data)
    } catch (dbError) {
        throw new DatabaseCrashError(dbError)
    }
})
app.post("/projects", {
    schema: {
        body: createProjectSchema,
        response: {
            201: projectSchema,
            404: z.object({
                error: z.string()
            }),
            500: z.object({
                error: z.string()
            })
        }
    }
}, async (request, response) => {
    const { workspace_id, name } = request.body

    // Parent reference must exist — a missing workspace is a 404, not an FK blow-up
    let existingWorkspace;
    try {
        existingWorkspace = await repo.findWorkspaceById(workspace_id)
    } catch (dbError) {
        throw new DatabaseCrashError(dbError)
    }
    if (!existingWorkspace) {
        throw new NotFoundError(`Workspace with ID ${workspace_id} does not exist`)
    }

    let data;
    try {
        data = await repo.saveProject(workspace_id, name)
    } catch (dbError) {
        throw new DatabaseCrashError(dbError)
    }
    return response.code(201).send(data)
})
app.get("/projects/:id", {
    schema: {
        params: idParamSchema,
        response: {
            200: projectSchema,
            404: z.object({
                error: z.string()
            })
        }
    }
}, async (request, response) => {
    const { id } = request.params

    let existingProject;

    try {
        existingProject = await repo.findProjectById(id)
    } catch (dbError) {
        // 500 Error: Hidden from user, fully logged internally
        throw new DatabaseCrashError(dbError);
    }

    // 404 Error: Safe semantic error
    if (!existingProject) {
        throw new NotFoundError(`Project with ID ${id} does not exist`)
    }

    return response.code(200).send(existingProject)
})
app.patch("/projects/:id", {
    schema: {
        body: updateProjectSchema,
        params: idParamSchema,
        response: {
            200: projectSchema,
            404: z.object({
                error: z.string()
            })
        }
    }
}, async (request, response) => {
    const { id } = request.params
    const changes = request.body

    const sub = request.user?.sub
    if(!sub){
        throw new ForbiddenError("Not a member of this workspace")
    }
    const existingWsm = await repo.findMembership(id, sub)
    if(existingWsm?.role !== "owner") {
        throw new ForbiddenError("Requires the owner role")
    }

    // Only validate the destination workspace if the request is actually moving the project
    if (changes.workspace_id) {
        let existingWorkspace;
        try {
            existingWorkspace = await repo.findWorkspaceById(changes.workspace_id)
        } catch (dbError) {
            // 500 Error: Hidden from user, fully logged internally
            throw new DatabaseCrashError(dbError);
        }
        // 404 Error: Safe semantic error
        if (!existingWorkspace) {
            throw new NotFoundError(`Workspace with ID ${changes.workspace_id} does not exist`)
        }
    }

    let existingProject;
    try {
        existingProject = await repo.findProjectById(id)
    } catch (dbError) {
        // 500 Error: Hidden from user, fully logged internally
        throw new DatabaseCrashError(dbError);
    }
    // 404 Error: Safe semantic error
    if (!existingProject) {
        throw new NotFoundError(`Project with ID ${id} does not exist`)
    }

    const updatedProject = await repo.updateProject(id, changes)
    return response.code(200).send(updatedProject!)
})
app.delete("/projects/:id", {
    schema: {
        params: idParamSchema,
        response: {
            204: z.void(),
            404: z.object({ error: z.string() }),
            500: z.object({ error: z.string() })
        }
    }
}, async (request, response) => {
    const { id } = request.params

    const sub = request.user?.sub
    if(!sub){
        throw new ForbiddenError("Not a member of this workspace")
    }
    const existingWsm = await repo.findMembership(id, sub)
    if(existingWsm?.role !== "owner") {
        throw new ForbiddenError("Requires the owner role")
    }

    let existingProject;
    try {
        existingProject = await repo.findProjectById(id)
    } catch (dbError) {
        // 500 Error: Hidden from user, fully logged internally
        throw new DatabaseCrashError(dbError);
    }
    // 404 Error: Safe semantic error
    if (!existingProject) {
        throw new NotFoundError(`Project with ID ${id} does not exist`)
    }

    try {
        await repo.deleteProject(id)
    } catch (dbError) {
        throw new DatabaseCrashError(dbError)
    }

    return response.code(204).send()
})



app.get("/issues", {
    schema: {
        response: {
            200: z.array(issueSchema),
            500: z.object({
                error: z.string()
            })
        }
    }
}, async (request, response) => {
    const sub = request.user?.sub
    try {
        const data = await repo.findIssuesFor(sub)
        return response.code(200).send(data)
    } catch (dbError) {
        throw new DatabaseCrashError(dbError)
    }
})
app.post("/issues", {
    schema: {
        body: createIssueSchema,
        response: {
            201: issueSchema,
            404: z.object({
                error: z.string()
            }),
            500: z.object({
                error: z.string()
            })
        }
    }
}, async (request, response) => {
    const { project_id, status, title } = request.body

    // Parent reference must exist — a missing project is a 404, not an FK blow-up
    let existingProject;
    try {
        existingProject = await repo.findProjectById(project_id)
    } catch (dbError) {
        throw new DatabaseCrashError(dbError)
    }
    if (!existingProject) {
        throw new NotFoundError(`Project with ID ${project_id} does not exist`)
    }

    let data;
    try {
        data = await repo.saveIssue(project_id, title, status)
    } catch (dbError) {
        throw new DatabaseCrashError(dbError)
    }
    return response.code(201).send(data)
})
app.get("/issues/:id", {
    schema: {
        params: idParamSchema,
        response: {
            200: issueSchema,
            404: z.object({
                error: z.string()
            })
        }
    }
}, async (request, response) => {
    const { id } = request.params

    let existingIssue;
    try {
        existingIssue = await repo.findIssueById(id)
    } catch (dbError) {
        // 500 Error: Hidden from user, fully logged internally
        throw new DatabaseCrashError(dbError);
    }
    // 404 Error: Safe semantic error
    if (!existingIssue) {
        throw new NotFoundError(`Issue with ID ${id} does not exist`)
    }
    return response.code(200).send(existingIssue)
})
app.patch("/issues/:id", {
    schema: {
        body: updateIssueSchema,
        params: idParamSchema,
        response: {
            200: issueSchema,
            404: z.object({
                error: z.string()
            })
        }
    }
}, async (request, response) => {
    const { id } = request.params
    const changes = request.body

    const sub = request.user?.sub
    if(!sub){
        throw new ForbiddenError("Not a member of this workspace")
    }
    const existingWsm = await repo.findMembership(id, sub)
    if(existingWsm?.role !== "owner") {
        throw new ForbiddenError("Requires the owner role")
    }

    let existingIssue;
    try {
        existingIssue = await repo.findIssueById(id)
    } catch (dbError) {
        // 500 Error: Hidden from user, fully logged internally
        throw new DatabaseCrashError(dbError);
    }
    // 404 Error: Safe semantic error
    if (!existingIssue) {
        throw new NotFoundError(`Issue with ID ${id} does not exist`)
    }
    const updatedIssue = await repo.updateIssue(id, changes)
    return response.code(200).send(updatedIssue!)
})
app.delete("/issues/:id", {
    schema: {
        params: idParamSchema,
        response: {
            204: z.void(),
            404: z.object({ error: z.string() }),
            500: z.object({ error: z.string() })
        }
    }
}, async (request, response) => {
    const { id } = request.params

    const sub = request.user?.sub
    if(!sub){
        throw new ForbiddenError("Not a member of this workspace")
    }
    const existingWsm = await repo.findMembership(id, sub)
    if(existingWsm?.role !== "owner") {
        throw new ForbiddenError("Requires the owner role")
    }

    let existingIssue;
    try {
        existingIssue = await repo.findIssueById(id)
    } catch (dbError) {
        // 500 Error: Hidden from user, fully logged internally
        throw new DatabaseCrashError(dbError);
    }
    // 404 Error: Safe semantic error
    if (!existingIssue) {
        throw new NotFoundError(`Issue with ID ${id} does not exist`)
    }

    try {
        await repo.deleteIssue(id)
    } catch (dbError) {
        throw new DatabaseCrashError(dbError)
    }

    return response.code(204).send()
})


export async function startServer(port: number) {
    await app.listen({ port, host: '0.0.0.0' })
    console.log("http://localhost:" + port)
}

export {
    app,
    // Response schemas — exported so the golden matrix (tests/types.test.ts) can assert the
    // serialized wire shape, not just the type definitions.
    workspaceSchema,
    projectSchema,
    issueSchema,
    workspaceMemberSchema,
    createWorkspaceSchema,
    createProjectSchema,
    createIssueSchema,
    idParamSchema
}