import generateId from "./ids";
import InMemoryRepository from "./repository";

async function main() {
    const workspaceRepo = new InMemoryRepository<Workspace>();
    const projectRepo = new InMemoryRepository<Project>();
    const issueRepo = new InMemoryRepository<Issue>();

    const ws = {
        id: generateId(),
        name: "My First Workspace",
        created_at: new Date()
    };

    await workspaceRepo.save(ws);
    console.log("Created workspace: " + ws.name);

    const proj = {
        id: generateId(),
        workspace_id: ws.id,
        name: "Sprint Board",
        created_at: new Date()
    };

    await projectRepo.save(proj);
    console.log("Created project: " + proj.name);

    const issue = {
        id: generateId(),
        project_id: proj.id,
        title: "Build Day 1",
        status: "open" as const,
        created_at: new Date()
    };

    await issueRepo.save(issue);
    console.log("Created issue: " + issue.title);

    const allWorkspaces = await workspaceRepo.findAll();
    console.log("All workspaces: " + allWorkspaces.length);
    for (const w of allWorkspaces) {
        console.log(w.name);
    }

    const found = await workspaceRepo.findById(ws.id);
    console.log("Found by ID: " + found!.name);


    if (issue.status === "open") {
        console.log("Issue is open — TS knows status is 'open' here");
    }

    console.log("Day 1 TypeScript track: COMPLETE");
}

main()