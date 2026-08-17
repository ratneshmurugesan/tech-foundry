from fastapi import FastAPI
from .repository import InMemoryRepository
from .types import Workspace, Project, Issue
from .ids import generate_id
from typing import List 

app = FastAPI(title="Taskflow API - Day 2 skeleton")

workspace_repo = InMemoryRepository[Workspace]()
project_repo = InMemoryRepository[Project]()
issue_repo = InMemoryRepository[Issue]()


@app.get("/workspaces")
async def get_workspaces() -> List[Workspace]:
    return await workspace_repo.findAll()

@app.get("/projects")
async def get_projects() -> List[Project]:
    return await project_repo.findAll()

@app.get("/issues")
async def get_issues() -> List[Issue]:
    return await issue_repo.findAll()

@app.on_event("startup")
async def startup() -> None:
    print(f"Taskflow API running on port 8000")