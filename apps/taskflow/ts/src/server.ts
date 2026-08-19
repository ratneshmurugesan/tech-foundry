import { fastify } from 'fastify'
import PostgresRepository from './repository'

const repo = new PostgresRepository()

const app = fastify()

app.get("/workspaces", async () => {
    return await repo.findAllWorkspaces()
})

app.get("/projects", async () => {
    return await repo.findAllProjects()
})

app.get("/issues", async () => {
    return await repo.findAllIssues()
})

export async function startServer(port: number) {
    await app.listen({ port })
    console.log("http://localhost:" + port)
}