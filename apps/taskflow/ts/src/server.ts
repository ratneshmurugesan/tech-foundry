import { fastify } from 'fastify'

import InMemoryRepository from './repository'
import { Workspace, Project, Issue } from './types'

const workspaceRepo = new InMemoryRepository<Workspace>()
const projectRepo = new InMemoryRepository<Project>()
const issueRepo = new InMemoryRepository<Issue>()

const app = fastify()

app.get("/workspaces", async () => {
    return await workspaceRepo.findAll()
})

app.get("/projects", async () => {
    return await projectRepo.findAll()
})

app.get("/issues", async () => {
    return await issueRepo.findAll()
})

export async function startServer(port: number) {
    await app.listen({ port })
    console.log("http://localhost:" + port)
}

// try {
//     startServer(8000)
// } catch (err) {
//     console.error(err)
// }
