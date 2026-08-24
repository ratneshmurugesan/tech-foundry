import Fastify from 'fastify'
import PostgresRepository from './repository'
import z from 'zod'
import { serializerCompiler, validatorCompiler, type ZodTypeProvider } from 'fastify-type-provider-zod'
import { registerErrorHandler } from './errorHandler'
import { DatabaseCrashError, NotFoundError } from './errors'

const repo = new PostgresRepository()

const fastify = Fastify({ logger: true })

// Assigning Zod compilers globally to Fastify
fastify.setValidatorCompiler(validatorCompiler)
fastify.setSerializerCompiler(serializerCompiler)

// Setting Zod as the default Type Provider
const app = fastify.withTypeProvider<ZodTypeProvider>()

// Registering custom semantic error handler
registerErrorHandler(app)

const workspaceSchema = z.object({
    id: z.uuid(),
    name: z.string().min(3)
})
const CreateWorkspaceSchema = workspaceSchema.omit({ id: true })
const UpdateWorkspaceSchema = CreateWorkspaceSchema.partial()
const IdParamSchema = z.object({ id: z.uuid() });

const projectSchema = z.object({
    id: z.uuid(),
    name: z.string().min(3),
    workspace_id: z.uuid()
})
const CreateProjectSchema = projectSchema.omit({ id: true })
const UpdateProjectSchema = CreateProjectSchema.partial()

const issueSchema = z.object({
    id: z.uuid(),
    title: z.string().min(3),
    project_id: z.uuid(),
    status: z.enum(["open", "closed"]),
})
const CreateIssueSchema = issueSchema.omit({ id: true }).extend({ status: z.enum(["open", "closed"]).optional().default("open") })
const UpdateIssueSchema = CreateIssueSchema.partial()


app.get("/workspaces", {
    schema: {
        response: {
            200: z.array(workspaceSchema),
        }
    }
}, async (request, response) => {
    try {
        const data = await repo.findAllWorkspaces()
        return response.code(200).send(data)
    } catch (dbError) {
        throw new DatabaseCrashError(dbError)
    }
})
app.post("/workspaces", {
    schema: {
        body: CreateWorkspaceSchema,
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
        params: IdParamSchema,
        response: {
            200: workspaceSchema,
        },
    }
}, async (request, response) => {
    const { id } = request.params

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

    return response.code(200).send(existingWorkspace)
})
app.patch("/workspaces/:id", {
    schema: {
        body: UpdateWorkspaceSchema,
        params: IdParamSchema,
        response: {
            200: workspaceSchema,
        },
    }
}, async (request, response) => {
    const { id } = request.params
    const changes = request.body

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
        params: IdParamSchema,
        response: {
            204: z.void(),
            404: z.object({ error: z.string() }),
            500: z.object({ error: z.string() })
        }
    }
}, async (request, response) => {
    const { id } = request.params
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
    try {
        const data = await repo.findAllProjects()
        return response.code(200).send(data)
    } catch (dbError) {
        throw new DatabaseCrashError(dbError)
    }
})
app.post("/projects", {
    schema: {
        body: CreateProjectSchema,
        response: {
            201: projectSchema,
            500: z.object({
                error: z.string()
            })
        }
    }
}, async (request, response) => {
    const { workspace_id, name } = request.body
    try {
        const data = await repo.saveProject(workspace_id, name)
        return response.code(201).send(data)
    } catch (dbError) {
        throw new DatabaseCrashError(dbError)
    }
})
app.get("/projects/:id", {
    schema: {
        params: IdParamSchema,
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
        body: UpdateProjectSchema,
        params: IdParamSchema,
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

    let existingWorkspace;

    try {
        existingWorkspace = await repo.findWorkspaceById(changes.workspace_id!)
    } catch (dbError) {
        // 500 Error: Hidden from user, fully logged internally
        throw new DatabaseCrashError(dbError);
    }

    // 404 Error: Safe semantic error
    if (!existingWorkspace) {
        throw new NotFoundError(`Workspace with ID ${id} does not exist`)
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
        params: IdParamSchema,
        response: {
            204: z.void(),
            404: z.object({ error: z.string() }),
            500: z.object({ error: z.string() })
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
    try {
        const data = await repo.findAllIssues()
        return response.code(200).send(data)
    } catch (dbError) {
        throw new DatabaseCrashError(dbError)
    }
})
app.post("/issues", {
    schema: {
        body: CreateIssueSchema,
        response: {
            201: issueSchema,
            500: z.object({
                error: z.string()
            })
        }
    }
}, async (request, response) => {
    const { project_id, status, title } = request.body

    try {
        const data = await repo.saveIssue(project_id, title, status)
        return response.code(201).send(data)
    } catch (dbError) {
        throw new DatabaseCrashError(dbError)
    }
})
app.get("/issues/:id", {
    schema: {
        params: IdParamSchema,
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
        body: UpdateIssueSchema,
        params: IdParamSchema,
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
        params: IdParamSchema,
        response: {
            204: z.void(),
            404: z.object({ error: z.string() }),
            500: z.object({ error: z.string() })
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

    try {
        await repo.deleteIssue(id)
    } catch (dbError) {
        throw new DatabaseCrashError(dbError)
    }

    return response.code(204).send()
})


export async function startServer(port: number) {
    await app.listen({ port })
    console.log("http://localhost:" + port)
}