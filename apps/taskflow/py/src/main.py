from .repository import InMemoryRepository
from .types import Workspace, Project, Issue
from datetime import datetime
from .ids import generate_id
import asyncio

async def main() -> None:
    workspace_repo = InMemoryRepository[Workspace]()
    project_repo = InMemoryRepository[Project]()
    issue_repo = InMemoryRepository[Issue]()

    ws = Workspace(id=generate_id(), name="My First Workspace", created_at=datetime.now())
    await workspace_repo.save(ws)
    print(f"Created workspace: {ws.name}")

    project = Project(id=generate_id(), name="Sprint Board", workspace_id=ws.id, created_at=datetime.now())
    await project_repo.save(project)
    print(f"Created project: {project.name}")

    issue = Issue(id=generate_id(), title="Build Day 1", project_id=project.id, status="open", created_at=datetime.now())
    await issue_repo.save(issue)
    print(f"Created issue: {issue.title}")

    all_ws = await workspace_repo.findAll()
    print(f"All workspaces: {len(all_ws)}")
    for w in all_ws:
        print(w.name)

    found = await workspace_repo.findById(ws.id)
    print(f"Found by ID: {found.name}")

    print("Day 1 Python track: COMPLETE")

if __name__ == "__main__":
    asyncio.run(main())